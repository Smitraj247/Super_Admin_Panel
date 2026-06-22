import axiosInstance from "@/utils/axiosInstance";

export const getLeavesApi = () => axiosInstance.get("/leaves");

export const getUserLeavesApi = () => axiosInstance.get("/leaves/user/own");
export const getUserLeaveBalanceApi = () =>
  axiosInstance.get("/leaves/user/balance");

export const applyLeaveApi = (data) =>
  axiosInstance.post("/leaves/apply", data);
export const updateLeaveStatusApi = (id, status) =>
  axiosInstance.put(`/leaves/${id}`, { status });
export const deleteUserLeaveApi = (id) =>
  axiosInstance.delete(`/leaves/user/${id}`);
export const updateUserLeaveApi = (id, data) =>
  axiosInstance.put(`/leaves/user/${id}`, data);

// SuperAdmin specific endpoints
export const getSuperAdminLeavesApi = () =>
  axiosInstance.get("/superadmin/leaves");
export const updateSuperAdminLeaveStatusApi = (id, status) =>
  axiosInstance.put(`/superadmin/leaves/${id}`, { status });
export const getAllUsersWithLeavesApi = (year, month) => {
  let url = "/superadmin/leaves/users";
  const params = [];
  if (year) params.push(`year=${year}`);
  if (month) params.push(`month=${month}`);
  if (params.length > 0) url += `?${params.join("&")}`;
  return axiosInstance.get(url);
};
export const getUserLeaveHistoryApi = (userId, year, month) => {
  let url = `/superadmin/leaves/users/${userId}`;
  const params = [];
  if (year) params.push(`year=${year}`);
  if (month) params.push(`month=${month}`);
  if (params.length > 0) url += `?${params.join("&")}`;
  return axiosInstance.get(url);
};

export const getLeaveTypesApi = () => axiosInstance.get("/leaves/types");
export const canUserCheckInApi = () =>
  axiosInstance.get("/leaves/user/can-check-in");
