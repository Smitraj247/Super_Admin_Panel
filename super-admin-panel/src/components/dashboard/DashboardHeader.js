"use client";

import { memo } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { formatCurrentDate } from "@/utils/dateUtils";

/**
 * DashboardHeader Component
 * Displays the dashboard title and current date
 */
const DashboardHeader = memo(() => {
  return (
    <div className="flex items-center justify-between">
      <h2
        className="text-2xl sm:text-3xl font-semibold tracking-tight
        bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500
        bg-clip-text text-transparent animate-pulse"
      >
        Attendance System
      </h2>
      <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 sm:px-4 py-2 rounded-xl text-indigo-400">
        <CalendarIcon size={14} />
        <span className="text-xs sm:text-sm font-semibold hidden sm:block">
          {formatCurrentDate()}
        </span>
      </div>
    </div>
  );
});

DashboardHeader.displayName = "DashboardHeader";

export default DashboardHeader;
