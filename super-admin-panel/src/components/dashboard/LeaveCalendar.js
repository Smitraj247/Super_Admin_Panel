"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

export default function LeaveCalendar({ leaves = [], holidays = [] }) {
  const today = new Date();

  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());

  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );

  // Sync date with selected month/year
  useEffect(() => {
    setCurrentDate(new Date(selectedYear, selectedMonth, 1));
  }, [selectedYear, selectedMonth]);

  // Calendar Info
  const { year, month, daysInMonth, firstDayOfMonth, monthName } =
    useMemo(() => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      return {
        year,
        month,
        daysInMonth: new Date(year, month + 1, 0).getDate(),
        firstDayOfMonth: new Date(year, month, 1).getDay(),
        monthName: currentDate.toLocaleDateString("en-US", {
          month: "long",
        }),
      };
    }, [currentDate]);

  // Available Years
  const availableYears = useMemo(() => {
    const years = new Set([
      today.getFullYear() - 1,
      today.getFullYear(),
      today.getFullYear() + 1,
    ]);

    leaves.forEach((leave) => {
      if (leave?.fromDate) {
        years.add(new Date(leave.fromDate).getFullYear());
      }

      if (leave?.toDate) {
        years.add(new Date(leave.toDate).getFullYear());
      }
    });

    return [...years].sort((a, b) => b - a);
  }, [leaves]);

  // Leaves Map
  const leavesByDate = useMemo(() => {
    const map = {};

    leaves.forEach((leave) => {
      if (!leave?.fromDate || !leave?.toDate) return;

      const from = new Date(leave.fromDate);
      const to = new Date(leave.toDate);

      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        if (d.getMonth() === month && d.getFullYear() === year) {
          const day = d.getDate();

          if (!map[day]) {
            map[day] = [];
          }

          const alreadyExists = map[day].find(
            (item) => item.userId === leave?.user?._id,
          );

          if (!alreadyExists) {
            map[day].push({
              userId: leave?.user?._id,
              name: leave?.user?.name || "Unknown",
              type: leave?.leaveType || "Leave",
              status: leave?.status || "PENDING",
              isHalfDay: leave?.isHalfDay || false,
            });
          }
        }
      }
    });

    return map;
  }, [leaves, month, year]);

  // Holidays Map
  const holidaysByDate = useMemo(() => {
    const map = {};

    holidays.forEach((holiday) => {
      if (!holiday?.date) return;

      const holidayDate = new Date(holiday.date);

      if (
        holidayDate.getMonth() === month &&
        holidayDate.getFullYear() === year
      ) {
        map[holidayDate.getDate()] = {
          title: holiday.title,
          type: holiday.type,
          description: holiday.description || "",
        };
      }
    });

    return map;
  }, [holidays, month, year]);

  // Month Names
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Navigation
  const goToPreviousMonth = () => {
    const newDate = new Date(year, month - 1, 1);

    setSelectedYear(newDate.getFullYear());
    setSelectedMonth(newDate.getMonth());
  };

  const goToNextMonth = () => {
    const newDate = new Date(year, month + 1, 1);

    setSelectedYear(newDate.getFullYear());
    setSelectedMonth(newDate.getMonth());
  };

  const goToToday = () => {
    const now = new Date();

    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
  };

  // Dropdown Handlers
  const handleYearChange = (e) => {
    setSelectedYear(Number(e.target.value));
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(Number(e.target.value));
  };

  // Holiday Background
  const getHolidayBg = (type) => {
    switch (type) {
      case "national":
        return "bg-orange-50";

      case "festival":
        return "bg-purple-50";

      case "company":
        return "bg-blue-50";

      default:
        return "bg-slate-50";
    }
  };

  // Render Calendar
  const renderCalendar = () => {
    const cells = [];

    const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
      const dayNumber = i - firstDayOfMonth + 1;

      const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;

      const isToday =
        isValidDay &&
        dayNumber === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear();

      const dayLeaves = isValidDay ? leavesByDate[dayNumber] || [] : [];

      const dayHoliday = isValidDay ? holidaysByDate[dayNumber] : null;

      cells.push(
        <div
          key={i}
          className={`min-h-[80px] border border-slate-100 p-1.5 transition-all
            ${
              isValidDay
                ? dayHoliday
                  ? `${getHolidayBg(dayHoliday.type)} hover:opacity-90`
                  : "bg-white hover:bg-slate-50"
                : "bg-slate-50"
            }
            ${isToday ? "ring-2 ring-indigo-300" : ""}
          `}
        >
          {isValidDay && (
            <>
              {/* Date */}
              <div className="flex items-center justify-between mb-1">
                <div
                  className={`text-xs font-semibold
                    ${isToday ? "text-indigo-600" : "text-slate-700"}
                  `}
                >
                  {dayNumber}
                </div>

                {dayHoliday && (
                  <div
                    className={`text-[8px] px-1 py-0.5 rounded font-semibold
                      ${
                        dayHoliday.type === "national"
                          ? "bg-orange-200 text-orange-800"
                          : dayHoliday.type === "festival"
                            ? "bg-purple-200 text-purple-800"
                            : "bg-blue-200 text-blue-800"
                      }
                    `}
                    title={dayHoliday.description || dayHoliday.title}
                  >
                    {dayHoliday.type === "national"
                      ? "🇮🇳"
                      : dayHoliday.type === "festival"
                        ? "🎉"
                        : "🏢"}
                  </div>
                )}
              </div>

              {/* Holiday */}
              {dayHoliday && (
                <div
                  className={`text-[9px] font-bold mb-1 truncate
                    ${
                      dayHoliday.type === "national"
                        ? "text-orange-700"
                        : dayHoliday.type === "festival"
                          ? "text-purple-700"
                          : "text-blue-700"
                    }
                  `}
                >
                  {dayHoliday.title}
                </div>
              )}
           
              {/* Leaves */}
              <div className="space-y-0.5">
                {dayLeaves.slice(0, dayHoliday ? 1 : 2).map((leave, index) => (
                  <div
                    key={index}
                    className={`text-[10px] px-1.5 py-0.5 rounded truncate
                        ${
                          leave.status === "APPROVED"
                            ? "bg-green-100 text-green-700"
                            : leave.status === "PENDING"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                        }
                      `}
                    title={`${leave.name} - ${leave.type}`}
                  >
                    {leave.name}
                  </div>
                ))}

                {dayLeaves.length > (dayHoliday ? 1 : 2) && (
                  <div className="text-[9px] text-slate-500 px-1">
                    +{dayLeaves.length - (dayHoliday ? 1 : 2)} more
                  </div>
                )}
              </div>
            </>
          )}
        </div>,
      );
    }

    return cells;
  };

  return (
    <div
      className="rounded-2xl border border-[var(--border)] overflow-hidden
    bg-white/70 backdrop-blur-xl shadow-sm
    transition-all duration-300"
    >
      {/* HEADER */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4
      border-b border-[var(--border)]
      bg-gradient-to-r from-indigo-50/40 to-white/60 backdrop-blur-md"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-100 shadow-sm">
            <Calendar size={18} className="text-indigo-500" />
          </div>

          <h3 className="text-[15px] font-bold text-[var(--text-primary)]">
            {monthName} {year}
          </h3>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedYear}
            onChange={handleYearChange}
            className="text-xs px-2.5 py-1.5 rounded-xl border border-[var(--border)]
          bg-white hover:shadow-sm transition-all duration-200"
          >
            {availableYears.map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>

          <select
            value={selectedMonth}
            onChange={handleMonthChange}
            className="text-xs px-2.5 py-1.5 rounded-xl border border-[var(--border)]
          bg-white hover:shadow-sm transition-all duration-200"
          >
            {monthNames.map((name, index) => (
              <option key={index} value={index}>
                {name}
              </option>
            ))}
          </select>

          <button
            onClick={goToToday}
            className="text-xs px-3 py-1.5 rounded-xl font-medium
          bg-indigo-500 text-white shadow-sm
          hover:bg-indigo-600 hover:scale-105 transition-all duration-200"
          >
            Today
          </button>

          <div className="flex items-center gap-1 bg-white border border-[var(--border)] rounded-xl p-1 shadow-sm">
            <button
              onClick={goToPreviousMonth}
              className="p-1.5 rounded-lg hover:bg-indigo-50 hover:scale-110 transition-all"
            >
              <ChevronLeft size={16} className="text-indigo-500" />
            </button>

            <button
              onClick={goToNextMonth}
              className="p-1.5 rounded-lg hover:bg-indigo-50 hover:scale-110 transition-all"
            >
              <ChevronRight size={16} className="text-indigo-500" />
            </button>
          </div>
        </div>
      </div>

      {/* CALENDAR */}
      <div className="p-4">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div
              key={d}
              className="text-center text-[11px] font-semibold text-[var(--text-muted)]"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">{renderCalendar()}</div>
      </div>

      {/* LEGEND */}
      <div
        className="flex flex-wrap items-center gap-4 px-4 py-3 border-t border-[var(--border)]
      bg-white/60 backdrop-blur-md"
      >
        <div className="text-xs font-semibold text-[var(--text-secondary)]">
          Status:
        </div>

        <div className="flex items-center gap-2 hover:scale-105 transition">
          <div className="w-3 h-3 rounded bg-green-400 shadow-sm"></div>
          <span className="text-xs text-[var(--text-secondary)]">Approved</span>
        </div>

        <div className="flex items-center gap-2 hover:scale-105 transition">
          <div className="w-3 h-3 rounded bg-yellow-400 shadow-sm"></div>
          <span className="text-xs text-[var(--text-secondary)]">Pending</span>
        </div>

        <div className="flex items-center gap-2 hover:scale-105 transition">
          <div className="w-3 h-3 rounded bg-red-400 shadow-sm"></div>
          <span className="text-xs text-[var(--text-secondary)]">Rejected</span>
        </div>
      </div>
    </div>
  );
}
