"use client";

import { memo } from "react";
import { HISTORY_TABLE_HEADERS } from "@/constants/dashboardConstants";

/**
 * AttendanceHistory Component
 * Displays a table of attendance records with filtering options
 */
const AttendanceHistory = memo(({ records = [] }) => {
  return (
    <div
      className="rounded-2xl border border-[var(--border)] p-4 sm:p-6"
      style={{
        background: "var(--bg-surface)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <h3 className="text-[18px] font-semibold text-[var(--text-primary)]">
          Attendance History
        </h3>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="date"
            className="input-base text-[13px] rounded-xl px-3 py-2 border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />

          <button className="text-[13px] bg-[var(--bg-elevated)] hover:bg-[var(--border)] text-[var(--text-secondary)] px-4 py-2 rounded-xl font-medium transition-all border border-[var(--border)]">
            Filter
          </button>
        </div>
      </div>

      <div className="overflow-auto max-h-[420px]">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {HISTORY_TABLE_HEADERS.map((header) => (
                <th
                  key={header}
                  className="text-left py-3 px-3 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap"
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
                  className="text-center py-8 text-[var(--text-muted)] text-sm"
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
                  <td className="py-3 px-3 text-[13px] text-[var(--text-secondary)] whitespace-nowrap">
                    {record.date}
                  </td>

                  <td className="py-3 px-3 text-emerald-400 font-semibold text-[13px]">
                    {record.entryTime}
                  </td>

                  <td className="py-3 px-3 text-[13px] text-[var(--text-muted)]">
                    {record.exitTime}
                  </td>

                  <td className="py-3 px-3 text-blue-400 text-[13px]">
                    {record.breaks}
                  </td>

                  <td className="py-3 px-3 text-[13px] text-[var(--text-secondary)]">
                    {record.totalBreakTime}
                  </td>

                  <td className="py-3 px-3 text-[13px] text-[var(--text-secondary)]">
                    {record.workingHours}
                  </td>

                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400">
                      {record.status}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <p className="text-indigo-400 font-medium text-[13px]">
                      {record.userEmail}
                    </p>

                    <p className="text-[11px] text-[var(--text-muted)]">
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
