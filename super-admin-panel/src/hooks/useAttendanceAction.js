/**
 * useAttendanceAction Hook
 * Manages attendance action handlers (check-in, breaks, check-out)
 */

import { useState, useCallback } from "react";
import { executeAttendanceAction, attendanceActions } from "@/services/dashboardService";

export const useAttendanceAction = (onActionSuccess) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const executeAction = useCallback(
    async (actionType) => {
      try {
        setIsLoading(true);
        setError(null);

        const actionFn = attendanceActions[actionType];
        if (!actionFn) {
          throw new Error(`Unknown action type: ${actionType}`);
        }

        await executeAttendanceAction(actionFn, (data) => {
          onActionSuccess?.(data);
        });
      } catch (err) {
        const errorMsg =
          err.response?.data?.message || `Failed to ${actionType}`;
        setError(errorMsg);
        console.error(`Action ${actionType} failed:`, err);
        alert(errorMsg);
      } finally {
        setIsLoading(false);
      }
    },
    [onActionSuccess]
  );

  return {
    isLoading,
    error,
    executeAction,
  };
};
