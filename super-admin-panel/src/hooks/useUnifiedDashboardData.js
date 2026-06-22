/**
 * useUnifiedDashboardData Hook
 * Manages all unified dashboard data fetching and state
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchDashboardData } from "@/services/dashboardService";
import { canUserCheckInApi } from "@/services/leaveApi";
import {
  normalizeApiResponses,
  transformBreakData,
} from "@/utils/dashboardUtils";
import { DASHBOARD_REFRESH_INTERVAL } from "@/constants/dashboardConstants";
import { useRealtime } from "./useRealtime";

const INITIAL_STATE = {
  stats: {
    presentToday: 0,
    totalWorkHours: 0,
    lateCheckIns: 0,
    absentToday: 0,
    onBreak: 0,
    checkInTime: "—",
    checkOutTime: "—",
    totalBreakTime: "0:00",
    workingHours: "—",
    goalProgress: 0,
    userStatus: "NOT_CHECKED_IN",
    breaks: [],
  },
  weeklyAttendance: [],
  weeklyWorkHours: [],
  history: [],
  monthlyRecords: [],
  monthlySummary: null,
  leaves: [],
  holidays: [],
  canCheckIn: {
    canCheckIn: true,
    reason: null,
  },
};

export const useUnifiedDashboardData = () => {
  const [data, setData] = useState(INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(
    async (forceRefresh = false) => {
      try {
        const isInitialLoad = loading;
        if (!isInitialLoad) setRefreshing(true);

        const [dashboardResponses, canCheckInResponse] = await Promise.all([
          fetchDashboardData(forceRefresh),
          canUserCheckInApi(),
        ]);

        const normalizedData = normalizeApiResponses(dashboardResponses);

        // Transform break data for display
        const transformedStats = {
          ...normalizedData.stats,
          breaks: transformBreakData(normalizedData.stats.breaks || []),
        };

        setData({
          ...normalizedData,
          stats: transformedStats,
          canCheckIn: canCheckInResponse?.data?.data || {
            canCheckIn: true,
            reason: null,
          },
        });
        setError(null);
      } catch (err) {
        console.error("Dashboard data fetch error:", err);
        setError(
          err.response?.data?.message || "Failed to fetch dashboard data",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loading],
  );

  // Set up real-time event listeners
  const eventHandlers = useMemo(() => ({
    "attendance:updated": () => fetchAll(true),
    "leave:updated": () => fetchAll(true),
    "leave:statusChanged": () => fetchAll(true),
    "notification:created": () => fetchAll(true),
  }), [fetchAll]);
  
  useRealtime(eventHandlers);

  // Fetch data on mount and set up auto-refresh
  useEffect(() => {
    fetchAll();

    const interval = setInterval(() => {
      fetchAll();
    }, DASHBOARD_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchAll]);

  return {
    ...data,
    loading,
    refreshing,
    error,
    refetch: fetchAll,
  };
};
