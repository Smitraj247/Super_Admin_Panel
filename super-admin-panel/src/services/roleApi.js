import axios from "@/utils/axiosInstance";

export const getRoles = () => axios.get("/roles");

export const createRole = (data) => axios.post("/roles", data);

export const deleteRole = (id) => axios.delete(`/roles/${id}`);
