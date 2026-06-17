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
      <LeaveCalendar leaves={leaves} holidays={holidays} />

      <HolidayWidget />
    </div>
  );
});

LeaveAndHolidaySection.displayName = "LeaveAndHolidaySection";

export default LeaveAndHolidaySection;
