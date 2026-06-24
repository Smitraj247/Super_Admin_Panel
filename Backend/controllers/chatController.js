import Chat from "../models/Chat.js";
import User from "../models/User.models.js";
import { getIO } from "../utils/socketEmitter.js";
import { createNotificationHelper } from "./notificationController.js";

// Get or create a chat between two users
export const getOrCreateChat = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Validate that the other user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find existing chat between these two users
    let chat = await Chat.findOne({
      participants: { $all: [currentUserId, userId] },
      $expr: { $eq: [{ $size: "$participants" }, 2] },
    })
      .populate("participants", "name email role department")
      .populate("messages.sender", "name email");

    // If no chat exists, create one
    if (!chat) {
      chat = await Chat.create({
        participants: [currentUserId, userId],
        messages: [],
      });

      chat = await Chat.findById(chat._id)
        .populate("participants", "name email role department")
        .populate("messages.sender", "name email");
    }

    res.json({
      success: true,
      data: chat,
    });
  } catch (error) {
    console.error("Get or create chat error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get all chats for the current user
export const getUserChats = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const chats = await Chat.find({
      participants: currentUserId,
      isActive: true,
    })
      .populate("participants", "name email role department")
      .populate("messages.sender", "name email")
      .sort({ lastMessageAt: -1 });

    // Filter out any direct chats that don't have exactly 2 participants
    const filteredChats = chats.filter(chat => {
      if (chat.isGroupChat) return true;
      return chat.participants.length === 2;
    });

    res.json({
      success: true,
      data: filteredChats,
    });
  } catch (error) {
    console.error("Get user chats error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content } = req.body;
    const currentUserId = req.user._id;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Message content is required" });
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Verify user is a participant
    if (!chat.participants.includes(currentUserId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Add message
    const newMessage = {
      sender: currentUserId,
      content: content.trim(),
      readBy: [currentUserId],
    };

    chat.messages.push(newMessage);
    chat.lastMessage = content.trim();
    chat.lastMessageAt = new Date();

    await chat.save();

    // Populate the new message
    const updatedChat = await Chat.findById(chatId)
      .populate({
        path: "participants",
        select: "name email role department",
        populate: [
          { path: "role", select: "name" },
          { path: "department", select: "name" },
        ],
      })
      .populate("messages.sender", "name email");

    // Emit real-time event to all participants in the chat room
    const io = getIO();
    if (io) {
      io.to(chatId).emit("newMessage", updatedChat);

      // Also notify each participant's personal room (for chat list updates)
      updatedChat.participants.forEach((participant) => {
        io.to(participant._id.toString()).emit("chatUpdated", updatedChat);
      });
    }

    // Create notifications for all participants except the sender
    const sender = updatedChat.participants.find(
      (p) => p._id.toString() === currentUserId.toString(),
    );
    const otherParticipants = updatedChat.participants.filter(
      (p) => p._id.toString() !== currentUserId.toString(),
    );

    otherParticipants.forEach((participant) => {
      const chatTitle = chat.isGroupChat ? chat.groupName : sender?.name;

      // Determine the correct link path based on participant's department/role
      let baseLink = "/dashboard/employee/chats";
      const participantRole = participant.role
        ? typeof participant.role === "object"
          ? participant.role.name
          : participant.role
        : null;
      const participantDept = participant.department
        ? typeof participant.department === "object"
          ? participant.department.name
          : participant.department
        : null;

      if (participantRole === "SUPER_ADMIN") {
        baseLink = "/superadmin/chats";
      } else if (participantRole === "ADMIN" && participantDept) {
        if (participantDept === "HR") {
          baseLink = "/dashboard/hr/chats";
        } else if (participantDept === "SALES") {
          baseLink = "/dashboard/sales/chats";
        } else {
          baseLink = "/dashboard/employee/chats";
        }
      } else if (participantDept) {
        if (participantDept === "HR") {
          baseLink = "/dashboard/hr/chats";
        } else if (participantDept === "SALES") {
          baseLink = "/dashboard/sales/chats";
        } else {
          baseLink = "/dashboard/employee/chats";
        }
      }

      const link = `${baseLink}?chatId=${chatId}`;

      createNotificationHelper(
        participant._id.toString(),
        "info",
        `${sender?.name || "Someone"} sent a message`,
        `${sender?.name || "Someone"} sent a message in ${chatTitle}`,
        link,
      );
    });

    res.json({
      success: true,
      data: updatedChat,
      message: "Message sent successfully",
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Mark messages as read
export const markAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.user._id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Verify user is a participant
    if (!chat.participants.includes(currentUserId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Mark all messages as read by current user
    chat.messages.forEach((message) => {
      if (!message.readBy.includes(currentUserId)) {
        message.readBy.push(currentUserId);
      }
    });

    await chat.save();

    res.json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Delete a chat
export const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.user._id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Verify user is a participant
    if (!chat.participants.includes(currentUserId)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Soft delete - mark as inactive
    chat.isActive = false;
    await chat.save();

    res.json({
      success: true,
      message: "Chat deleted successfully",
    });
  } catch (error) {
    console.error("Delete chat error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Get unread message count
export const getUnreadCount = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const chats = await Chat.find({
      participants: currentUserId,
      isActive: true,
    });

    let unreadCount = 0;

    chats.forEach((chat) => {
      chat.messages.forEach((message) => {
        if (
          !message.readBy.includes(currentUserId) &&
          message.sender.toString() !== currentUserId.toString()
        ) {
          unreadCount++;
        }
      });
    });

    res.json({
      success: true,
      data: { unreadCount },
    });
  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Create a group chat
export const createGroupChat = async (req, res) => {
  try {
    const { groupName, participantIds } = req.body;
    const currentUserId = req.user._id;

    if (!groupName || !groupName.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }

    if (!participantIds || participantIds.length < 2) {
      return res
        .status(400)
        .json({ message: "At least 2 participants are required" });
    }

    // Validate all participants exist
    const participants = await User.find({ _id: { $in: participantIds } });
    if (participants.length !== participantIds.length) {
      return res.status(404).json({ message: "Some users not found" });
    }

    // Add current user to participants if not included
    const allParticipants = [...new Set([currentUserId, ...participantIds])];

    // Create group chat
    const groupChat = await Chat.create({
      participants: allParticipants,
      isGroupChat: true,
      groupName: groupName.trim(),
      groupAdmin: currentUserId,
      messages: [],
    });

    const populatedChat = await Chat.findById(groupChat._id)
      .populate("participants", "name email role department")
      .populate("groupAdmin", "name email")
      .populate("messages.sender", "name email");

    res.status(201).json({
      success: true,
      data: populatedChat,
      message: "Group chat created successfully",
    });
  } catch (error) {
    console.error("Create group chat error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Add participant to group chat
export const addParticipant = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId } = req.body;
    const currentUserId = req.user._id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (!chat.isGroupChat) {
      return res.status(400).json({ message: "Not a group chat" });
    }

    // Only group admin can add participants
    if (chat.groupAdmin.toString() !== currentUserId.toString()) {
      return res
        .status(403)
        .json({ message: "Only group admin can add participants" });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already a participant
    if (chat.participants.includes(userId)) {
      return res.status(400).json({ message: "User is already a participant" });
    }

    chat.participants.push(userId);
    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate("participants", "name email role department")
      .populate("groupAdmin", "name email")
      .populate("messages.sender", "name email");

    res.json({
      success: true,
      data: updatedChat,
      message: "Participant added successfully",
    });
  } catch (error) {
    console.error("Add participant error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Remove participant from group chat
export const removeParticipant = async (req, res) => {
  try {
    const { chatId, userId } = req.params;
    const currentUserId = req.user._id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (!chat.isGroupChat) {
      return res.status(400).json({ message: "Not a group chat" });
    }

    // Only group admin can remove participants
    if (chat.groupAdmin.toString() !== currentUserId.toString()) {
      return res
        .status(403)
        .json({ message: "Only group admin can remove participants" });
    }

    // Cannot remove group admin
    if (userId === chat.groupAdmin.toString()) {
      return res.status(400).json({ message: "Cannot remove group admin" });
    }

    chat.participants = chat.participants.filter(
      (p) => p.toString() !== userId,
    );
    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate("participants", "name email role department")
      .populate("groupAdmin", "name email")
      .populate("messages.sender", "name email");

    res.json({
      success: true,
      data: updatedChat,
      message: "Participant removed successfully",
    });
  } catch (error) {
    console.error("Remove participant error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Leave group chat
export const leaveGroupChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.user._id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (!chat.isGroupChat) {
      return res.status(400).json({ message: "Not a group chat" });
    }

    // Group admin cannot leave without transferring admin rights
    if (chat.groupAdmin.toString() === currentUserId.toString()) {
      return res.status(400).json({
        message: "Group admin must transfer admin rights before leaving",
      });
    }

    chat.participants = chat.participants.filter(
      (p) => p.toString() !== currentUserId.toString(),
    );
    await chat.save();

    res.json({
      success: true,
      message: "Left group chat successfully",
    });
  } catch (error) {
    console.error("Leave group chat error:", error);
    res.status(500).json({ message: error.message });
  }
};

// Update group name
export const updateGroupName = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { groupName } = req.body;
    const currentUserId = req.user._id;

    if (!groupName || !groupName.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    if (!chat.isGroupChat) {
      return res.status(400).json({ message: "Not a group chat" });
    }

    // Only group admin can update group name
    if (chat.groupAdmin.toString() !== currentUserId.toString()) {
      return res
        .status(403)
        .json({ message: "Only group admin can update group name" });
    }

    chat.groupName = groupName.trim();
    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate("participants", "name email role department")
      .populate("groupAdmin", "name email")
      .populate("messages.sender", "name email");

    res.json({
      success: true,
      data: updatedChat,
      message: "Group name updated successfully",
    });
  } catch (error) {
    console.error("Update group name error:", error);
    res.status(500).json({ message: error.message });
  }
};

// saturday and sunday off, monday to friday 9am to 6pm, 1 hour lunch break at 1pm, timezone is IST (UTC+5:30)
