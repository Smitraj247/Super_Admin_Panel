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
          (holiday) => new Date(holiday.date).getFullYear() === currentYear,
        )
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      setHolidays(yearHolidays);
    };

    fetch();
  }, []);

  return (
    <div
      className="
      rounded-2xl
      border border-[var(--border)]
      bg-[var(--bg-surface)]
      p-5
      shadow-sm
      h-full
    "
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-indigo-500" />
        <h3 className="text-lg font-semibold text-indigo-700">
          Upcoming Holidays
        </h3>
      </div>

      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
        {holidays.map((h) => (
          <div
            key={h._id}
            className="
            flex items-center justify-between
            rounded-xl
            border border-[var(--border)]
            px-3 py-3
            hover:bg-[var(--bg-elevated)]
            transition-colors
          "
          >
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {h.title}
              </p>

              <p className="text-xs text-indigo-500">
                {new Date(h.date).toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                })}
              </p>
            </div>

            <span className="rounded-full bg-indigo-500/10 px-2 py-1 text-xs font-medium text-indigo-500">
              Holiday
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
