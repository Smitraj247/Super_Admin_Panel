// socketEmitter.js
let io;

export const SocketEvents = {
  USER_CREATED: "user:created",
  USER_DELETED: "user:deleted",
  USER_UPDATED: "user:updated",
  ATTENDANCE_UPDATED: "attendance:updated",
  LEAVE_UPDATED: "leave:updated",
  LEAVE_STATUS_CHANGED: "leave:statusChanged",
};

export const setSocketIO = (socketIO) => {
  io = socketIO;
};

export const getIO = () => {
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
