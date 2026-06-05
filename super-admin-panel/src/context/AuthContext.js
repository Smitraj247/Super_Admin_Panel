"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { getProfile } from "@/services/userApi";

const AuthContext = createContext();

// Storage helpers

const storage = {
  getItem: (key) => sessionStorage.getItem(key) ?? localStorage.getItem(key),
  setItem: (key, value) => {
    sessionStorage.setItem(key, value);
    localStorage.setItem(key, value);
  },
  removeItem: (key) => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  },
};

// Provider 

export const AuthProvider = ({ children }) => {
  // Always start with null/loading=true so server and client initial render match
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const backgroundRefreshDone = useRef(false);

  // Background profile refresh — keeps data fresh without blocking UI
  const fetchProfile = useCallback(async () => {
    try {
      const res = await getProfile();
      const fresh =
        res.data?.success && res.data?.data ? res.data.data : res.data;
      if (fresh) {
        setUser(fresh);
        storage.setItem("user", JSON.stringify(fresh));
      }
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        storage.removeItem("token");
        storage.removeItem("user");
        setToken(null);
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    // Read storage only on the client after mount — avoids SSR/client mismatch
    try {
      const storedToken = storage.getItem("token");
      const raw = storage.getItem("user");
      const storedUser = raw ? JSON.parse(raw) : null;
      setToken(storedToken);
      setUser(storedUser);

      if (storedToken && !backgroundRefreshDone.current) {
        backgroundRefreshDone.current = true;
        fetchProfile();
      }
    } catch {
      // ignore parse errors
    } finally {
      setLoading(false);
    }

    // Cross-tab sync via localStorage events
    const handleStorage = (e) => {
      if (e.key !== "token" && e.key !== "user") return;
      // Skip if this tab has its own session data
      if (sessionStorage.getItem("token")) return;
      const newToken = localStorage.getItem("token");
      const newUser = localStorage.getItem("user");
      if (!newToken || !newUser) {
        setToken(null);
        setUser(null);
        return;
      }
      try {
        setToken(newToken);
        setUser(JSON.parse(newUser));
      } catch {}
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [fetchProfile]);

  const login = useCallback((data) => {
    storage.setItem("token", data.token);
    storage.setItem("user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    storage.removeItem("token");
    storage.removeItem("user");
    setToken(null);
    setUser(null);
  }, []);

  const getDepartment = useCallback(() => {
    if (!user?.department) return null;
    return typeof user.department === "object"
      ? user.department.name
      : user.department;
  }, [user]);

  const getRole = useCallback(() => {
    if (!user?.role) return null;
    return typeof user.role === "object" ? user.role.name : user.role;
  }, [user]);

  const isAuthenticated = useCallback(() => !!token && !!user, [token, user]);

  const value = useMemo(
    () => ({ user, token, loading, login, logout, isAuthenticated, getDepartment, getRole }),
    [user, token, loading, login, logout, isAuthenticated, getDepartment, getRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

