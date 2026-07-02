import express from "express";
import {
  getOrCreateChat,
  getUserChats,
  sendMessage,
  markAsRead,
  deleteChat,
  getUnreadCount,
  createGroupChat,
  addParticipant,
  removeParticipant,
  leaveGroupChat,
  updateGroupName,
  getChatMessages,
} from "../controllers/chatController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Get all chats for current user
router.get("/", getUserChats);

// Get unread message count
router.get("/unread-count", getUnreadCount);

// Get or create chat with a specific user
router.get("/user/:userId", getOrCreateChat);

// Create group chat
router.post("/group", createGroupChat);

// Update group name
router.put("/group/:chatId/name", updateGroupName);

// Add participant to group
router.post("/group/:chatId/participant", addParticipant);

// Remove participant from group
router.delete("/group/:chatId/participant/:userId", removeParticipant);

// Leave group chat
router.post("/group/:chatId/leave", leaveGroupChat);

// Send a message in a chat
router.post("/:chatId/message", sendMessage);

// Get messages for a chat (used as polling fallback in production)
router.get("/:chatId/messages", getChatMessages);

// Mark messages as read
router.put("/:chatId/read", markAsRead);

// Delete a chat
router.delete("/:chatId", deleteChat);

export default router;
