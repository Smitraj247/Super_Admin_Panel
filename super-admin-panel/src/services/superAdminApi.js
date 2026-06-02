import axiosInstance from "@/utils/axiosInstance";

export const getStatsApi = () => axiosInstance.get("/superadmin/stats");

export const getDepartmentsApi = () =>
  axiosInstance.get("/superadmin/departments");
export const createDepartmentApi = (data) =>
  axiosInstance.post("/superadmin/departments", data);
export const updateDepartmentApi = (id, data) =>
  axiosInstance.put(`/superadmin/departments/${id}`, data);
export const deleteDepartmentApi = (id) =>
  axiosInstance.delete(`/superadmin/departments/${id}`);

export const getRolesApi = () => axiosInstance.get("/superadmin/roles");
export const createRoleApi = (data) =>
  axiosInstance.post("/superadmin/roles", data);
export const updateRoleApi = (id, data) =>
  axiosInstance.put(`/superadmin/roles/${id}`, data);
export const deleteRoleApi = (id) =>
  axiosInstance.delete(`/superadmin/roles/${id}`);

export const getAdminsApi = () => axiosInstance.get("/superadmin/admins");
export const createAdminApi = (data) =>
  axiosInstance.post("/superadmin/admins", data);
export const updateAdminApi = (id, data) =>
  axiosInstance.put(`/superadmin/admins/${id}`, data);
export const deleteAdminApi = (id) =>
  axiosInstance.delete(`/superadmin/admins/${id}`);

export const getUsersApi = () => axiosInstance.get("/superadmin/users");
export const createUserApi = (data) =>
  axiosInstance.post("/superadmin/users", data);
export const updateUserApi = (id, data) =>
  axiosInstance.put(`/superadmin/users/${id}`, data);
export const deleteUserApi = (id) =>
  axiosInstance.delete(`/superadmin/users/${id}`);
