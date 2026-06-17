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
      <h2 className=" text-3xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent ">
        Attendance System
      </h2>
      <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 px-2.5 sm:px-3 py-1.5 rounded-lg text-indigo-400">
        <CalendarIcon size={13} />
        <span className="text-[11px] sm:text-xs font-semibold hidden sm:block">
          {formatCurrentDate()}
        </span>
      </div>
    </div>
  );
});

DashboardHeader.displayName = "DashboardHeader";

export default DashboardHeader;
