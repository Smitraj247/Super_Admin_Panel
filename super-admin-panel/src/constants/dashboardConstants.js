/**
 * Dashboard Constants
 * Central location for all dashboard-related constants
 */

export const ACTIVE_STATUSES = new Set([
  "CHECKED_IN",
  "ON_BREAK",
  "BACK_TO_WORK",
  "LATE",
]);

export const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    color: "var(--text-primary)",
    fontSize: 12,
  },
};

export const COLOR_MAP = {
  green: {
    bg: "bg-green-50",
    text: "text-green-600",
    iconBg: "bg-green-500",
    border: "border-green-100",
  },
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    iconBg: "bg-blue-500",
    border: "border-blue-100",
  },
  orange: {
    bg: "bg-orange-50",
    text: "text-orange-600",
    iconBg: "bg-orange-500",
    border: "border-orange-100",
  },
  red: {
    bg: "bg-red-50",
    text: "text-red-600",
    iconBg: "bg-red-500",
    border: "border-red-100",
  },
  purple: {
    bg: "bg-purple-50",
    text: "text-purple-600",
    iconBg: "bg-purple-500",
    border: "border-purple-100",
  },
};

// Cache durations in milliseconds
export const CACHE_DURATIONS = {
  STATS: 30_000,
  WEEKLY: 60_000,
  HISTORY: 30_000,
  MONTHLY: 60_000,
  LEAVES: 60_000,
  HOLIDAYS: 3_600_000,
};

// Refresh interval
export const DASHBOARD_REFRESH_INTERVAL = 30_000;

// Work goal in hours
export const WORK_GOAL_HOURS = 8;

// Table headers for attendance history
export const HISTORY_TABLE_HEADERS = [
  "Date",
  "Entry",
  "Exit",
  "Breaks",
  "Break Time",
  "Work Hours",
  "Status",
  "User",
];
