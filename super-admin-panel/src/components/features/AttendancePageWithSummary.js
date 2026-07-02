"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  getMonthlyAttendanceApi,
  getAttendanceSummary,
} from "@/services/attandanceApi";
import {
  Calendar,
  Filter,
  RotateCcw,
  Zap,
  Target,
  BarChart3,
} from "lucide-react";
import { toast } from "react-toastify";

//  Constants 

const ITEMS_PER_PAGE = 5;
const MAX_VISIBLE_PAGES = 5;

//  Helpers 

const monthBounds = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parseInt(parts.find((p) => p.type === "year").value);
  const month = parseInt(parts.find((p) => p.type === "month").value);
  const last = new Date(year, month, 0).getDate();
  const pad = (n) => String(n).padStart(2, "0");
  return {
    first: `${year}-${pad(month)}-01`,
    last: `${year}-${pad(month)}-${pad(last)}`,
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
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const workHours = (checkIn, checkOut, breaks) => {
  if (!checkIn || !checkOut) return "—";
  const net =
    (new Date(checkOut) - new Date(checkIn)) / 60000 - breakMinutes(breaks);
  return minsToHM(net);
};

const pageNumbers = (current, total) => {
  if (total <= MAX_VISIBLE_PAGES)
    return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 4, "...", total];
  if (current >= total - 2)
    return [1, "...", total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
};

//  Status config 

const STATUS_MAP = {
  CHECKED_IN: {
    label: "Checked in",
    cls: "bg-blue-100   text-blue-700   border-blue-200",
  },
  CHECKED_OUT: {
    label: "Checked out",
    cls: "bg-green-100  text-green-700  border-green-200",
  },
  LATE: {
    label: "Late",
    cls: "bg-orange-100 text-orange-700 border-orange-200",
  },
  ON_BREAK: {
    label: "On break",
    cls: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  BACK_TO_WORK: {
    label: "Back to work",
    cls: "bg-cyan-100   text-cyan-700   border-cyan-200",
  },
  ON_LEAVE: {
    label: "On leave",
    cls: "bg-red-100    text-red-700    border-red-200",
  },
  HALF_DAY_LEAVE: {
    label: "Half day",
    cls: "bg-amber-100  text-amber-700  border-amber-200",
  },
};

//  Primitive UI pieces 

function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border
        ${cfg?.cls ?? "bg-slate-100 text-slate-600 border-slate-200"}`}
    >
      {cfg?.label ?? status?.replace(/_/g, " ") ?? "—"}
    </span>
  );
}

function PagBtn({ onClick, disabled, active, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2.5 py-1 text-xs rounded-md border transition-colors
        ${
          active
            ? "bg-blue-600 text-white border-blue-600"
            : "border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
        }`}
    >
      {children}
    </button>
  );
}

function MetricBadge({ icon: Icon, label, value, colorClass, borderClass }) {
  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border shadow-sm ${colorClass} ${borderClass}`}
    >
      <Icon className="w-4 h-4 text-slate-500 shrink-0" />
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide leading-none">
          {label}
        </p>
        <p className="text-base font-bold text-slate-700 leading-tight mt-0.5">
          {value}
        </p>
      </div>
    </div>
  );
}

function StatTile({ bg, border, label, value }) {
  return (
    <div
      className={`${bg} ${border} border-b-4 rounded-xl px-4 py-3 flex flex-col gap-1`}
    >
      <span className="text-xs font-medium text-white uppercase tracking-wide leading-none">
        {label}
      </span>
      <span className="text-xl font-bold text-white ">
        {value}
      </span>
    </div>
  );
}

//DateFilterBar

function DateFilterBar({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  onApply,
  onReset,
  loading,
}) {
  const fields = [
    {
      label: "Start date",
      value: startDate,
      set: setStartDate,
      accent: "cyan",
    },
    { label: "End date", value: endDate, set: setEndDate, accent: "purple" },
  ];

  return (
    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 mt-4">
      <div className="flex flex-wrap gap-3 items-end">
        {fields.map(({ label, value, set, accent }) => (
          <div key={label} className="flex-1 min-w-[148px]">
            <label
              className={`flex items-center gap-1 text-xs font-semibold text-${accent}-700 mb-1.5`}
            >
              <Calendar className="w-3 h-3" />
              {label}
            </label>
            <input
              type="date"
              value={value}
              onChange={(e) => set(e.target.value)}
              className={`w-full bg-white border-2 border-slate-200 text-slate-900 text-sm
                px-3 py-1.5 rounded-lg transition-all
                focus:outline-none focus:border-${accent}-500 focus:ring-2 focus:ring-${accent}-100`}
            />
          </div>
        ))}

        <div className="flex gap-2 shrink-0">
          <button
            onClick={onApply}
            disabled={loading}
            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600
              hover:from-cyan-600 hover:to-blue-700 text-white text-sm px-4 py-1.5 rounded-lg
              font-semibold shadow-sm disabled:opacity-50 transition-all"
          >
            <Filter className="w-3.5 h-3.5" />
            Apply
          </button>
          <button
            onClick={onReset}
            disabled={loading}
            className="flex items-center gap-1.5 bg-slate-600 hover:bg-slate-700
              text-white text-sm px-4 py-1.5 rounded-lg font-semibold shadow-sm
              disabled:opacity-50 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

//  AttendanceTable

function AttendanceTable({ pageRecords, loading }) {
  const headers = [
    { label: "Date", mobile: true },
    { label: "Check in", mobile: true },
    { label: "Check out", mobile: true },
    { label: "Break", mobile: false }, // hidden on small screens
    { label: "Work hours", mobile: true },
    { label: "Status", mobile: true },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Table head */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {headers.map(({ label, mobile }) => (
                <th
                  key={label}
                  className={`px-4 py-2.5 text-left text-xs font-semibold text-slate-500
                    uppercase tracking-wide whitespace-nowrap
                    ${!mobile ? "hidden sm:table-cell" : ""}`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="text-center py-12 text-slate-400 text-sm"
                >
                  <span className="inline-flex items-center gap-2">
                    <svg
                      className="animate-spin w-4 h-4 text-slate-400"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Loading records…
                  </span>
                </td>
              </tr>
            ) : pageRecords.length > 0 ? (
              pageRecords.map((item) => (
                <tr
                  key={item._id}
                  className="hover:bg-slate-50/70 transition-colors"
                >
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                    {new Date(item.date).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap tabular-nums">
                    {formatTime(item.checkIn)}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap tabular-nums">
                    {formatTime(item.checkOut)}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap hidden sm:table-cell tabular-nums">
                    {minsToHM(breakMinutes(item.breaks))}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap tabular-nums">
                    {workHours(item.checkIn, item.checkOut, item.breaks)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={headers.length}
                  className="text-center py-12 text-slate-400 text-sm"
                >
                  No records found for this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

//Pagination

function Pagination({
  currentPage,
  totalPages,
  pages,
  total,
  startIndex,
  setCurrentPage,
}) {
  if (!total) return null;

  const end = Math.min(startIndex + ITEMS_PER_PAGE, total);

  return (
    <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
      <p className="text-xs text-slate-500 order-2 sm:order-1">
        Showing{" "}
        <span className="font-medium text-slate-700">
          {startIndex + 1}–{end}
        </span>{" "}
        of <span className="font-medium text-slate-700">{total}</span>
      </p>

      <div className="flex gap-1 flex-wrap justify-center order-1 sm:order-2">
        <PagBtn
          onClick={() => setCurrentPage((p) => p - 1)}
          disabled={currentPage === 1}
        >
          ← Prev
        </PagBtn>
        {pages.map((p, i) =>
          p === "..." ? (
            <span
              key={`e${i}`}
              className="px-2 py-1 text-slate-400 text-xs self-center select-none"
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
          Next →
        </PagBtn>
      </div>
    </div>
  );
}

//Page

export default function AttendancePage() {
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const abortRef = useRef(null);
  const reqIdRef = useRef(0);

  //  Data fetching

  const fetchData = useCallback(async (from, to) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const id = ++reqIdRef.current;

    setLoading(true);
    try {
      const [attRes, sumRes] = await Promise.all([
        getMonthlyAttendanceApi(from, to),
        getAttendanceSummary(from, to),
      ]);
      if (id !== reqIdRef.current) return;
      setAttendance(attRes.data);
      setSummary(sumRes.data);
      setStartDate(from);
      setEndDate(to);
      setCurrentPage(1);
    } catch (err) {
      if (err.name !== "AbortError" && id === reqIdRef.current)
        toast.error("Failed to load attendance data.");
    } finally {
      if (id === reqIdRef.current) setLoading(false);
    }
  }, []);

  const fetchCurrentMonth = useCallback(() => {
    const { first, last } = monthBounds();
    fetchData(first, last);
  }, [fetchData]);

  const handleApply = useCallback(() => {
    if (!startDate || !endDate) return toast.error("Select both dates.");
    fetchData(startDate, endDate);
  }, [fetchData, startDate, endDate]);

  useEffect(() => {
    fetchCurrentMonth();
    return () => abortRef.current?.abort();
  }, [fetchCurrentMonth]);

  // ── Derived / display values

  const sorted = useMemo(
    () => [...attendance].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [attendance],
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageRecords = sorted.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const pages = useMemo(
    () => pageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );

  const avgWorkHours = summary?.avgWorkHours ?? 0;
  const lateCount = summary?.lateCount ?? 0;

  const pct = (n) =>
    summary?.totalDays
      ? `${Math.round((n / summary.totalDays) * 100)}% (${n})`
      : `0% (0)`;

  return (
    <div className="space-y-4 px-4 sm:px-6 pb-10">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
          {/* Title + metric badges */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow shrink-0">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight">
                  Attendance dashboard 
                </h1>
                <p className="text-slate-500 text-sm mt-0.5">
                  Monitor your work patterns and productivity 
                </p>
              </div>
            </div>

            {summary && (
              <div className="flex flex-wrap gap-2 sm:shrink-0">
                <MetricBadge
                  icon={Target}
                  label="Attendance rate"
                  value={`${summary.productivity}%`}
                  colorClass="bg-gradient-to-br from-cyan-50 to-blue-50"
                  borderClass="border-cyan-200"
                />
                <MetricBadge
                  icon={Zap}
                  label="Avg hours/day"
                  value={`${avgWorkHours}h`}
                  colorClass="bg-gradient-to-br from-yellow-50 to-orange-50"
                  borderClass="border-yellow-200"
                />
              </div>
            )}
          </div>

          {/* Date filter */}
          <DateFilterBar
            startDate={startDate}
            endDate={endDate}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            onApply={handleApply}
            onReset={fetchCurrentMonth}
            loading={loading}
          />
        </div>

        {/* Stats grid */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile
              bg="bg-pink-400"
              border="border-pink-500"
              label="Days present"
              value={summary.present}
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
              value={pct(summary.absent)}
            />
            <StatTile
              bg="bg-yellow-400"
              border="border-yellow-500"
              label="Half day"
              value={summary.halfDay}
            />
            <StatTile
              bg="bg-green-600"
              border="border-green-700"
              label="Total office"
              value={`${Math.floor(summary.totalOfficeHours)}h`}
            />
            <StatTile
              bg="bg-indigo-600"
              border="border-indigo-700"
              label="Total worked"
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
              label="PL leaves"
              value={summary.leaves || 0}
            />
          </div>
        )}

        {/*Table + pagination */}
        <div>
          <div className="bg-slate-50 px-1 py-2">
            <h2 className="text-sm font-semibold text-slate-600 px-1">
              Attendance records
            </h2>
          </div>

          <AttendanceTable pageRecords={pageRecords} loading={loading} />

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pages={pages}
            total={sorted.length}
            startIndex={startIndex}
            setCurrentPage={setCurrentPage}
          />
        </div>
    </div>
  );
}
