"use client";

/**
 * Centralized dashboard data hook.
 * Fetches all super-admin dashboard data with caching and deduplication.
 * Multiple components can call this hook — only one network request fires per TTL window.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { cachedFetch } from "@/lib/cache";
import {
  getStatsApi,
  getDepartmentsApi,
  getUsersApi,
  getAdminsApi,
} from "@/services/superAdminApi";
import { getAllUsersAttendanceApi } from "@/services/attandanceApi";
import { getSuperAdminLeavesApi } from "@/services/leaveApi";
import { getHolidaysApi } from "@/services/holidayApi";
import { useRealtime } from "./useRealtime";

const todayStr = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date(),
  );

const monthRange = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parseInt(parts.find((p) => p.type === "year").value);
  const month = parseInt(parts.find((p) => p.type === "month").value);
  const lastDay = new Date(year, month, 0).getDate();
  return {
    first: `${year}-${String(month).padStart(2, "0")}-01`,
    last: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
};

export function useSuperAdminDashboardData(refreshInterval = 30_000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const today = todayStr();
      const { first, last } = monthRange();

      const [
        statsRes,
        deptsRes,
        usersRes,
        adminsRes,
        todayAtt,
        monthAtt,
        leavesRes,
        holidaysRes,
      ] = await Promise.all([
        cachedFetch("sa:stats", () => getStatsApi(), 0),
        cachedFetch("sa:departments", () => getDepartmentsApi(), 0),
        cachedFetch("sa:users", () => getUsersApi(), 0),
        cachedFetch("sa:admins", () => getAdminsApi(), 0),
        cachedFetch(
          `sa:att:today:${today}`,
          () => getAllUsersAttendanceApi(today, today),
          0,
        ),
        cachedFetch(
          `sa:att:month:${first}`,
          () => getAllUsersAttendanceApi(first, last),
          0,
        ),
        cachedFetch("sa:leaves", () => getSuperAdminLeavesApi(), 0),
        cachedFetch("sa:holidays", () => getHolidaysApi(), 0),
      ]);

      setData({
        statsRes,
        deptsRes,
        usersRes,
        adminsRes,
        todayAtt,
        monthAtt,
        leavesRes,
        holidaysRes,
      });
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Set up real-time event listeners
  const eventHandlers = useMemo(
    () => ({
      "attendance:updated": () => fetchAll(),
      "leave:updated": () => fetchAll(),
      "leave:statusChanged": () => fetchAll(),
      "user:updated": () => fetchAll(),
      "user:created": () => fetchAll(),
      "user:deleted": () => fetchAll(),
      "role:updated": () => fetchAll(),
      "department:updated": () => fetchAll(),
      "holiday:updated": () => fetchAll(),
    }),
    [fetchAll],
  );

  useRealtime(eventHandlers);

  useEffect(() => {
    fetchAll();
    if (!refreshInterval) return;
    const t = setInterval(fetchAll, refreshInterval);
    return () => clearInterval(t);
  }, [fetchAll, refreshInterval]);

  return { data, loading, error, refresh: fetchAll };
}
