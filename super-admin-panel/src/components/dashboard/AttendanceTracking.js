"use client";

import { memo } from "react";
import { LogIn, Coffee, Play, LogOut } from "lucide-react";
import ActionButton from "./ActionButton";

/**
 * AttendanceTracking Component
 * Provides buttons for check-in, break, resume, and check-out actions
 */
const AttendanceTracking = memo(
  ({ isCheckedIn, isOnBreak, hasCheckedInToday, userStatus, onAction }) => {
    const handleAction = (actionType) => {
      onAction?.(actionType);
    };

    return (
      <div
        className="rounded-2xl border border-[var(--border)] p-4"
        style={{
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-[16px] font-semibold text-cyan-600">
              Attendance Tracking
            </h3>
          </div>

          {userStatus === "LATE" && (
            <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
              Late Check-In
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <ActionButton
            icon={<LogIn className="w-4 h-4 sm:w-5 sm:h-5" />}
            label="Check In"
            subtitle="Start Your Day"
            color="green"
            onClick={() => handleAction("checkIn")}
            disabled={hasCheckedInToday}
          />

          <ActionButton
            icon={<Coffee className="w-4 h-4 sm:w-5 sm:h-5" />}
            label="Break"
            subtitle="Take a Break"
            color="orange"
            onClick={() => handleAction("breakIn")}
            disabled={!isCheckedIn || isOnBreak}
          />

          <ActionButton
            icon={<Play className="w-4 h-4 sm:w-5 sm:h-5" />}
            label="Resume"
            subtitle="Back to Work"
            color="blue"
            onClick={() => handleAction("breakOut")}
            disabled={!isOnBreak}
          />

          <ActionButton
            icon={<LogOut className="w-4 h-4 sm:w-5 sm:h-5" />}
            label="Check Out"
            subtitle="End Your Day"
            color="red"
            onClick={() => handleAction("checkOut")}
            disabled={!isCheckedIn}
          />
        </div>
      </div>
    );
  },
);

AttendanceTracking.displayName = "AttendanceTracking";

export default AttendanceTracking;
