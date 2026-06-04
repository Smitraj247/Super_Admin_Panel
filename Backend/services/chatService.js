import Chat from "../models/Chat.js";
import User from "../models/User.models.js";

const populateChat = (query) =>
  query
    .populate("participants", "name email role department")
    .populate("groupAdmin", "name email")
    .populate("messages.sender", "name email");

const findChat = async (id) => {
  const chat = await Chat.findById(id);
  if (!chat) throw Object.assign(new Error("Chat not found"), { status: 404 });
  return chat;
};

const assertParticipant = (chat, userId) => {
  if (!chat.participants.includes(userId))
    throw Object.assign(new Error("Not authorized"), { status: 403 });
};

const assertGroupAdmin = (chat, userId) => {
  if (chat.groupAdmin.toString() !== userId.toString())
    throw Object.assign(new Error("Only group admin can perform this action"), { status: 403 });
};

// ─── Direct chat ──────────────────────────────────────────────────────────────

export const getOrCreate = async (currentUserId, otherUserId) => {
  if (!(await User.findById(otherUserId)))
    throw Object.assign(new Error("User not found"), { status: 404 });

  let chat = await Chat.findOne({
    participants: { $all: [currentUserId, otherUserId] },
    $expr: { $eq: [{ $size: "$participants" }, 2] },
  });

  if (!chat) chat = await Chat.create({ participants: [currentUserId, otherUserId], messages: [] });

  return populateChat(Chat.findById(chat._id));
};

export const listUserChats = (userId) =>
  populateChat(Chat.find({ participants: userId, isActive: true }).sort({ lastMessageAt: -1 }));

export const send = async (chatId, senderId, content) => {
  if (!content?.trim()) throw Object.assign(new Error("Message content is required"), { status: 400 });

  const chat = await findChat(chatId);
  assertParticipant(chat, senderId);

  chat.messages.push({ sender: senderId, content: content.trim(), readBy: [senderId] });
  chat.lastMessage = content.trim();
  chat.lastMessageAt = new Date();
  await chat.save();

  return populateChat(Chat.findById(chatId));
};

export const markRead = async (chatId, userId) => {
  const chat = await findChat(chatId);
  assertParticipant(chat, userId);
  chat.messages.forEach((m) => { if (!m.readBy.includes(userId)) m.readBy.push(userId); });
  await chat.save();
};

export const softDelete = async (chatId, userId) => {
  const chat = await findChat(chatId);
  assertParticipant(chat, userId);
  chat.isActive = false;
  await chat.save();
};

export const countUnread = async (userId) => {
  const chats = await Chat.find({ participants: userId, isActive: true });
  let count = 0;
  chats.forEach((c) =>
    c.messages.forEach((m) => {
      if (!m.readBy.includes(userId) && m.sender.toString() !== userId.toString()) count++;
    })
  );
  return count;
};

// ─── Group chat ───────────────────────────────────────────────────────────────

export const createGroup = async (groupName, participantIds, adminId) => {
  if (!groupName?.trim()) throw Object.assign(new Error("Group name is required"), { status: 400 });
  if (!participantIds || participantIds.length < 2)
    throw Object.assign(new Error("At least 2 participants are required"), { status: 400 });

  const found = await User.find({ _id: { $in: participantIds } });
  if (found.length !== participantIds.length)
    throw Object.assign(new Error("Some users not found"), { status: 404 });

  const allParticipants = [...new Set([adminId.toString(), ...participantIds.map(String)])];
  const group = await Chat.create({
    participants: allParticipants,
    isGroupChat: true,
    groupName: groupName.trim(),
    groupAdmin: adminId,
    messages: [],
  });

  return populateChat(Chat.findById(group._id));
};

export const addMember = async (chatId, userId, adminId) => {
  const chat = await findChat(chatId);
  if (!chat.isGroupChat) throw Object.assign(new Error("Not a group chat"), { status: 400 });
  assertGroupAdmin(chat, adminId);
  if (!(await User.findById(userId))) throw Object.assign(new Error("User not found"), { status: 404 });
  if (chat.participants.includes(userId)) throw Object.assign(new Error("User is already a participant"), { status: 400 });

  chat.participants.push(userId);
  await chat.save();
  return populateChat(Chat.findById(chatId));
};

export const removeMember = async (chatId, userId, adminId) => {
  const chat = await findChat(chatId);
  if (!chat.isGroupChat) throw Object.assign(new Error("Not a group chat"), { status: 400 });
  assertGroupAdmin(chat, adminId);
  if (userId === chat.groupAdmin.toString()) throw Object.assign(new Error("Cannot remove group admin"), { status: 400 });

  chat.participants = chat.participants.filter((p) => p.toString() !== userId);
  await chat.save();
  return populateChat(Chat.findById(chatId));
};

export const leaveGroup = async (chatId, userId) => {
  const chat = await findChat(chatId);
  if (!chat.isGroupChat) throw Object.assign(new Error("Not a group chat"), { status: 400 });
  if (chat.groupAdmin.toString() === userId.toString())
    throw Object.assign(new Error("Group admin must transfer admin rights before leaving"), { status: 400 });

  chat.participants = chat.participants.filter((p) => p.toString() !== userId.toString());
  await chat.save();
};

export const renameGroup = async (chatId, groupName, adminId) => {
  if (!groupName?.trim()) throw Object.assign(new Error("Group name is required"), { status: 400 });
  const chat = await findChat(chatId);
  if (!chat.isGroupChat) throw Object.assign(new Error("Not a group chat"), { status: 400 });
  assertGroupAdmin(chat, adminId);

  chat.groupName = groupName.trim();
  await chat.save();
  return populateChat(Chat.findById(chatId));
};
