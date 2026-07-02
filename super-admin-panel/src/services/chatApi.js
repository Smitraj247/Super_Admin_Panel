import API from "@/lib/api";

export const getUserChatsApi = () => API.get("/chats");

export const getOrCreateChatApi = (userId) => API.get(`/chats/user/${userId}`);

export const sendMessageApi = (chatId, content) =>
  API.post(`/chats/${chatId}/message`, { content });

export const markAsReadApi = (chatId) => API.put(`/chats/${chatId}/read`);

export const deleteChatApi = (chatId) => API.delete(`/chats/${chatId}`);

export const getUnreadCountApi = () => API.get("/chats/unread-count");

export const createGroupChatApi = (groupName, participantIds) =>
  API.post("/chats/group", { groupName, participantIds });

export const updateGroupNameApi = (chatId, groupName) =>
  API.put(`/chats/group/${chatId}/name`, { groupName });

export const addParticipantApi = (chatId, userId) =>
  API.post(`/chats/group/${chatId}/participant`, { userId });

export const removeParticipantApi = (chatId, userId) =>
  API.delete(`/chats/group/${chatId}/participant/${userId}`);

export const leaveGroupChatApi = (chatId) =>
  API.post(`/chats/group/${chatId}/leave`);

export const getChatMessagesApi = (chatId) =>
  API.get(`/chats/${chatId}/messages`);
