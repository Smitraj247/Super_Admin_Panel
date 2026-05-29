"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import {
  Users,
  Clock,
  UserX,
  Coffee,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  LogIn,
  Play,
  LogOut,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import HolidayWidget from "@/components/HolidayWidget";
import LeaveCalendar from "@/components/dashboard/LeaveCalendar";
import {
  getDashboardStatsApi,
  getWeeklyAttendanceApi,
  getAttendanceHistoryApi,
} from "@/services/dashboardApi";
import {
  checkInApi,
  breakInApi,
  breakOutApi,
  checkOutApi,
  getMonthlyAttendanceApi,
  getAttendanceSummary,
} from "@/services/attandanceApi";
import { getUserLeavesApi } from "@/services/leaveApi";
import { getHolidaysApi } from "@/services/holidayApi";
import { cachedFetch } from "@/lib/cache";

//  Constants
const ACTIVE_STATUSES = new Set([
  "CHECKED_IN",
  "ON_BREAK",
  "BACK_TO_WORK",
  "LATE",
]);

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "var(--bg-surface)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    color: "var(--text-primary)",
    fontSize: 12,
  },
};

const COLOR_MAP = {
  green: {
    bg: "bg-green-50",
    text: "text-green-600",
    iconBg: "bg-green-500",
    border: "border-green-100",
  },
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    iconBg: "bg-blue-500",
    border: "border-blue-100",
  },
  orange: {
    bg: "bg-orange-50",
    text: "text-orange-600",
    iconBg: "bg-orange-500",
    border: "border-orange-100",
  },
  red: {
    bg: "bg-red-50",
    text: "text-red-600",
    iconBg: "bg-red-500",
    border: "border-red-100",
  },
  purple: {
    bg: "bg-purple-50",
    text: "text-purple-600",
    iconBg: "bg-purple-500",
    border: "border-purple-100",
  },
};

// Helpers

const monthBounds = () => {
  const now = new Date();
  return {
    first: new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0],
    last: new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0],
  };
};

const toTime = (d) =>
  d
    ? new Date(d).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
    : "—";

const breakMins = (breaks = []) =>
  breaks.reduce((acc, b) => {
    if (b.breakIn && b.breakOut)
      acc += (new Date(b.breakOut) - new Date(b.breakIn)) / 60000;
    return acc;
  }, 0);

const minsToHM = (m) =>
  `${Math.floor(m / 60)}:${String(Math.floor(m % 60)).padStart(2, "0")}`;
const minsToHMs = (m) => `${Math.floor(m / 60)}h ${Math.floor(m % 60)}m`;

const calcWorkHours = (record) => {
  if (!record.checkIn || !record.checkOut) return "—";
  const net =
    (new Date(record.checkOut) - new Date(record.checkIn)) / 60000 -
    breakMins(record.breaks);
  return minsToHMs(net);
};

const countLeaveDays = (leaves, start, end) =>
  leaves
    .filter(
      (l) =>
        l.status === "APPROVED" &&
        new Date(l.fromDate) <= end &&
        new Date(l.toDate) >= start,
    )
    .reduce((acc, l) => {
      const s = new Date(l.fromDate) < start ? start : new Date(l.fromDate);
      const e = new Date(l.toDate) > end ? end : new Date(l.toDate);
      return acc + (l.isHalfDay ? 0.5 : Math.ceil((e - s) / 86400000) + 1);
    }, 0);

//  Sub-components

const StatCard = ({ title, value, icon, trend, trendUp, color, sparkline }) => {
  const c = COLOR_MAP[color];
  const max = Math.max(...(sparkline || [1]));
  return (
    <div className="flex flex-col h-full rounded-2xl p-5 border border-[var(--border)] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-sm)" }}>
      <div className={`inline-flex p-2.5 rounded-xl mb-3 ${c.bg} ${c.text}`}>
        {icon}
      </div>
      <p className="text-[12px] text-[var(--text-muted)] mb-1 uppercase tracking-wider">{title}</p>
      <div className="flex items-end justify-between">
        <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{value}</p>
        {sparkline && (
          <div className="flex items-end gap-0.5 h-8">
            {sparkline.map((v, i) => (
              <div key={i} className={`w-1.5 rounded-t ${c.bg} opacity-70`} style={{ height: `${(v / max) * 100}%`, minHeight: "4px" }} />
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 mt-2">
        {trendUp !== undefined && (trendUp
          ? <TrendingUp className="w-3 h-3 text-emerald-400" />
          : <TrendingDown className="w-3 h-3 text-rose-400" />
        )}
        <span className={`text-[11px] ${trendUp ? "text-emerald-400" : trendUp === false ? "text-rose-400" : "text-[var(--text-muted)]"}`}>
          {trend}
        </span>
      </div>
    </div>
  );
};

const ActionButton = ({ icon, label, subtitle, color, onClick, disabled }) => {
  const c = COLOR_MAP[color];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl p-4 sm:p-5 border border-[var(--border)] transition-all duration-200
        hover:border-[var(--border-strong)] hover:shadow-lg hover:-translate-y-0.5
        ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
      style={{ background: "var(--bg-surface)" }}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className={`${c.iconBg} w-11 h-11 rounded-xl flex items-center justify-center text-white`}>
          {icon}
        </div>
        <div>
          <p className="font-semibold text-[13px] text-[var(--text-primary)]">{label}</p>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{subtitle}</p>
        </div>
      </div>
    </button>
  );
};

const SummaryItem = ({ label, value, color }) => (
  <div className="flex items-center justify-between">
    <span className="text-[13px] text-[var(--text-secondary)]">{label}</span>
    <span className={`text-base font-bold ${COLOR_MAP[color].text}`}>{value}</span>
  </div>
);

const ChartCard = ({ title, children }) => (
  <div className="rounded-2xl p-6 border border-[var(--border)]" style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-sm)" }}>
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">{title}</h3>
      <select className="text-[12px] border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400">
        <option>This Week</option>
        <option>Last Week</option>
        <option>This Month</option>
      </select>
    </div>
    <div className="h-64">{children}</div>
  </div>
);

//  Main Component
export default function UnifiedDashboard() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    presentToday: 0,
    totalWorkHours: 0,
    lateCheckIns: 0,
    absentToday: 0,
    onBreak: 0,
    checkInTime: "—",
    checkOutTime: "—",
    totalBreakTime: "0:00",
    workingHours: "—",
    goalProgress: 0,
    userStatus: "NOT_CHECKED_IN",
    breaks: [],
  });
  const [weeklyAttendance, setWeeklyAttendance] = useState([]);
  const [weeklyWorkHours, setWeeklyWorkHours] = useState([]);
  const [history, setHistory] = useState([]);
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);


  // Fetch All Data
  const fetchAll = useCallback(async (forceRefresh = false) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const { first, last } = monthBounds();

      const [
        statsRes,
        weeklyRes,
        historyRes,
        monthlyRes,
        summaryRes,
        leavesRes,
        holidaysRes,
      ] = await Promise.all([
        forceRefresh
          ? getDashboardStatsApi()
          : cachedFetch("ud:stats", () => getDashboardStatsApi(), 30_000),

        forceRefresh
          ? getWeeklyAttendanceApi()
          : cachedFetch("ud:weekly", () => getWeeklyAttendanceApi(), 60_000),

        forceRefresh
          ? getAttendanceHistoryApi(today, today)
          : cachedFetch(
            `ud:history:${today}`,
            () => getAttendanceHistoryApi(today, today),
            30_000
          ),

        forceRefresh
          ? getMonthlyAttendanceApi(first, last)
          : cachedFetch(
            `ud:monthly:${first}`,
            () => getMonthlyAttendanceApi(first, last),
            60_000
          ),

        forceRefresh
          ? getAttendanceSummary(first, last)
          : cachedFetch(
            `ud:summary:${first}`,
            () => getAttendanceSummary(first, last),
            60_000
          ),

        forceRefresh
          ? getUserLeavesApi()
          : cachedFetch(
            "ud:leaves",
            () => getUserLeavesApi(),
            60_000
          ),

        forceRefresh
          ? getHolidaysApi()
          : cachedFetch(
            "ud:holidays",
            () => getHolidaysApi(),
            3_600_000
          ),
      ]);

      // Update states
      if (statsRes.data) {
        setStats({
          ...statsRes.data,
          breaks: statsRes.data.breaks || [],
        });
      }

      if (weeklyRes.data) {
        setWeeklyAttendance(weeklyRes.data.weeklyAttendance || []);
        setWeeklyWorkHours(weeklyRes.data.weeklyWorkHours || []);
      }

      if (historyRes.data) {
        setHistory(
          historyRes.data.map((r) => ({
            date: r.date,
            entryTime: toTime(r.checkIn),
            exitTime: toTime(r.checkOut),
            breaks: r.breaks?.length
              ? `${r.breaks.length} break(s)`
              : "No breaks",
            totalBreakTime: minsToHM(breakMins(r.breaks)),
            workingHours: calcWorkHours(r),
            status: r.status,
            userEmail: r.userId?.email || "N/A",
            userName: r.userId?.name || "N/A",
            userId: r.userId?._id || "N/A",
          }))
        );
      }

      if (monthlyRes.data) setMonthlyRecords(monthlyRes.data);

      if (summaryRes.data) setMonthlySummary(summaryRes.data);

      if (leavesRes.data) setLeaves(leavesRes.data.data || []);

      if (holidaysRes.data) {
        setHolidays(
          Array.isArray(holidaysRes.data)
            ? holidaysRes.data
            : []
        );
      }
    } catch (err) {
      console.error("Dashboard fetch:", err);
      alert("Failed to refresh dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();

    const t = setInterval(() => {
      fetchAll();
    }, 30000);

    return () => clearInterval(t);
  }, [fetchAll]);

  //  Derived state
  const isCheckedIn = ACTIVE_STATUSES.has(stats.userStatus);
  const isOnBreak = stats.userStatus === "ON_BREAK";
  const isCheckedOut = stats.userStatus === "CHECKED_OUT";
  const hasCheckedInToday = isCheckedIn || isCheckedOut;

  const lateCount = useMemo(
    () => monthlyRecords.filter((r) => r.isLate).length,
    [monthlyRecords],
  );

  const actualAbsent = useMemo(() => {
    if (!monthlySummary) return 0;
    const { first, last } = monthBounds();
    const approved = countLeaveDays(leaves, new Date(first), new Date(last));
    return Math.max(0, monthlySummary.absent - approved);
  }, [leaves, monthlySummary]);

  //  Attendance actions

  const action = (apiFn, msg) => async () => {
    try {
      setRefreshing(true);

      await apiFn();

      // Instant fresh fetch
      await fetchAll(true);

    } catch (e) {
      alert(e.response?.data?.message || "Action failed");
    } finally {
      setRefreshing(false);
    }
  };

  const displayVal = (monthly, fallback) =>
    monthlySummary ? monthly : fallback;

  //Loading

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--bg-base)]">
        <Navbar />
        <Sidebar />
        <div className="sidebar-aware pt-14 flex items-center justify-center min-h-screen">
          <div className="text-center animate-fade-in">
            <div className="w-10 h-10 border-2 border-[var(--border-strong)] border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[var(--text-muted)] text-sm">Loading dashboard…</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg-base)]">
      <Navbar />
      <Sidebar />

      <div className="sidebar-aware pt-20">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2
              className="text-2xl sm:text-3xl font-semibold tracking-tight
              bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500
              bg-clip-text text-transparent animate-pulse"
            >
              Attendance System
            </h2>
            <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 sm:px-4 py-2 rounded-xl text-indigo-400">
              <CalendarIcon size={14} />
              <span className="text-xs sm:text-sm font-semibold hidden sm:block">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 auto-rows-fr">
            <StatCard
              title="Days Present"
              color="green"
              value={displayVal(monthlySummary?.present, stats.presentToday)}
              icon={<Users className="w-5 h-5" />}

            />
            <StatCard
              title="Work Hours"
              color="blue"
              value={`${displayVal(Math.floor(monthlySummary?.totalWorkHours), stats.totalWorkHours)}h`}
              icon={<Clock className="w-5 h-5" />}

            />
            <StatCard
              title="Late Check-ins"
              color="orange"
              value={lateCount}
              icon={<Clock className="w-5 h-5" />}

            />
            <StatCard
              title="Days Absent"
              color="red"
              value={actualAbsent}
              icon={<UserX className="w-5 h-5" />}

            />
            <StatCard
              title="On Break"
              color="purple"
              value={isOnBreak ? "Yes" : "No"}
              icon={<Coffee className="w-5 h-5" />}
              sparkline={[0, 0, isOnBreak ? 1 : 0]}
            />
          </div>



          {/* ── Row: Tracking + Today Summary ── */}
          {/* Dashboard Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">

            {/* LEFT SIDE */}
            <div className="xl:col-span-2 space-y-6">

              {/* Attendance Tracking */}
              <div
                className="rounded-2xl border border-[var(--border)] p-5 sm:p-6"
                style={{
                  background: "var(--bg-surface)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                  <div>
                    <h3 className="text-[20px] font-semibold text-[var(--text-primary)]">
                      Attendance Tracking
                    </h3>

                    <p className="text-[12px] text-[var(--text-muted)] mt-1">
                      Track your attendance with one click
                    </p>
                  </div>

                  {stats.userStatus === "LATE" && (
                    <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-[12px] font-semibold flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                      Late Check-In
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <ActionButton
                    icon={<LogIn className="w-5 h-5 sm:w-6 sm:h-6" />}
                    label="Check In"
                    subtitle="Start Your Day"
                    color="green"
                    onClick={action(checkInApi, "Checked in successfully!")}
                    disabled={hasCheckedInToday}
                  />

                  <ActionButton
                    icon={<Coffee className="w-5 h-5 sm:w-6 sm:h-6" />}
                    label="Break"
                    subtitle="Take a Break"
                    color="orange"
                    onClick={action(breakInApi, "Break started!")}
                    disabled={!isCheckedIn || isOnBreak}
                  />

                  <ActionButton
                    icon={<Play className="w-5 h-5 sm:w-6 sm:h-6" />}
                    label="Resume"
                    subtitle="Back to Work"
                    color="blue"
                    onClick={action(breakOutApi, "Break ended!")}
                    disabled={!isOnBreak}
                  />

                  <ActionButton
                    icon={<LogOut className="w-5 h-5 sm:w-6 sm:h-6" />}
                    label="Check Out"
                    subtitle="End Your Day"
                    color="red"
                    onClick={action(checkOutApi, "Checked out successfully!")}
                    disabled={!isCheckedIn}
                  />
                </div>
              </div>

              {/* Attendance History */}
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
                        {[
                          "Date",
                          "Entry",
                          "Exit",
                          "Breaks",
                          "Break Time",
                          "Work Hours",
                          "Status",
                          "User",
                        ].map((h) => (
                          <th
                            key={h}
                            className="text-left py-3 px-3 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {history.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="text-center py-8 text-[var(--text-muted)] text-sm"
                          >
                            No records found
                          </td>
                        </tr>
                      ) : (
                        history.map((r, i) => (
                          <tr
                            key={i}
                            className="border-b border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors"
                          >
                            <td className="py-3 px-3 text-[13px] text-[var(--text-secondary)] whitespace-nowrap">
                              {r.date}
                            </td>

                            <td className="py-3 px-3 text-emerald-400 font-semibold text-[13px]">
                              {r.entryTime}
                            </td>

                            <td className="py-3 px-3 text-[13px] text-[var(--text-muted)]">
                              {r.exitTime}
                            </td>

                            <td className="py-3 px-3 text-blue-400 text-[13px]">
                              {r.breaks}
                            </td>

                            <td className="py-3 px-3 text-[13px] text-[var(--text-secondary)]">
                              {r.totalBreakTime}
                            </td>

                            <td className="py-3 px-3 text-[13px] text-[var(--text-secondary)]">
                              {r.workingHours}
                            </td>

                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400">
                                {r.status}
                              </span>
                            </td>

                            <td className="py-3 px-3">
                              <p className="text-indigo-400 font-medium text-[13px]">
                                {r.userEmail}
                              </p>

                              <p className="text-[11px] text-[var(--text-muted)]">
                                {r.userName}
                              </p>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="space-y-6">

              {/* Today's Summary */}
              <div
                className="h-[45vh] rounded-2xl border border-[var(--border)] p-5 sm:p-6 h-[494px] overflow-y-scroll"
                style={{
                  background: "var(--bg-surface)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <h3 className="text-[18px] font-semibold text-[var(--text-primary)] mb-5">
                  Today's Summary
                </h3>

                <div className="space-y-3">
                  <SummaryItem
                    label="Check In"
                    value={stats.checkInTime}
                    color="green"
                  />

                  <SummaryItem
                    label="Check Out"
                    value={stats.checkOutTime}
                    color="red"
                  />

                  <SummaryItem
                    label="Total Break"
                    value={stats.totalBreakTime}
                    color="orange"
                  />

                  <SummaryItem
                    label="Working Hours"
                    value={stats.workingHours}
                    color="blue"
                  />
                </div>

                {/* Break Details */}
                {stats.breaks.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-[var(--border)]">
                    <h4 className="text-[12px] font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                      <Coffee className="w-3.5 h-3.5 text-orange-400" />
                      Break Details
                    </h4>

                    <div className="space-y-2">
                      {stats.breaks.map((b) => (
                        <div
                          key={b.index}
                          className={`p-3 rounded-xl border text-xs ${b.isActive
                            ? "bg-orange-500/10 border-orange-500/20"
                            : "bg-[var(--bg-elevated)] border-[var(--border)]"
                            }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-[var(--text-secondary)]">
                              Break #{b.index}
                            </span>

                            {b.isActive && (
                              <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                                <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
                                Active
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-400 font-medium">
                                {b.breakStart}
                              </span>

                              <span className="text-[var(--text-muted)]">→</span>

                              <span
                                className={`font-medium ${b.isActive
                                  ? "text-orange-400"
                                  : "text-rose-400"
                                  }`}
                              >
                                {b.breakEnd}
                              </span>
                            </div>

                            <span className="font-semibold text-[var(--text-secondary)]">
                              {b.duration}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Goal Progress */}
                <div className="mt-5 pt-4 border-t border-[var(--border)]">
                  <div className="flex items-center justify-between mb-2 text-[12px]">
                    <span className="text-[var(--text-muted)]">
                      {stats.goalProgress}% of 8h goal
                    </span>

                    <span className="font-semibold text-[var(--text-primary)]">
                      {stats.workingHours} / 8h
                    </span>
                  </div>

                  <div className="w-full bg-[var(--bg-elevated)] rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-indigo-500 to-violet-500 h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(stats.goalProgress, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>


            </div>
          </div>


          {/* Leave + Holiday Section */}

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

        </div>
      </div>
    </main >
  );
}
