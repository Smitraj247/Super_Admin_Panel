"use client";

import { useState, useEffect, useCallback, memo } from "react";
import {
  Users,
  Building2,
  Clock,
  UserCheck,
  Briefcase,
  BarChart3,
  Activity,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/Sidebar";
import StatCard from "@/components/dashboard/StatCard";
import QuickActionButton from "@/components/dashboard/ActionButton";
import LeaveCalendar from "@/components/dashboard/LeaveCalendar";
import {
  getStatsApi,
  getDepartmentsApi,
  getUsersApi,
  getAdminsApi,
} from "@/services/superAdminApi";
import { getAllUsersAttendanceApi } from "@/services/attandanceApi";
import { getSuperAdminLeavesApi } from "@/services/leaveApi";
import { getHolidaysApi } from "@/services/holidayApi";
import { cachedFetch } from "@/lib/cache";
import UpcomingBirthdays from "@/components/dashboard/UpcomingBirthdays";

// ─── Constants
const COLORS = ["#10b981", "#f59e0b", "#8b5cf6", "#3b82f6"];

const STATUS_PRESENT = new Set([
  "CHECKED_IN",
  "LATE",
  "ON_BREAK",
  "BACK_TO_WORK",
]);

const RATE_COLOR = (r) =>
  r >= 90
    ? "bg-green-100 text-green-700"
    : r >= 80
      ? "bg-blue-100 text-blue-700"
      : r >= 70
        ? "bg-yellow-100 text-yellow-700"
        : "bg-red-100 text-red-700";

const LEAVE_COLOR = (s) =>
  s === "APPROVED"
    ? "bg-green-100 text-green-700"
    : s === "PENDING"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-700";

// ─── Helpers
const todayStr = () => new Date().toISOString().split("T")[0];

const monthRange = () => {
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

const isPresent = (r) => STATUS_PRESENT.has(r.status) || r.checkIn;

const getTimeAgo = (timestamp) => {
  const s = Math.floor((Date.now() - new Date(timestamp)) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const safeArray = (val) =>
  Array.isArray(val?.data) ? val.data : Array.isArray(val) ? val : [];

const shiftFor = (checkIn) => {
  const h = checkIn ? new Date(checkIn).getHours() : 9;
  if (h >= 6 && h < 14) return "morning";
  if (h >= 14 && h < 22) return "evening";
  if (h >= 22 || h < 6) return "night";
  return "flexible";
};

// ─── Sub-components

const LegendItem = memo(({ color, label, value }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-[13px] text-[var(--text-secondary)]">{label}</span>
    </div>
    <span className="text-[13px] font-semibold text-[var(--text-primary)]">
      {value}
    </span>
  </div>
));
LegendItem.displayName = "LegendItem";

const SystemMetric = memo(
  ({ icon, label, value, subtitle, trend, trendUp }) => (
    <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[var(--bg-surface)]">{icon}</div>
        <div>
          <p className="text-[11px] text-[var(--text-muted)]">{label}</p>
          <p className="text-[13px] font-bold text-[var(--text-primary)]">
            {value}
          </p>
          {subtitle && (
            <p className="text-[11px] text-[var(--text-muted)]">{subtitle}</p>
          )}
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1">
          {trendUp ? (
            <TrendingUp className="w-3 h-3 text-emerald-400" />
          ) : (
            <TrendingDown className="w-3 h-3 text-rose-400" />
          )}
          <span
            className={`text-[11px] font-semibold ${trendUp ? "text-emerald-400" : "text-rose-400"}`}
          >
            {trend}
          </span>
        </div>
      )}
    </div>
  ),
);
SystemMetric.displayName = "SystemMetric";

const SectionCard = memo(({ title, action, children, className = "" }) => (
  <div
    className={`rounded-2xl p-6 border border-[var(--border)] ${className}`}
    style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-sm)" }}
  >
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
        {title}
      </h3>
      {action}
    </div>
    {children}
  </div>
));
SectionCard.displayName = "SectionCard";

const pct = (num, total) =>
  total > 0 ? ((num / total) * 100).toFixed(1) : "0.0";

// ─── Main Component

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    totalDepartments: 0,
    onLeaveToday: 0,
    totalWorkingHours: 0,
    attendanceRate: 0,
  });
  const [overview, setOverview] = useState({
    present: 0,
    absent: 0,
    onLeave: 0,
    late: 0,
    total: 0,
  });
  const [trend, setTrend] = useState([]);
  const [deptSummary, setDeptSummary] = useState([]);
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [shiftData, setShiftData] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [systemInfo] = useState({
    activeUsers: 0,
    uptime: "99.9%",
    storage: "256 GB",
    dbSize: "1.2 GB",
  });

  const fetchAll = useCallback(async () => {
    try {
      const today = todayStr();
      const { first, last } = monthRange();

      // Cache slow/static data longer; attendance data shorter
      const [
        statsRes,
        deptsRes,
        usersRes,
        adminsRes,
        todayAtt,
        monthAtt,
        leavesRes,
        holidaysRes,
      ] = await Promise.all([
        cachedFetch("sa:stats", () => getStatsApi(), 30_000),
        cachedFetch("sa:departments", () => getDepartmentsApi(), 120_000),
        cachedFetch("sa:users", () => getUsersApi(), 120_000),
        cachedFetch("sa:admins", () => getAdminsApi(), 120_000),
        cachedFetch(
          `sa:att:today:${today}`,
          () => getAllUsersAttendanceApi(today, today),
          30_000,
        ),
        cachedFetch(
          `sa:att:month:${first}`,
          () => getAllUsersAttendanceApi(first, last),
          60_000,
        ),
        cachedFetch("sa:leaves", () => getSuperAdminLeavesApi(), 60_000),
        cachedFetch("sa:holidays", () => getHolidaysApi(), 3_600_000),
      ]);

      // Normalise arrays
      const allUsers = [
        ...safeArray(usersRes.data?.users ?? usersRes.data),
        ...safeArray(adminsRes.data),
      ];
      const todayRecs = safeArray(todayAtt.data?.data ?? todayAtt.data);
      const monthRecs = safeArray(monthAtt.data?.data ?? monthAtt.data);
      const allLeavesData = safeArray(leavesRes.data?.data ?? leavesRes.data);
      const departments = deptsRes.data || [];
      const holidaysData = safeArray(holidaysRes.data);

      // Store all leaves for calendar
      setAllLeaves(allLeavesData);

      // Store holidays for calendar
      setHolidays(holidaysData);

      const totalEmployees = allUsers.length;

      // Attendance counts
      const presentToday = todayRecs.filter(isPresent).length;
      const lateCount = todayRecs.filter((r) => r.isLate).length;

      // On-leave today
      const todayDate = new Date(today);
      todayDate.setHours(0, 0, 0, 0);
      const onLeaveToday = allLeavesData.filter((l) => {
        if (l.status !== "APPROVED") return false;
        const from = new Date(l.fromDate);
        from.setHours(0, 0, 0, 0);
        const to = new Date(l.toDate);
        to.setHours(23, 59, 59, 999);
        return from <= todayDate && to >= todayDate;
      }).length;

      const absentToday = Math.max(
        0,
        totalEmployees - presentToday - onLeaveToday,
      );
      const attendanceRate = parseFloat(pct(presentToday, totalEmployees));

      // Working hours (current month)
      const totalWorkingHours = Math.round(
        monthRecs.reduce((acc, r) => {
          if (!r.checkIn || !r.checkOut) return acc;
          let mins = (new Date(r.checkOut) - new Date(r.checkIn)) / 60000;
          (r.breaks || []).forEach((b) => {
            if (b.breakIn && b.breakOut)
              mins -= (new Date(b.breakOut) - new Date(b.breakIn)) / 60000;
          });
          return acc + mins / 60;
        }, 0),
      );

      setStats({
        totalEmployees,
        presentToday,
        totalDepartments: departments.length,
        onLeaveToday,
        totalWorkingHours,
        attendanceRate,
      });
      setOverview({
        present: presentToday,
        absent: absentToday,
        onLeave: onLeaveToday,
        late: lateCount,
        total: totalEmployees,
      });

      // Department summary
      setDeptSummary(
        departments.map((dept) => {
          const members = allUsers.filter(
            (u) => (u.department?._id || u.department) === dept._id,
          );
          const present = todayRecs.filter((r) => {
            const uid = r.userId?._id || r.userId;
            return members.some((u) => u._id === uid) && isPresent(r);
          }).length;
          return {
            department: dept.name,
            employees: members.length,
            presentToday: present,
            rate: parseFloat(pct(present, members.length)),
          };
        }),
      );

      // Recent leaves
      setRecentLeaves(
        [...allLeavesData]
          .sort(
            (a, b) =>
              new Date(b.createdAt || b.fromDate) -
              new Date(a.createdAt || a.fromDate),
          )
          .slice(0, 4)
          .map((l) => ({
            employee: l.user?.name || "Unknown",
            leaveType: l.leaveType,
            from: new Date(l.fromDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            to: new Date(l.toDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            status: l.status,
          })),
      );

      // 7-day trend
      setTrend(
        Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          const dStr = d.toISOString().split("T")[0];
          const dayRecs =
            dStr === today
              ? todayRecs
              : monthRecs.filter(
                  (r) => new Date(r.date).toISOString().split("T")[0] === dStr,
                );
          const present = dayRecs.filter(isPresent).length;
          return {
            day: d.toLocaleDateString("en-US", { weekday: "short" }),
            fullLabel: d.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            }),
            present,
            absent: Math.max(0, totalEmployees - present),
          };
        }),
      );

      // Shift distribution
      const counts = todayRecs.reduce((acc, r) => {
        const s = r.shift ? r.shift.toLowerCase() : shiftFor(r.checkIn);
        const key = s.includes("morning")
          ? "Morning"
          : s.includes("evening")
            ? "Evening"
            : s.includes("night")
              ? "Night"
              : "Flexible";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      const total = presentToday || 1;
      setShiftData(
        Object.entries(counts).map(([name, value]) => ({
          name: `${name} Shift`,
          value,
          percentage: pct(value, total),
        })),
      );

      // Recent activity from stats
      if (statsRes.data?.recentActivity)
        setRecentActivity(statsRes.data.recentActivity);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 30_000);
    return () => clearInterval(t);
  }, [fetchAll]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  // ── Loading ──
  if (loading) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <Sidebar />
        <div className="sidebar-aware pt-20 flex items-center justify-center min-h-screen">
          <div className="text-center animate-fade-in">
            <div className="w-10 h-10 border-2 border-[var(--border-strong)] border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[var(--text-muted)] text-sm">
              Loading dashboard…
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ── Derived display values ──
  const { present, absent, onLeave, late, total } = overview;

  const pieData = [
    { name: "Present", value: present },
    { name: "Absent", value: absent },
    { name: "On Leave", value: onLeave },
    { name: "Late", value: late },
  ];

  return (
    <main className="min-h-screen">
      <Navbar />
      <Sidebar />

      <div className="sidebar-aware pt-20">
        <div className="max-w-[1600px] mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-[#7c6fff] via-[#8b5cf6] to-[#00d4aa] bg-clip-text text-transparent">
                Super Admin Dashboard
              </h1>
              <p className="text-sm text-[var(--text-muted)] mt-0.5">
                Overview of the entire attendance system
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] disabled:opacity-40 transition-all"
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? "animate-spin text-indigo-400" : ""}
                />
              </button>
              <div className="hidden sm:flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-2 rounded-xl text-indigo-400">
                <CalendarIcon size={14} />
                <span className="text-[12px] font-semibold">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {[
              {
                title: "Total Employees",
                value: stats.totalEmployees,
                icon: <Users size={18} />,
                //  trend: "+8.5%",
                up: true,
                color: "purple",
                sparkline: [1100, 1150, 1200, stats.totalEmployees],
              },
              {
                title: "Present Today",
                value: stats.presentToday,
                icon: <UserCheck size={18} />,
                // trend: `${stats.attendanceRate}%`,
                up: stats.attendanceRate >= 80,
                color: "blue",
                sparkline: [850, 900, 950, stats.presentToday],
              },
              {
                title: "Total Departments",
                value: stats.totalDepartments,
                icon: <Building2 size={18} />,
                // trend: "+7.2",
                up: true,
                color: "green",
                sparkline: [20, 22, 23, stats.totalDepartments],
              },
              {
                title: "On Leave Today",
                value: stats.onLeaveToday,
                icon: <Briefcase size={18} />,
                // trend: "0.9%",
                up: false,
                color: "orange",  
                sparkline: [100, 110, 120, stats.onLeaveToday],
              },
              {
                title: "Working Hours (mo.)",
                value: `${stats.totalWorkingHours}h`,
                icon: <Clock size={18} />,
                //   trend: "+12.8%",
                up: true,
                color: "cyan",
                sparkline: [7000, 7500, 8000, stats.totalWorkingHours],
              },
              {
                title: "Attendance Rate",
                value: `${stats.attendanceRate}%`,
                icon: <BarChart3 size={18} />,
                //  trend: "+4.6%",
                up: true,
                color: "indigo",
                sparkline: [88, 90, 91, stats.attendanceRate],
              },
            ].map((p) => (
              <StatCard key={p.title} subtitle="" {...p} />
            ))}
          </div>

          {/* Attendance Overview + Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Donut */}
            <SectionCard
              title="Attendance Overview"
              action={
                <select className="text-xs border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option>This Week</option>
                  <option>Last Week</option>
                  <option>This Month</option>
                </select>
              }
            >
              <div className="flex justify-center mb-5">
                <div className="relative w-44 h-44">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={72}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {COLORS.map((c, i) => (
                            <Cell key={i} fill={c} />
                          ))}
                        </Pie>
                      </RechartsPie>
                    </ResponsiveContainer>
                  )}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-2xl font-bold text-[var(--text-primary)]">
                      {total}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Employees
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-2.5">
                {[
                  { color: "bg-emerald-500", label: "Present", val: present },
                  { color: "bg-amber-500", label: "Absent", val: absent },
                  { color: "bg-violet-500", label: "On Leave", val: onLeave },
                  { color: "bg-blue-500", label: "Late", val: late },
                ].map(({ color, label, val }) => (
                  <LegendItem
                    key={label}
                    color={color}
                    label={label}
                    value={`${val} (${pct(val, total)}%)`}
                  />
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between text-lg">
                <span className="text-[var(--text-secondary)]">
                  Attendance Rate
                </span>
                <span className="font-bold text-[var(--text-primary)]">
                  {stats.attendanceRate}%
                </span>
              </div>
            </SectionCard>

            {/* Area Chart */}
            <SectionCard
              title="Attendance Trend"
              className="lg:col-span-2"
              action={
                ~(
                  <select className="text-xs border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    <option>This Month</option>
                    <option>Last Month</option>
                  </select>
                )
              }
            >
              <p className="text-xs text-[var(--text-muted)] -mt-3 mb-4">
                Daily attendance for the past 7 days
              </p>
              <div className="h-56">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend}>
                      <defs>
                        <linearGradient
                          id="gPresent"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#3b82f6"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3b82f6"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--border)"
                      />
                      <XAxis
                        dataKey="day"
                        stroke="var(--text-muted)"
                        tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                      />
                      <YAxis
                        stroke="var(--text-muted)"
                        tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                      />
                      <Tooltip
                        formatter={(v) => [v, "Present"]}
                        labelFormatter={(l) =>
                          trend.find((d) => d.day === l)?.fullLabel || l            
                        }
                        contentStyle={{
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          background: "var(--bg-surface)",
                          color: "var(--text-primary)",
                          fontSize: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="present"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#gPresent)"
                        fillOpacity={1}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-[var(--border)] text-center text-xs">
                <div>
                  <p className="text-[var(--text-muted)] mb-1">Best Day</p>
                  <p className="font-bold text-emerald-400">May 15</p>
                  <p className="text-[var(--text-muted)]">96.8%</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)] mb-1">Lowest Day</p>
                  <p className="font-bold text-rose-400">May 7</p>
                  <p className="text-[var(--text-muted)]">85.2%</p>
                </div>
                <div>
                  <p className="text-[var(--text-muted)] mb-1">Monthly Avg</p>
                  <p className="font-bold text-blue-400">
                    {stats.attendanceRate}%
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Department Summary + Recent Leaves Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Department Summary">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      {["Department", "Employees", "Present", "Rate"].map(
                        (h) => (
                          <th
                            key={h}
                            className="text-left py-2 px-2 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {deptSummary.slice(0, 5).map((d, i) => (
                      <tr
                        key={i}
                        className="border-b border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors"
                      >
                        <td className="py-2.5 px-2 text-[13px] text-[var(--text-primary)]">
                          {d.department}
                        </td>
                        <td className="py-2.5 px-2 text-[13px] text-[var(--text-secondary)]">
                          {d.employees}
                        </td>
                        <td className="py-2.5 px-2 text-[13px] text-[var(--text-secondary)]">
                          {d.presentToday}
                        </td>
                        <td className="py-2.5 px-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${RATE_COLOR(d.rate)}`}
                          >
                            {d.rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard title="Recent Leaves">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      {["Employee", "Typ e", "From", "To", "Status"].map((h) => (
                        <th
                          key={h}
                          className="text-left py-2 px-2 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentLeaves.map((l, i) => (
                      <tr
                        key={i}
                        className="border-b border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors"
                      >
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-xl bg-indigo-500/10 text-indigo-400 text-xs font-bold flex items-center justify-center">
                              {l.employee.charAt(0)}
                            </div>
                            <span className="text-[13px] text-[var(--text-primary)] truncate max-w-[80px]">
                              {l.employee}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-[13px] text-[var(--text-secondary)] whitespace-nowrap">
                          {l.leaveType}
                        </td>
                        <td className="py-2.5 px-2 text-[13px] text-[var(--text-secondary)]">
                          {l.from}
                        </td>
                        <td className="py-2.5 px-2 text-[13px] text-[var(--text-secondary)]">
                          {l.to}
                        </td>
                        <td className="py-2.5 px-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${LEAVE_COLOR(l.status)}`}
                          >
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>

          {/* Recent Leaves Calendar - Full Width */}
          <SectionCard title="Recent Leaves Calendar">
            <LeaveCalendar leaves={allLeaves} holidays={holidays} />
          </SectionCard>

          {/* Recent Activity */}
          <SectionCard
            title={
              <span className="flex items-center gap-2">
                <Activity size={16} className="text-indigo-400" />
                Recent System Activities
              </span>
            }
            action={
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse inline-block" />
                  Live
                </span>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-1.5 hover:bg-[var(--bg-elevated)] rounded-lg transition disabled:opacity-50"
                >
                  <RefreshCw
                    size={14}
                    className={`text-[var(--text-muted)] ${refreshing ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            }
          >
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {recentActivity.length > 0 ? (
                recentActivity.map((a) => (
                  <div
                    key={a.id}
                    className="flex gap-3 p-3 rounded-xl hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <div className="mt-1 w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[var(--text-primary)] font-medium">
                        {a.text}
                      </p>
                      {a.performedBy && (
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          by {a.performedBy}
                          {a.targetUser && ` → ${a.targetUser}`}
                          {a.department && ` (${a.department})`}
                        </p>
                      )}
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5 flex items-center gap-1">
                        <Clock size={10} />
                        {getTimeAgo(a.time)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-[var(--text-muted)] py-8 text-sm">
                  No recent activity
                </p>
              )}
            </div>
          </SectionCard>

          {/* Upcoming Birthdays */}
          <UpcomingBirthdays />

          {/* Quick Actions */}
          <SectionCard title="Quick Actions">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <QuickActionButton
                icon={<Users />}
                path="/superadmin/users"
                label="Add Employee"
                subtitle="Add new employee"
                color="blue"
              />
              <QuickActionButton
                icon={<UserCheck />}
                path="/superadmin/attendance"
                label="Mark Attendance"
                subtitle="Bulk mark attendance"
                color="green"
              />
              <QuickActionButton
                icon={<Building2 />}
                path="/superadmin/departments"
                label="Add Department"
                subtitle="Create new dept"
                color="purple"
              />
              <QuickActionButton
                icon={<BarChart3 />}
                path="/super-admin/employees/add"
                label="Generate Report"
                subtitle="Custom reports"
                color="indigo"
              />
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}

