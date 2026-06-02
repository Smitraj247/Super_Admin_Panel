import axios from "@/utils/axiosInstance";

export const getDepartments = () => axios.get("/departments");

export const createDepartment = (data) => axios.post("/departments", data);

export const deleteDepartment = (id) => axios.delete(`/departments/${id}`);
