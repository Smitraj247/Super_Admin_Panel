// socketEmitter.js - Real-time Socket.IO event emitter
import { getIO, emitToUser, emitToChat, emitToUsers } from "../config/socket.js";

export const SocketEvents = {
  // User events
  USER_CREATED: "user:created",
  USER_DELETED: "user:deleted",
  USER_UPDATED: "user:updated",
  PROFILE_UPDATED: "profile:updated",

  // Attendance / leave events
  ATTENDANCE_UPDATED: "attendance:updated",
  LEAVE_UPDATED: "leave:updated",
  LEAVE_CREATED: "leave:created",
  LEAVE_STATUS_CHANGED: "leave:statusChanged",

  // Chat events
  CHAT_NEW_MESSAGE: "chat:newMessage",
  CHAT_UPDATED: "chat:updated",
  CHAT_DELETED: "chat:deleted",
  CHAT_CREATED: "chat:created",

  // Notification events
  NOTIFICATION_CREATED: "notification:created",
  UNREAD_COUNT_UPDATED: "unread:count:updated",

  // Typing events
  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",

  // Read receipts
  MESSAGE_READ: "message:read",

  // Presence
  USER_PRESENCE: "user:presence",
};

/**
 * Emit event to specific user
 */
export const emitToUserSocket = (userId, event, data) => {
  try {
    emitToUser(userId, event, data);
  } catch (error) {
    console.error(`Socket emit error (user ${userId}):`, error.message);
  }
};

/**
 * Emit event to chat room
 */
export const emitToChatRoom = (chatId, event, data) => {
  try {
    emitToChat(chatId, event, data);
  } catch (error) {
    console.error(`Socket emit error (chat ${chatId}):`, error.message);
  }
};

/**
 * Emit event to multiple users
 */
export const emitToMultipleUsers = (userIds, event, data) => {
  try {
    emitToUsers(userIds, event, data);
  } catch (error) {
    console.error("Socket emit error (multiple users):", error.message);
  }
};

/**
 * Emit notification event to specific user
 */
export const emitNotification = (userId, notification) => {
  emitToUserSocket(userId, SocketEvents.NOTIFICATION_CREATED, notification);
};

/**
 * Emit chat message to all chat participants
 */
export const emitChatMessage = (chatId, message) => {
  emitToChatRoom(chatId, SocketEvents.CHAT_NEW_MESSAGE, message);
};

/**
 * Broadcast chat update to all participants
 */
export const emitChatUpdate = (chatId, chat) => {
  emitToChatRoom(chatId, SocketEvents.CHAT_UPDATED, chat);
};

// Legacy compatibility functions
export const setSocketIO = () => {
  console.log("✓ Socket.IO initialized via config/socket.js");
};

export const emitEvent = (event, data, room) => {
  try {
    const io = getIO();
    if (room) {
      io.to(room).emit(event, data);
    } else {
      io.emit(event, data);
    }
  } catch (error) {
    console.error("Socket emit error:", error.message);
  }
};

export const emitToRoom = (room, event, data) => {
  try {
    const io = getIO();
    io.to(room).emit(event, data);
  } catch (error) {
    console.error("Socket emit error:", error.message);
  }
};
