/**
 * Dashboard Service
 * Orchestrates all API calls with caching logic
 */

import {
  getDashboardStatsApi,
  getWeeklyAttendanceApi,
  getAttendanceHistoryApi,
} from "@/services/dashboardApi";
import {
  checkInApi,
  breakInApi,
  breakOutApi,
  checkOutApi,
  getMonthlyAttendanceApi,
  getAttendanceSummary,
} from "@/services/attandanceApi";
import { getUserLeavesApi } from "@/services/leaveApi";
import { getHolidaysApi } from "@/services/holidayApi";
import { cachedFetch } from "@/lib/cache";
import { CACHE_DURATIONS } from "@/constants/dashboardConstants";
import { getMonthBounds, getTodayDate } from "@/utils/dateUtils";

/**
 * Fetch all dashboard data with intelligent caching
 */
export const fetchDashboardData = async (forceRefresh = false) => {
  const today = getTodayDate();
  const { first, last } = getMonthBounds();

  const fetchFn = forceRefresh ? directFetch : cachedFetch;

  return Promise.all([
    fetchFn("ud:stats", () => getDashboardStatsApi(), CACHE_DURATIONS.STATS),
    fetchFn(
      "ud:weekly",
      () => getWeeklyAttendanceApi(),
      CACHE_DURATIONS.WEEKLY,
    ),
    fetchFn(
      `ud:history:${today}`,
      () => getAttendanceHistoryApi(today, today),
      CACHE_DURATIONS.HISTORY,
    ),
    fetchFn(
      `ud:monthly:${first}`,
      () => getMonthlyAttendanceApi(first, last),
      CACHE_DURATIONS.MONTHLY,
    ),
    fetchFn(
      `ud:summary:${first}`,
      () => getAttendanceSummary(first, last),
      CACHE_DURATIONS.STATS,
    ),
    fetchFn("ud:leaves", () => getUserLeavesApi(), CACHE_DURATIONS.LEAVES),
    fetchFn("ud:holidays", () => getHolidaysApi(), CACHE_DURATIONS.HOLIDAYS),
  ]);
};

/**
 * Helper for direct API calls (bypass cache)
 */
const directFetch = async (_, apiFn) => apiFn();

/**
 * Attendance action handlers
 */
export const attendanceActions = {
  checkIn: checkInApi,
  breakIn: breakInApi,
  breakOut: breakOutApi,
  checkOut: checkOutApi,
};

/**
 * Execute an attendance action with automatic refresh
 */
export const executeAttendanceAction = async (actionFn, onSuccess) => {
  await actionFn();
  const data = await fetchDashboardData(true);
  onSuccess?.(data);
};
