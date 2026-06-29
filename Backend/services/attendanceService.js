export { getToday } from "../utils/dateUtils.js";

export {
  performCheckIn,
  performCheckOut,
  fetchTodayStatus,
  adminCreateOrUpdateAttendance,
  updateRecord,
  fetchUserAttendanceById,
  fetchByDateRange,
  fetchAllUsersAttendance,
} from "./attendance/checkInService.js";

export {
  performBreakIn,
  performBreakOut,
  finishBreak,
  adminAddBreaks,
  adminCreateBreak,
} from "./attendance/breakService.js";

export { syncLeaveAttendanceForRange } from "./attendance/syncService.js";

export {
  computeSummary,
  computeDashboardStats,
  computeWeeklyStats,
  computeAllUsersSummary,
  computeUserSummary,
} from "./attendance/summaryService.js";
