import axiosInstance from "../utils/axiosInstance";


export const getDepartmentsApi = () => axiosInstance.get("/admin/departments");
export const createDepartmentApi = (data) =>
  axiosInstance.post("/admin/departments", data);
export const updateDepartmentApi = (id, data) =>
  axiosInstance.put(`/admin/departments/${id}`, data);
export const deleteDepartmentApi = (id) =>
  axiosInstance.delete(`/admin/departments/${id}`);

export const getRolesApi = () => axiosInstance.get("/admin/roles");
export const createRoleApi = (data) => axiosInstance.post("/admin/roles", data);
export const updateRoleApi = (id, data) =>
  axiosInstance.put(`/admin/roles/${id}`, data);
export const deleteRoleApi = (id) => axiosInstance.delete(`/admin/roles/${id}`);

// Admin Management APIs1x
export const getAdminsApi = () => axiosInstance.get("/admin/admins");
export const createAdminApi = (data) =>
  axiosInstance.post("/admin/admins", data);
export const updateAdminApi = (id, data) =>
  axiosInstance.put(`/admin/admins/${id}`, data);
export const deleteAdminApi = (id) =>
  axiosInstance.delete(`/admin/admins/${id}`);

export const getUsersApi = () => axiosInstance.get("/admin/users");
export const createUserApi = (data) => axiosInstance.post("/admin/users", data);
export const updateUserApi = (id, data) =>
  axiosInstance.put(`/admin/users/${id}`, data);
export const deleteUserApi = (id) => axiosInstance.delete(`/admin/users/${id}`);
