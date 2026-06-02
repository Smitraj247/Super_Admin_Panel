"use client";

import { useEffect, useState } from "react";
import { getHolidaysApi } from "@/services/holidayApi";

export default function HolidayWidget() {
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const res = await getHolidaysApi();

      const currentYear = new Date().getFullYear();
      const yearHolidays = res.data
        .filter(
          (holiday) => new Date(holiday.date).getFullYear() === currentYear
        )
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      setHolidays(yearHolidays);
    };

    fetch();
  }, []);

  return (
    <div
      className="rounded-2xl border border-[var(--border)] p-5 
      bg-gradient-to-b from-white/60 to-white/20 
      backdrop-blur-md shadow-sm"
    >
      {/* Header */}
      <h3 className="text-lg font-bold mb-4 text-[var(--text-primary)] flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
        Upcoming Holidays
      </h3>

      {/* List */}
      <div className="space-y-2 max-h-[650px] ">
        {holidays.map((h) => (
          <div
            key={h._id}
            className="flex items-center justify-between p-2 rounded-xl
            hover:bg-indigo-50 transition-all duration-200 cursor-default"
          >
            {/* Title */}
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {h.title}
            </span>

            {/* Date badge */}
            <span
              className="text-xs px-2 py-1 rounded-full 
              bg-indigo-100 text-indigo-600 font-medium"
            >
              {new Date(h.date).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}