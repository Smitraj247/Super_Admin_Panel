import { io } from "../server.js";

export const emitEvent = (eventName, data, room = null) => {
  if (room) {
    io.to(room).emit(eventName, data);
  } else {
    io.emit(eventName, data);
  }
};

// Event names for consistency
export const SocketEvents = {
  ATTENDANCE_UPDATED: "attendance:updated",
  LEAVE_UPDATED: "leave:updated",
  LEAVE_CREATED: "leave:created",
  LEAVE_STATUS_CHANGED: "leave:statusChanged",
  NOTIFICATION_CREATED: "notification:created",
  USER_UPDATED: "user:updated",
  USER_CREATED: "user:created",
  USER_DELETED: "user:deleted",
  ROLE_UPDATED: "role:updated",
  DEPARTMENT_UPDATED: "department:updated",
  HOLIDAY_UPDATED: "holiday:updated",
  NEW_MESSAGE: "newMessage",
  CHAT_UPDATED: "chatUpdated",
  MESSAGE_READ: "message:read",
  ANNOUNCEMENT: "announcement",
  PROFILE_UPDATED: "profile:updated",
  UNREAD_COUNT_UPDATED: "unread:count:updated",
};
