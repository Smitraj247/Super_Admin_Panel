"use client";

import { memo } from "react";
import LeaveCalendar from "@/components/dashboard/LeaveCalendar";
import HolidayWidget from "@/components/features/HolidayWidget";

/**
 * LeaveAndHolidaySection Component
 * Displays the leave calendar and holiday widget in a two-column grid
 */
const LeaveAndHolidaySection = memo(({ leaves = [], holidays = [] }) => {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
      {/* Recent Leaves Calendar */}
      <div
        className="rounded-2xl p-6 border border-[var(--border)]"
        style={{
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <h3 className="text-[18px] font-semibold text-[var(--text-primary)] mb-6">
          Recent Leaves Calendar
        </h3>
        <LeaveCalendar leaves={leaves} holidays={holidays} />
      </div>

      {/* Holiday Widget */}
      <div
        className="rounded-2xl p-6 border border-[var(--border)] h-fit"
        style={{
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <HolidayWidget />
      </div>
    </div>
  );
});

LeaveAndHolidaySection.displayName = "LeaveAndHolidaySection";

export default LeaveAndHolidaySection;
