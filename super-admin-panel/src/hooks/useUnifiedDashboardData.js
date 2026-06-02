/**
 * useUnifiedDashboardData Hook
 * Manages all unified dashboard data fetching and state
 */

import { useState, useEffect, useCallback } from "react";
import { fetchDashboardData } from "@/services/dashboardService";
import {
  normalizeApiResponses,
  transformBreakData,
} from "@/utils/dashboardUtils";
import { DASHBOARD_REFRESH_INTERVAL } from "@/constants/dashboardConstants";

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
};

export const useUnifiedDashboardData = () => {
  const [data, setData] = useState(INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async (forceRefresh = false) => {
    try {
      const isInitialLoad = loading;
      if (!isInitialLoad) setRefreshing(true);

      const responses = await fetchDashboardData(forceRefresh);
      const normalizedData = normalizeApiResponses(responses);

      // Transform break data for display
      const transformedStats = {
        ...normalizedData.stats,
        breaks: transformBreakData(normalizedData.stats.breaks || []),
      };

      setData({
        ...normalizedData,
        stats: transformedStats,
      });
      setError(null);
    } catch (err) {
      console.error("Dashboard data fetch error:", err);
      setError(err.response?.data?.message || "Failed to fetch dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loading]);

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
