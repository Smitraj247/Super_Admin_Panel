import axios from "@/utils/axiosInstance";

export const getAuditLogs = () => axios.get("/audit");
