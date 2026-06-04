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
    <div className="grid grid-cols-1 xl:grid-cols-[2fr_320px] gap-4">
      <div
        className="
          rounded-2xl
          border border-[var(--border)]
          bg-[var(--bg-surface)]
          p-4
          shadow-sm
        "
      >
        <h3 className="text-[16px] font-semibold text-[var(--text-primary)] mb-4">
          Leave Calendar
        </h3>

        <LeaveCalendar leaves={leaves} holidays={holidays} />
      </div>

      <HolidayWidget />
    </div>
  );
});

LeaveAndHolidaySection.displayName = "LeaveAndHolidaySection";

export default LeaveAndHolidaySection;


