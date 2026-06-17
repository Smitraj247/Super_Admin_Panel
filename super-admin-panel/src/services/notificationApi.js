import API from "@/lib/api";

export const getNotificationsApi = (limit = 20, skip = 0) =>
  API.get(`/notifications?limit=${limit}&skip=${skip}`);

export const getUnreadCountApi = () => API.get("/notifications/unread-count");

export const markAsReadApi = (id) => API.put(`/notifications/${id}/read`);

export const markAllAsReadApi = () => API.put("/notifications/read-all");

export const deleteNotificationApi = (id) => API.delete(`/notifications/${id}`);

export const createNotificationApi = (data) => API.post("/notifications", data);

export const broadcastToDepartmentApi = (data) =>
  API.post("/notifications/broadcast", data);

export const broadcastToAllApi = (data) =>
  API.post("/notifications/broadcast-all", data);
