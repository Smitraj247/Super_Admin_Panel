/**
 * Dashboard utility functions for data transformations
 */

import {
  formatTime,
  calculateBreakMinutes,
  minutesToHM,
  calculateWorkingHours,
  countLeaveDays,
} from "./dateUtils";

/**
 * Transform raw attendance history API response to table-friendly format
 */
export const transformHistoryData = (rawData) =>
  (rawData || []).map((record) => ({
    date: record.date,
    entryTime: formatTime(record.checkIn),
    exitTime: formatTime(record.checkOut),
    breaks: record.breaks?.length ? `${record.breaks.length} break(s)` : "No breaks",
    totalBreakTime: minutesToHM(calculateBreakMinutes(record.breaks)),
    workingHours: calculateWorkingHours(record),
    status: record.status,
    userEmail: record.userId?.email || "N/A",
    userName: record.userId?.name || "N/A",
    userId: record.userId?._id || "N/A",
  }));

/**
 * Calculate actual days absent (excluding approved leaves)
 */
export const calculateActualAbsent = (summary, leaves, startDate, endDate) => {
  if (!summary) return 0;
  const approvedLeaveDays = countLeaveDays(leaves, startDate, endDate);
  return Math.max(0, summary.absent - approvedLeaveDays);
};

/**
 * Get value from monthly summary or fallback to daily stat
 */
export const getDisplayValue = (monthlySummary, monthlyValue, dailyValue) =>
  monthlySummary ? monthlyValue : dailyValue;

/**
 * Transform break data for display in Today's Summary
 */
export const transformBreakData = (breaks = []) =>
  breaks.map((breakItem, index) => ({
    ...breakItem,
    index: index + 1,
    breakStart: formatTime(breakItem.breakIn),
    breakEnd: formatTime(breakItem.breakOut),
    isActive: !breakItem.breakOut,
    duration: calculateBreakMinutes([breakItem]) > 0
      ? minutesToHM(calculateBreakMinutes([breakItem]))
      : "—",
  }));

/**
 * Calculate goal progress percentage
 */
export const calculateGoalProgress = (workingMins) => {
  const goalMins = 8 * 60; // 8 hours
  return Math.round((workingMins / goalMins) * 100);
};

/**
 * Merge and normalize API responses into dashboard state
 */
export const normalizeApiResponses = (responses) => {
  const [
    statsRes,
    weeklyRes,
    historyRes,
    monthlyRes,
    summaryRes,
    leavesRes,
    holidaysRes,
  ] = responses;

  return {
    stats: statsRes?.data || {},
    weeklyAttendance: weeklyRes?.data?.weeklyAttendance || [],
    weeklyWorkHours: weeklyRes?.data?.weeklyWorkHours || [],
    history: transformHistoryData(historyRes?.data),
    monthlyRecords: monthlyRes?.data || [],
    monthlySummary: summaryRes?.data || null,
    leaves: leavesRes?.data?.data || [],
    holidays: Array.isArray(holidaysRes?.data) ? holidaysRes?.data : [],
  };
};
