/**
 * useAttendanceStats Hook
 * Manages derived state and calculations for attendance stats
 */

import { useMemo } from "react";
import {
  calculateActualAbsent,
  calculateGoalProgress,
  getDisplayValue,
} from "@/utils/dashboardUtils";
import { getMonthBounds } from "@/utils/dateUtils";
import { ACTIVE_STATUSES } from "@/constants/dashboardConstants";

export const useAttendanceStats = (
  stats,
  monthlyRecords,
  monthlySummary,
  leaves,
) => {
  // Derived status flags
  const isCheckedIn = useMemo(
    () => ACTIVE_STATUSES.has(stats?.userStatus),
    [stats?.userStatus],
  );

  const isOnBreak = useMemo(
    () => stats?.userStatus === "ON_BREAK",
    [stats?.userStatus],
  );

  const isCheckedOut = useMemo(
    () => stats?.userStatus === "CHECKED_OUT",
    [stats?.userStatus],
  );

  const hasCheckedInToday = useMemo(
    () => isCheckedIn || isCheckedOut,
    [isCheckedIn, isCheckedOut],
  );

  // Count late check-ins
  const lateCount = useMemo(
    () => monthlyRecords?.filter((r) => r.isLate).length ?? 0,
    [monthlyRecords],
  );

  // Calculate actual absent days (excluding approved leaves)
  const actualAbsent = useMemo(() => {
    if (!monthlySummary) return 0;
    const { first, last } = getMonthBounds();
    return calculateActualAbsent(
      monthlySummary,
      leaves,
      new Date(first),
      new Date(last),
    );
  }, [leaves, monthlySummary]);

  // Calculate goal progress (from working hours)
  const goalProgress = useMemo(() => {
    const workMins = stats?.workingHours
      ? parseInt(stats.workingHours.split("h")[0]) * 60 +
        parseInt(stats.workingHours.split(" ")[1])
      : 0;
    return calculateGoalProgress(workMins);
  }, [stats?.workingHours]);

  // Display values (month vs daily)
  const displayValues = useMemo(
    () => ({
      present: getDisplayValue(
        monthlySummary,
        monthlySummary?.present,
        stats?.presentToday,
      ),
      workHours: getDisplayValue(
        monthlySummary,
        Math.floor(monthlySummary?.totalWorkHours),
        stats?.totalWorkHours,
      ),
    }),
    [monthlySummary, stats?.presentToday, stats?.totalWorkHours],
  );

  return {
    isCheckedIn,
    isOnBreak,
    isCheckedOut,
    hasCheckedInToday,
    lateCount,
    actualAbsent,
    goalProgress,
    displayValues,
  };
};
