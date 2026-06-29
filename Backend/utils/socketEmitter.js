// socketEmitter.js
let io;

export const SocketEvents = {
  // User events
  USER_CREATED: "user:created",
  USER_DELETED: "user:deleted",
  USER_UPDATED: "user:updated",

  // Attendance / leave events
  ATTENDANCE_UPDATED: "attendance:updated",
  LEAVE_UPDATED: "leave:updated",
  LEAVE_STATUS_CHANGED: "leave:statusChanged",

  // Chat events — shared with the frontend so spellings never drift
  CHAT_NEW_MESSAGE: "newMessage",
  CHAT_UPDATED: "chatUpdated",

  // Notification events
  NOTIFICATION_CREATED: "notification:created",
};

export const setSocketIO = (socketIO) => {
  io = socketIO;
};

export const getIO = () => {
  if (!io) {
    console.warn("[socketEmitter] getIO() called before setSocketIO() — is the server fully initialized?");
  }
  return io;
};

export const emitEvent = (event, data) => {
  if (io) {
    io.emit(event, data);
  }
};

export const emitToRoom = (room, event, data) => {
  if (io) {
    io.to(room).emit(event, data);
  }
};
