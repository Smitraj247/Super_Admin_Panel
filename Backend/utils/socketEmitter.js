// socketEmitter.js - Polling-compatible version
// Event names preserved for backward compatibility
// No actual socket emission occurs - polling handles real-time updates

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

  // Chat events — shared with the frontend so spellings never drift
  CHAT_NEW_MESSAGE: "newMessage",
  CHAT_UPDATED: "chatUpdated",

  // Notification events
  NOTIFICATION_CREATED: "notification:created",
  UNREAD_COUNT_UPDATED: "unread:count:updated",
};

/**
 * Vercel-compatible implementation
 * These functions are no-ops since polling replaces Socket.IO
 * Kept for backward compatibility with existing controller code
 */

export const setSocketIO = (socketIO) => {
  // No-op: Socket.IO not used in Vercel deployment
  console.log("[Polling Mode] Socket.IO disabled - using HTTP polling for real-time updates");
};

export const getIO = () => {
  // Returns null - controllers should handle gracefully
  return null;
};

export const emitEvent = (event, data, room) => {
  // No-op: Polling replaces socket emission
  // Data is available via REST API polling
};

export const emitToRoom = (room, event, data) => {
  // No-op: Polling replaces socket emission
  // Data is available via REST API polling
};
