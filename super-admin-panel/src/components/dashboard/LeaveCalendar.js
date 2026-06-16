"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  UserCheck,
  Briefcase,
  Search,
  X,
  Users,
} from "lucide-react";

export default function LeaveCalendar({
  leaves = [],
  holidays = [],
  selectedUserId = "",
  selectedUserTodayAtt = null,
  selectedUserData = null,
  selectedUserLoading = false,
  allUsers = [],
  onUserSelect = () => {},
  userSearchQuery = "",
  onSearchChange = () => {},
  onClear = () => {},
}) {
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

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery) return allUsers;
    const q = userSearchQuery.toLowerCase();
    return allUsers.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q),
    );
  }, [allUsers, userSearchQuery]);

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

  // Calculate working hours
  const calculateWorkingHours = (att) => {
    if (!att?.checkIn) return "---";
    let totalMinutes = 0;
    if (att.checkOut) {
      totalMinutes = (new Date(att.checkOut) - new Date(att.checkIn)) / 60000;
    } else {
      totalMinutes = (new Date() - new Date(att.checkIn)) / 60000;
    }
    // Subtract break time
    (att.breaks || []).forEach((b) => {
      if (b.breakIn && b.breakOut) {
        totalMinutes -= (new Date(b.breakOut) - new Date(b.breakIn)) / 60000;
      }
    });
    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.floor(totalMinutes % 60);
    return `${hours}h ${mins}m`;
  };

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

                {/* Selected User's Today Attendance Timeline on Today's Cell */}
                {isToday && selectedUserId && selectedUserTodayAtt && (
                  <div className="mt-1 pt-1 border-t border-dashed border-indigo-200 space-y-0.5">
                    <div className="flex items-center gap-1 text-[8px] text-green-600 font-semibold">
                      <UserCheck size={8} />
                      <span>
                        IN:{" "}
                        {selectedUserTodayAtt.checkIn
                          ? new Date(
                              selectedUserTodayAtt.checkIn,
                            ).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "---"}
                      </span>
                    </div>
                    {selectedUserTodayAtt.breaks?.length > 0 &&
                      selectedUserTodayAtt.breaks.map((b, bi) => (
                        <div key={bi} className="flex items-center gap-0.5">
                          <div className="flex items-center gap-1 text-[7px] text-yellow-600 font-semibold">
                            <Clock size={7} />
                            <span>
                              B{bi + 1}I:{" "}
                              {new Date(b.breakIn).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[7px] text-blue-600 font-semibold">
                            <Clock size={7} />
                            <span>
                              O:{" "}
                              {b.breakOut
                                ? new Date(b.breakOut).toLocaleTimeString(
                                    "en-US",
                                    { hour: "2-digit", minute: "2-digit" },
                                  )
                                : "---"}
                            </span>
                          </div>
                        </div>
                      ))}
                    <div className="flex items-center gap-1 text-[8px] text-purple-600 font-semibold">
                      <Briefcase size={8} />
                      <span>
                        OUT:{" "}
                        {selectedUserTodayAtt.checkOut
                          ? new Date(
                              selectedUserTodayAtt.checkOut,
                            ).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "---"}
                      </span>
                    </div>
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
    <div className="space-y-4">
      {/* Employee Filter Section */}
      <div className="bg-gradient-to-r from-indigo-50/60 to-purple-50/60 rounded-2xl border border-indigo-200/60 p-4 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} className="text-indigo-500" />
          <span className="text-sm font-bold text-indigo-800">
            Filter Employee Calendar
          </span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              type="text"
              value={userSearchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search employee by name or email..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-white dark:bg-[var(--bg-surface)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
          <select
            value={selectedUserId}
            onChange={(e) => {
              onUserSelect(e.target.value);
              onSearchChange("");
            }}
            className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-white dark:bg-[var(--bg-surface)] text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="">-- Select an employee --</option>
            {filteredUsers.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
          {selectedUserId && (
            <button
              onClick={onClear}
              className="px-4 py-2.5 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 text-sm font-medium transition-colors flex items-center gap-2"
            >
              <X size={16} />
              Clear
            </button>
          )}
        </div>

        {/* Selected User Today Attendance Summary */}
        {selectedUserId && (
          <div className="mt-4 p-4 rounded-xl border border-indigo-200 bg-white/70 backdrop-blur-sm">
            {selectedUserLoading ? (
              <div className="flex items-center gap-2 text-sm text-indigo-600">
                <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                Loading attendance...
              </div>
            ) : selectedUserTodayAtt ? (
              <div className="space-y-3">
                {/* User Info & Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-indigo-100">
                      <UserCheck size={18} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-indigo-900">
                        {selectedUserData?.name || "Selected Employee"}
                      </p>
                      <p className="text-xs text-indigo-600/70">
                        {selectedUserData?.email || ""}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                      selectedUserTodayAtt.status === "CHECKED_IN" ||
                      selectedUserTodayAtt.status === "BACK_TO_WORK"
                        ? "bg-green-100 text-green-700"
                        : selectedUserTodayAtt.status === "LATE"
                          ? "bg-yellow-100 text-yellow-700"
                          : selectedUserTodayAtt.status === "ON_BREAK"
                            ? "bg-blue-100 text-blue-700"
                            : selectedUserTodayAtt.checkOut
                              ? "bg-purple-100 text-purple-700"
                              : "bg-red-100 text-red-700"
                    }`}
                  >
                    {selectedUserTodayAtt.status ||
                      (selectedUserTodayAtt.checkOut
                        ? "CHECKED_OUT"
                        : "ABSENT")}
                  </div>
                </div>

                {/* Attendance Timeline Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white/70 border border-green-200">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <UserCheck size={14} className="text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-green-600 font-semibold">
                        CHECK-IN
                      </p>
                      <p className="text-xs font-bold text-green-800 truncate">
                        {selectedUserTodayAtt.checkIn
                          ? new Date(
                              selectedUserTodayAtt.checkIn,
                            ).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })
                          : "---"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white/70 border border-purple-200">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                      <Briefcase size={14} className="text-purple-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-purple-600 font-semibold">
                        CHECK-OUT
                      </p>
                      <p className="text-xs font-bold text-purple-800 truncate">
                        {selectedUserTodayAtt.checkOut
                          ? new Date(
                              selectedUserTodayAtt.checkOut,
                            ).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })
                          : "---"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white/70 border border-blue-200">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <Clock size={14} className="text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-blue-600 font-semibold">
                        WORKING HOURS
                      </p>
                      <p className="text-xs font-bold text-blue-800 truncate">
                        {calculateWorkingHours(selectedUserTodayAtt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-white/70 border border-amber-200">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <Clock size={14} className="text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-amber-600 font-semibold">
                        BREAKS
                      </p>
                      <p className="text-xs font-bold text-amber-800 truncate">
                        {selectedUserTodayAtt.breaks?.length || 0} break
                        {(selectedUserTodayAtt.breaks?.length || 0) !== 1
                          ? "s"
                          : ""}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Break Details */}
                {selectedUserTodayAtt.breaks?.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-indigo-700 mb-2">
                      Break Details
                    </p>
                    <div className="space-y-1.5">
                      {selectedUserTodayAtt.breaks.map((b, bi) => (
                        <div
                          key={bi}
                          className="flex items-center gap-3 text-xs bg-white/50 rounded-lg px-3 py-2 border border-slate-200"
                        >
                          <span className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-[10px] shrink-0">
                            B{bi + 1}
                          </span>
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className="text-green-700 font-medium">
                              In:{" "}
                              {new Date(b.breakIn).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </span>
                            <span className="text-blue-700 font-medium">
                              Out:{" "}
                              {b.breakOut
                                ? new Date(b.breakOut).toLocaleTimeString(
                                    "en-US",
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: true,
                                    },
                                  )
                                : "---"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <Clock size={16} />
                <span>No attendance record found for today</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Calendar */}
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
            <span className="text-xs text-[var(--text-secondary)]">
              Approved
            </span>
          </div>

          <div className="flex items-center gap-2 hover:scale-105 transition">
            <div className="w-3 h-3 rounded bg-yellow-400 shadow-sm"></div>
            <span className="text-xs text-[var(--text-secondary)]">
              Pending
            </span>
          </div>

          <div className="flex items-center gap-2 hover:scale-105 transition">
            <div className="w-3 h-3 rounded bg-red-400 shadow-sm"></div>
            <span className="text-xs text-[var(--text-secondary)]">
              Rejected
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
