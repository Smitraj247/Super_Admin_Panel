"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  getMonthlyAttendanceApi,
  getAttendanceSummary,
} from "@/services/attandanceApi";
import { getUserLeavesApi } from "@/services/leaveApi";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/Sidebar";
import {
  Calendar,
  Filter,
  RotateCcw,
  Zap,
  Target,
  BarChart3,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 5;
const MAX_VISIBLE_PAGES = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const formatTime = (d) =>
  d
    ? new Date(d).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const breakMinutes = (breaks = []) =>
  breaks.reduce((acc, b) => {
    if (b.breakIn && b.breakOut)
      acc += (new Date(b.breakOut) - new Date(b.breakIn)) / 60000;
    return acc;
  }, 0);

const minsToHM = (mins) => {
  const h = Math.floor(mins / 60),
    m = Math.floor(mins % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const workHours = (checkIn, checkOut, breaks) => {
  if (!checkIn || !checkOut) return "—";
  const net =
    (new Date(checkOut) - new Date(checkIn)) / 60000 - breakMinutes(breaks);
  return minsToHM(net);
};

/** Count leave days that overlap [start, end] for given status/type filters */
const countLeaveDays = (leaves, start, end, { status, leaveType } = {}) => {
  const s = new Date(start),
    e = new Date(end);
  return leaves
    .filter((l) => {
      if (status && l.status !== status) return false;
      if (leaveType && l.leaveType !== leaveType) return false;
      return new Date(l.fromDate) <= e && new Date(l.toDate) >= s;
    })
    .reduce((total, l) => {
      const from = new Date(l.fromDate),
        to = new Date(l.toDate);
      const clampStart = from < s ? s : from;
      const clampEnd = to > e ? e : to;
      const days = Math.ceil((clampEnd - clampStart) / 86400000) + 1;
      return total + (l.isHalfDay ? 0.5 : days);
    }, 0);
};

const pageNumbers = (current, total) => {
  if (total <= MAX_VISIBLE_PAGES)
    return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, "...", total];
  if (current >= total - 2)
    return [1, "...", total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
};

// ─── Sub-components

const StatTile = ({ bg, border, label, value }) => (
  <div className={`${bg} ${border} border p-3 text-center rounded`}>
    <p className="text-xs text-white mb-1">{label}</p>
    <p className="text-xl sm:text-2xl font-semibold text-white">{value}</p>
  </div>
);

const MetricBadge = ({ icon: Icon, label, value, colorClass, borderClass }) => (
  <div
    className={`${colorClass} rounded-xl px-3 py-2 border ${borderClass} shadow-sm`}
  >
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 shrink-0" />
      <div>
        <p className="text-xs text-slate-600 uppercase tracking-wider font-semibold">
          {label}
        </p>
        <p className="text-lg font-bold text-slate-900">{value}</p>
      </div>
    </div>
  </div>
);

// ─── Main Component 

export default function AttendancePage() {
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const abortRef = useRef(null);
  const requestRef = useRef(0);

  // ── Fetch 

  const fetch = useCallback(async (from, to) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const id = ++requestRef.current;

    setLoading(true);
    try {
      const [attRes, sumRes, lvRes] = await Promise.all([
        getMonthlyAttendanceApi(from, to),
        getAttendanceSummary(from, to),
        getUserLeavesApi(),
      ]);

      if (id !== requestRef.current) return;
      setAttendance(attRes.data);
      setSummary(sumRes.data);
      setLeaves(lvRes.data.data || []);
      setStartDate(from);
      setEndDate(to);
      setCurrentPage(1);
    } catch (err) {
      if (err.name !== "AbortError" && id === requestRef.current)
        console.error("Attendance fetch:", err);
    } finally {
      if (id === requestRef.current) setLoading(false);
    }
  }, []);

  const fetchCurrentMonth = useCallback(() => {
    const { first, last } = monthBounds();
    fetch(first, last);
  }, [fetch]);

  const handleFilter = useCallback(() => {
    if (!startDate || !endDate) return alert("Select both dates");
    fetch(startDate, endDate);
  }, [fetch, startDate, endDate]);

  useEffect(() => {
    fetchCurrentMonth();
    return () => abortRef.current?.abort();
  }, [fetchCurrentMonth]);

  // ── Derived values 

  const sorted = useMemo(
    () => [...attendance].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [attendance],
  );

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageRecords = sorted.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const pages = useMemo(
    () => pageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );

  const lateCount = useMemo(
    () => attendance.filter((r) => r.isLate).length,
    [attendance],
  );
  const approvedLeaves = useMemo(
    () => countLeaveDays(leaves, startDate, endDate, { status: "APPROVED" }),
    [leaves, startDate, endDate],
  );
  const plLeaves = useMemo(
    () =>
      countLeaveDays(leaves, startDate, endDate, {
        status: "APPROVED",
        leaveType: "PL",
      }),
    [leaves, startDate, endDate],
  );
  const actualAbsent = summary
    ? Math.max(0, summary.absent - approvedLeaves)
    : 0;
  const attendanceRate = summary
    ? Math.round((summary.present / summary.totalDays) * 100)
    : 0;
  const avgWorkHours = summary
    ? (summary.totalWorkHours / summary.totalDays).toFixed(1)
    : 0;

  const pct = (n) =>
    summary ? `${Math.round((n / summary.totalDays) * 100)}%(${n})` : "0%(0)";

  // ── Render

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-64">
        <Navbar />

        <div className="p-4 md:p-6 space-y-4 mt-14">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Attendance Dashboard
                  </h1>
                  <p className="text-slate-500 text-sm">
                    Monitor your work patterns and productivity
                  </p>
                </div>
              </div>

              {summary && (
                <div className="flex gap-3 flex-wrap">
                  <MetricBadge
                    icon={Target}
                    label="Attendance Rate"
                    value={`${attendanceRate}%`}
                    colorClass="bg-gradient-to-br from-cyan-50 to-blue-50"
                    borderClass="border-cyan-200"
                  />
                  <MetricBadge
                    icon={Zap}
                    label="Avg Hours/Day"
                    value={`${avgWorkHours}h`}
                    colorClass="bg-gradient-to-br from-yellow-50 to-orange-50"
                    borderClass="border-yellow-200"
                  />
                </div>
              )}
            </div>

            {/* Date Filter */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <div className="flex flex-wrap gap-3 items-end">
                {[
                  {
                    label: "Start Date",
                    value: startDate,
                    set: setStartDate,
                    accent: "cyan",
                  },
                  {
                    label: "End Date",
                    value: endDate,
                    set: setEndDate,
                    accent: "purple",
                  },
                ].map(({ label, value, set, accent }) => (
                  <div key={label} className="flex-1 min-w-[160px]">
                    <label
                      className={`flex items-center gap-1.5 text-xs font-semibold text-${accent}-700 mb-1.5`}
                    >
                      <Calendar className="w-3 h-3" />
                      {label}
                    </label>
                    <input
                      type="date"
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      className={`w-full bg-white border-2 border-slate-300 text-slate-900 text-sm p-2 rounded-lg focus:outline-none focus:border-${accent}-500 focus:ring-2 focus:ring-${accent}-200 transition-all`}
                    />
                  </div>
                ))}
                <button
                  onClick={handleFilter}
                  disabled={loading}
                  className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:from-cyan-600 hover:to-blue-700 font-semibold shadow disabled:opacity-50 transition-all"
                >
                  <Filter className="w-4 h-4" /> Apply
                </button>
                <button
                  onClick={fetchCurrentMonth}
                  disabled={loading}
                  className="flex items-center gap-2 bg-slate-600 hover:bg-slate-700 text-white text-sm px-4 py-2 rounded-lg font-semibold shadow disabled:opacity-50 transition-all"
                >
                  <RotateCcw className="w-4 h-4" /> Reset
                </button>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatTile
                bg="bg-pink-400"
                border="border-pink-500"
                label="Days"
                value={summary.totalDays}
              />
              <StatTile
                bg="bg-orange-500"
                border="border-orange-600"
                label="Late"
                value={pct(lateCount)}
              />
              <StatTile
                bg="bg-cyan-400"
                border="border-cyan-500"
                label="Absent"
                value={pct(actualAbsent)}
              />
              <StatTile
                bg="bg-yellow-400"
                border="border-yellow-500"
                label="Half Day"
                value={summary.halfDay}
              />
              <StatTile
                bg="bg-green-600"
                border="border-green-700"
                label="Total Office"
                value={`${summary.totalOfficeHours}h ${((summary.totalOfficeHours % 1) * 60).toFixed(0)}m`}
              />
              <StatTile
                bg="bg-indigo-600"
                border="border-indigo-700"
                label="Total Worked"
                value={`${Math.floor(summary.totalWorkHours)}h ${Math.round((summary.totalWorkHours % 1) * 60)}m`}
              />
              <StatTile
                bg="bg-green-500"
                border="border-green-600"
                label="Productivity"
                value={`${summary.productivity}%`}
              />
              <StatTile
                bg="bg-green-700"
                border="border-green-800"
                label="PL Leaves"
                value={plLeaves || "0"}
              />
            </div>
          )}

          {/* Table */}
          <div className="bg-white border border-gray-300 rounded overflow-hidden">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
              <h2 className="font-medium text-gray-900">Attendance Records</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-300">
                  <tr>
                    {[
                      "Date",
                      "Check In",
                      "Check Out",
                      "Break",
                      "Work Hours",
                      "Status",
                    ].map((h) => (
                      <th
                        key={h}
                        className="p-3 text-left font-medium text-gray-700 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-gray-500">
                        Loading…
                      </td>
                    </tr>
                  ) : pageRecords.length > 0 ? (
                    pageRecords.map((item) => (
                      <tr
                        key={item._id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="p-3 text-gray-900 whitespace-nowrap">
                          {new Date(item.date).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="p-3 text-gray-900">
                          {formatTime(item.checkIn)}
                        </td>
                        <td className="p-3 text-gray-900">
                          {formatTime(item.checkOut)}
                        </td>
                        <td className="p-3 text-gray-900">
                          {minsToHM(breakMinutes(item.breaks))}
                        </td>
                        <td className="p-3 text-gray-900">
                          {workHours(item.checkIn, item.checkOut, item.breaks)}
                        </td>
                        <td className="p-3 text-gray-700">
                          {item.status.replace(/_/g, " ")}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-gray-500">
                        No records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {attendance.length > 0 && (
              <div className="bg-gray-50 border-t border-gray-300 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-gray-600">
                  Showing {startIndex + 1}–
                  {Math.min(startIndex + ITEMS_PER_PAGE, sorted.length)} of{" "}
                  {sorted.length}
                </p>
                <div className="flex gap-1.5 flex-wrap justify-center">
                  <PagBtn
                    onClick={() => setCurrentPage((p) => p - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </PagBtn>
                  {pages.map((p, i) =>
                    p === "..." ? (
                      <span
                        key={`e${i}`}
                        className="px-2 py-1 text-gray-400 text-sm"
                      >
                        …
                      </span>
                    ) : (
                      <PagBtn
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        active={currentPage === p}
                      >
                        {p}
                      </PagBtn>
                    ),
                  )}
                  <PagBtn
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </PagBtn>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Tiny pagination button

const PagBtn = ({ onClick, disabled, active, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-3 py-1 text-sm border transition-colors
      ${
        active
          ? "bg-gray-700 text-white border-gray-700"
          : "bg-gray-200 text-gray-700 border-gray-300 hover:bg-gray-300"
      }
      disabled:opacity-30 disabled:cursor-not-allowed`}
  >
    {children}
  </button>
);
