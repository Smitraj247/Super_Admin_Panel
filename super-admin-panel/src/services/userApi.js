import axios from "@/utils/axiosInstance";

export const getUsers = () => axios.get("/users/users");

export const getProfile = () => axios.get("/users/profile");

export const updateProfile = (data) => axios.put("/users/profile", data);

export const createUser = (data) => axios.post("/users", data);

export const deleteUser = (id) => axios.delete(`/users/${id}`);
