"use client";

import { memo } from "react";
import { HISTORY_TABLE_HEADERS } from "@/constants/dashboardConstants";

const STATUS_STYLES = {
  CHECKED_IN: "bg-blue-500/10 text-blue-400",
  CHECKED_OUT: "bg-emerald-500/10 text-emerald-400",
  LATE: "bg-orange-500/10 text-orange-400",
  ON_BREAK: "bg-yellow-500/10 text-yellow-400",
  BACK_TO_WORK: "bg-cyan-500/10 text-cyan-400",
  ON_LEAVE: "bg-red-500/10 text-red-400",
  HALF_DAY_LEAVE: "bg-purple-500/10 text-purple-400",
};

const STATUS_LABELS = {
  CHECKED_IN: "Checked In",
  CHECKED_OUT: "Checked Out",
  LATE: "Late",
  ON_BREAK: "On Break",
  BACK_TO_WORK: "Back to Work",
  ON_LEAVE: "On Leave",
  HALF_DAY_LEAVE: "Half Day",
};

/**
 * AttendanceHistory Component
 * Displays a table of attendance records with filtering options
 */
const AttendanceHistory = memo(({ records = [] }) => {
  return (
    <div
      className="rounded-xl border border-[var(--border)] p-3 sm:p-4"
      style={{
        background: "var(--bg-surface)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <h3 className="text-[15px] font-semibold text-cyan-600">
          Attendance History
        </h3>
      </div>

      <div className="overflow-auto max-h-[360px]">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {HISTORY_TABLE_HEADERS.map((header) => (
                <th
                  key={header}
                  className="text-left py-2 px-2 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {records.length === 0 ? (
              <tr>
                <td
                  colSpan={HISTORY_TABLE_HEADERS.length}
                  className="text-center py-6 text-[var(--text-muted)] text-sm"
                >
                  No records found
                </td>
              </tr>
            ) : (
              records.map((record, index) => (
                <tr
                  key={index}
                  className="border-b border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  <td className="py-2 px-2 text-[12px] text-[var(--text-secondary)] whitespace-nowrap">
                    {record.date}
                  </td>

                  <td className="py-2 px-2 text-emerald-400 font-semibold text-[12px]">
                    {record.entryTime}
                  </td>

                  <td className="py-2 px-2 text-[12px] text-[var(--text-muted)]">
                    {record.exitTime}
                  </td>

                  <td className="py-2 px-2 text-blue-400 text-[12px]">
                    {record.breaks}
                  </td>

                  <td className="py-2 px-2 text-[12px] text-[var(--text-secondary)]">
                    {record.totalBreakTime}
                  </td>

                  <td className="py-2 px-2 text-[12px] text-[var(--text-secondary)]">
                    {record.workingHours}
                  </td>

                  <td className="py-2 px-2">
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        STATUS_STYLES[record.status] ||
                        "bg-gray-500/10 text-gray-400"
                      }`}
                    >
                      {STATUS_LABELS[record.status] || record.status}
                    </span>
                  </td>

                  <td className="py-2 px-2">
                    <p className="text-indigo-400 font-medium text-[12px]">
                      {record.userEmail}
                    </p>

                    <p className="text-[10px] text-[var(--text-muted)]">
                      {record.userName}
                    </p>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

AttendanceHistory.displayName = "AttendanceHistory";

export default AttendanceHistory;
