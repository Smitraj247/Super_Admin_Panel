/**
 * Single axios instance for the entire app.
 * All services should import from here (or from utils/axiosInstance which re-exports this).
 */
import axios from "axios";
import { API_BASE } from "@/utils/constants";

const API = axios.create({
  baseURL: API_BASE,
  // Reasonable timeout to avoid hanging requests
  timeout: 15_000,
});

API.interceptors.request.use((req) => {
  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem("token") ?? localStorage.getItem("token");
    if (token) req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Global response error handler — surfaces auth failures cleanly
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Token expired — clear storage so AuthContext picks it up on next render
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    return Promise.reject(err);
  },
);

export const createAbortController = () => new AbortController();

export default API;
