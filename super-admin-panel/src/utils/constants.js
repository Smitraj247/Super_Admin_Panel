// API configuration
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Socket events (must match backend)
export const SocketEvents = {
  // Chat events
  CHAT_NEW_MESSAGE: "chat:newMessage",
  CHAT_UPDATED: "chat:updated",
  CHAT_DELETED: "chat:deleted",
  CHAT_CREATED: "chat:created",

  // Typing events
  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",

  // Read receipts
  MESSAGE_READ: "message:read",

  // Presence
  USER_PRESENCE: "user:presence",

  // Notifications
  NOTIFICATION_CREATED: "notification:created",
  UNREAD_COUNT_UPDATED: "unread:count:updated",
};

export default {
  API_BASE,
  API_URL,
  SocketEvents,
};
