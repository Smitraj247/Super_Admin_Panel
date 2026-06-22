"use client";

import { memo, useEffect, useState, useCallback } from "react";
import { Cake, Calendar } from "lucide-react";
import { getUpcomingBirthdays } from "@/services/userApi";

/**
 * UpcomingBirthdays Component
 * Displays upcoming employee birthdays with auto-refresh
 */
const UpcomingBirthdays = memo(() => {
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUpcomingBirthdays = useCallback(async () => {
    try {
      const response = await getUpcomingBirthdays();
      setBirthdays(response.data.data || []);
    } catch (error) {
      console.error("Error fetching birthdays:", error);
      setBirthdays([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUpcomingBirthdays();

    // Auto-refresh every 5 minutes
    const interval = setInterval(
      () => {
        fetchUpcomingBirthdays();
      },
      5 * 60 * 1000,
    );

    return () => clearInterval(interval);
  }, [fetchUpcomingBirthdays]);

  const formatBirthdayDate = (date) => {
    const d = new Date(date);
    const month = d.toLocaleString("default", { month: "short" });
    const day = d.getDate();
    return `${month} ${day}`;
  };

  const getDaysUntil = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const birthday = new Date(date);
    const currentYear = today.getFullYear();

    // Set birthday to current year at midnight
    const nextBirthday = new Date(
      currentYear,
      birthday.getMonth(),
      birthday.getDate(),
    );

    // If birthday has already passed this year, move to next year
    if (nextBirthday < today) {
      nextBirthday.setFullYear(currentYear + 1);
    }

    const diffTime = nextBirthday - today;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return `in ${diffDays} days`;
  };

  if (loading) {
    return (
      <div
        className="rounded-xl border border-[var(--border)] p-3 sm:p-4 overflow-y-auto "
        style={{
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-sm)",
          maxHeight: "360px",
        }}
      >
        <h3 className="text-[15px] font-semibold text-pink-500 mb-3">
          Upcoming Birthdays
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-3 sm:p-4 overflow-y-auto"
      style={{
        background: "var(--bg-surface)",
        boxShadow: "var(--shadow-sm)",
        height: "373px",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Cake className="w-4 h-4 text-pink-700" />
        <h3 className="text-[15px] font-semibold text-pink-500">
          Upcoming Birthdays
        </h3>
      </div>

      {birthdays.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Cake className="w-12 h-12 text-[var(--text-muted)] mb-2 opacity-50" />
          <p className="text-[12px] text-[var(--text-muted)]">
            No upcoming birthdays
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {birthdays.map((employee) => {
            const isToday = getDaysUntil(employee.birthday) === "Today";
            return (
              <div
                key={employee._id}
                className={`p-3 rounded-lg border transition-all group ${
                  isToday
                    ? "border-pink-400 bg-gradient-to-r from-pink-500/10 to-purple-500/10"
                    : "border-[var(--border)] bg-[var(--bg-elevated)] hover:bg-gradient-to-r hover:from-pink-500/5 hover:to-purple-500/5"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                        {employee.name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-[var(--text-primary)] flex items-center gap-1">
                        {employee.name}
                        {isToday && <span className="animate-pulse">🎉</span>}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        {employee.department?.name || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] mb-0.5">
                      <Calendar className="w-3 h-3" />
                      {formatBirthdayDate(employee.birthday)}
                    </div>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isToday
                          ? "bg-pink-500 text-white"
                          : getDaysUntil(employee.birthday) === "Tomorrow"
                            ? "bg-purple-500/20 text-purple-400"
                            : "bg-indigo-500/10 text-indigo-400"
                      }`}
                    >
                      {getDaysUntil(employee.birthday)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

UpcomingBirthdays.displayName = "UpcomingBirthdays";

export default UpcomingBirthdays;
