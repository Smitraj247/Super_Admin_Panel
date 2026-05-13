"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  getMonthlyAttendanceApi,
  getAttendanceSummary,
} from "@/services/attandanceApi";
import { getUserLeavesApi } from "@/services/leaveApi";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import {
  Calendar,
  Filter,
  RotateCcw,
  Zap,
  Target,
  BarChart3,
} from "lucide-react";

export default function AttendancePageWithSummary() {
  const [attendance, setAttendance] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Track the latest request to prevent race conditions
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef(null);

  const fetchCurrentMonth = useCallback(async () => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const currentRequestId = ++requestIdRef.current;

    setLoading(true);
    try {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0];

      const [attendanceRes, summaryRes, leavesRes] = await Promise.all([
        getMonthlyAttendanceApi(firstDay, lastDay),
        getAttendanceSummary(firstDay, lastDay),
        getUserLeavesApi(),
      ]);

      // Only update state if this is still the latest request
      if (currentRequestId === requestIdRef.current) {
        setAttendance(attendanceRes.data);
        setSummary(summaryRes.data);
        setLeaves(leavesRes.data.data || []);
        setStartDate(firstDay);
        setEndDate(lastDay);
      }
    } catch (err) {
      // Ignore abort errors
      if (
        err.name !== "AbortError" &&
        currentRequestId === requestIdRef.current
      ) {
        console.error(err);
      }
    } finally {
      // Only clear loading if this is still the latest request
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchCurrentMonth();

    // Cleanup: abort any pending requests when component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchCurrentMonth]);

  const handleFilter = useCallback(async () => {
    if (!startDate || !endDate) {
      alert("Select both dates");
      return;
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    const currentRequestId = ++requestIdRef.current;

    setLoading(true);
    setCurrentPage(1);
    try {
      const [attendanceRes, summaryRes, leavesRes] = await Promise.all([
        getMonthlyAttendanceApi(startDate, endDate),
        getAttendanceSummary(startDate, endDate),
        getUserLeavesApi(),
      ]);

      // Only update state if this is still the latest request
      if (currentRequestId === requestIdRef.current) {
        setAttendance(attendanceRes.data);
        setSummary(summaryRes.data);
        setLeaves(leavesRes.data.data || []);
      }
    } catch (err) {
      // Ignore abort errors
      if (
        err.name !== "AbortError" &&
        currentRequestId === requestIdRef.current
      ) {
        console.error(err);
      }
    } finally {
      // Only clear loading if this is still the latest request
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [startDate, endDate]);

  const formatTime = useCallback((dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const calculateWorkingHours = useCallback((checkIn, checkOut, breaks) => {
    if (!checkIn || !checkOut) return "-";

    let workMinutes = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60);

    if (breaks?.length > 0) {
      breaks.forEach((brk) => {
        if (brk.breakIn && brk.breakOut) {
          const breakMinutes =
            (new Date(brk.breakOut) - new Date(brk.breakIn)) / (1000 * 60);
          workMinutes -= breakMinutes;
        }
      });
    }

    const hours = Math.floor(workMinutes / 60);
    const mins = Math.floor(workMinutes % 60);
    return `${hours}h ${mins}m`;
  }, []);

  const formatBreakTime = useCallback((breaks) => {
    if (!breaks?.length) return "0h";

    let totalBreakMinutes = 0;
    breaks.forEach((brk) => {
      if (brk.breakIn && brk.breakOut) {
        totalBreakMinutes +=
          (new Date(brk.breakOut) - new Date(brk.breakIn)) / (1000 * 60);
      }
    });

    const hours = Math.floor(totalBreakMinutes / 60);
    const mins = Math.floor(totalBreakMinutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }, []);

  const { totalPages, startIndex, endIndex, currentAttendance } =
    useMemo(() => {
      // Sort attendance in reverse chronological order (newest first)
      const sortedAttendance = [...attendance].sort(
        (a, b) => new Date(b.date) - new Date(a.date),
      );

      const totalPages = Math.ceil(sortedAttendance.length / itemsPerPage);
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const currentAttendance = sortedAttendance.slice(startIndex, endIndex);

      return { totalPages, startIndex, endIndex, currentAttendance };
    }, [attendance, currentPage, itemsPerPage]);

  const handlePageChange = useCallback(
    (page) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
      }
    },
    [totalPages],
  );

  const getPageNumbers = useMemo(() => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  }, [currentPage, totalPages]);

  // Calculate late count from attendance records
  const lateCount = useMemo(() => {
    return attendance.filter((record) => record.isLate === true).length;
  }, [attendance]);

  // Calculate PL leaves taken in the date range
  const plLeavesTaken = useMemo(() => {
    if (!startDate || !endDate || !leaves.length) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);

    return leaves
      .filter((leave) => {
        if (leave.status !== "APPROVED" || leave.leaveType !== "PL")
          return false;

        const leaveStart = new Date(leave.fromDate);
        const leaveEnd = new Date(leave.toDate);

        // Check if leave overlaps with the date range
        return leaveStart <= end && leaveEnd >= start;
      })
      .reduce((total, leave) => {
        // Calculate days in the range
        const leaveStart = new Date(leave.fromDate);
        const leaveEnd = new Date(leave.toDate);
        const rangeStart = leaveStart < start ? start : leaveStart;
        const rangeEnd = leaveEnd > end ? end : leaveEnd;

        const days =
          Math.ceil((rangeEnd - rangeStart) / (1000 * 60 * 60 * 24)) + 1;
        return total + (leave.isHalfDay ? 0.5 : days);
      }, 0);
  }, [leaves, startDate, endDate]);

  // Calculate metrics
  const attendanceRate = summary
    ? Math.round((summary.present / summary.totalDays) * 100)
    : 0;
  const avgWorkHours = summary
    ? (summary.totalWorkHours / summary.totalDays).toFixed(1)
    : 0;

  // Calculate approved leaves within the date range
  const approvedLeavesInRange = useMemo(() => {
    if (!startDate || !endDate || !leaves.length) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);

    return leaves
      .filter((leave) => {
        if (leave.status !== "APPROVED") return false;

        const leaveStart = new Date(leave.fromDate);
        const leaveEnd = new Date(leave.toDate);

        // Check if leave overlaps with the date range
        return leaveStart <= end && leaveEnd >= start;
      })
      .reduce((total, leave) => {
        // Calculate days in the range
        const leaveStart = new Date(leave.fromDate);
        const leaveEnd = new Date(leave.toDate);
        const rangeStart = leaveStart < start ? start : leaveStart;
        const rangeEnd = leaveEnd > end ? end : leaveEnd;

        const days =
          Math.ceil((rangeEnd - rangeStart) / (1000 * 60 * 60 * 24)) + 1;
        return total + (leave.isHalfDay ? 0.5 : days);
      }, 0);
  }, [leaves, startDate, endDate]);

  // Calculate actual absent (excluding approved leaves)
  const actualAbsent = summary
    ? Math.max(0, summary.absent - approvedLeavesInRange)
    : 0;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      {/* {open && (
        <div className="fixed inset-0 z-50 bg-black/60 md:hidden backdrop-blur-md">
          <div className="w-64 bg-white h-full shadow-2xl p-4 border-r border-slate-200">
            <button
              onClick={() => setOpen(false)}
              className="mb-4 text-slate-600 hover:text-slate-900 transition-colors"
            >
              Close
            </button>
            <Sidebar />
          </div>
        </div>
      )} */}

      <div className="flex-1 flex flex-col md:ml-64">
        <Navbar />

        <div className="p-4 md:p-6 space-y-4 mt-20">
          {/* Hero Dashboard Header */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl blur-3xl"></div>

            <div className="relative bg-white rounded-2xl shadow-lg p-4 border border-slate-200">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl blur-lg opacity-60 animate-pulse"></div>
                    <div className="relative p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Attendance Dashboard
                    </h1>
                    <p className="text-slate-600 text-sm mt-1">
                      Monitor your work patterns and productivity metrics
                    </p>
                  </div>
                </div>

                {summary && (
                  <div className="flex gap-3">
                    <div className="bg-gradient-to-br from-cyan-50 to-blue-50 backdrop-blur-sm rounded-xl px-3 py-2 border border-cyan-200 hover:border-cyan-300 transition-all shadow-sm">
                      <div className="flex items-center space-x-2">
                        <Target className="w-4 h-4 text-cyan-600" />
                        <div>
                          <p className="text-xs text-slate-600 uppercase tracking-wider font-semibold">
                            Attendance Rate
                          </p>
                          <p className="text-lg font-bold text-slate-900">
                            {attendanceRate}%
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 backdrop-blur-sm rounded-xl px-3 py-2 border border-yellow-200 hover:border-yellow-300 transition-all shadow-sm">
                      <div className="flex items-center space-x-2">
                        <Zap className="w-4 h-4 text-yellow-600" />
                        <div>
                          <p className="text-xs text-slate-600 uppercase tracking-wider font-semibold">
                            Avg Hours/Day
                          </p>
                          <p className="text-lg font-bold text-slate-900">
                            {avgWorkHours}h
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Date Filter */}
              <div className="bg-slate-50 backdrop-blur-sm rounded-xl p-4 border border-slate-200">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[180px]">
                    <label className="flex items-center space-x-2 text-xs font-semibold text-cyan-700 mb-2">
                      <Calendar className="w-3 h-3" />
                      <span>Start Date</span>
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-white border-2 border-slate-300 text-slate-900 text-sm p-2 rounded-lg focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all"
                    />
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <label className="flex items-center space-x-2 text-xs font-semibold text-purple-700 mb-2">
                      <Calendar className="w-3 h-3" />
                      <span>End Date</span>
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-white border-2 border-slate-300 text-slate-900 text-sm p-2 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                    />
                  </div>
                  <button
                    onClick={handleFilter}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:from-cyan-600 hover:to-blue-700 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transform hover:scale-105 transition-all duration-200 font-semibold flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    <Filter className="w-4 h-4" />
                    <span>Apply Filter</span>
                  </button>
                  <button
                    onClick={fetchCurrentMonth}
                    className="bg-slate-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-slate-700 shadow-lg transform hover:scale-105 transition-all duration-200 font-semibold flex items-center space-x-2 border border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Days */}
              <div className="bg-pink-400 border border-pink-500 p-3 text-center">
                <div className="text-xs text-white mb-1">Days</div>
                <div className="text-2xl font-semibold text-white">
                  {summary.totalDays}
                </div>
              </div>

              {/* Late */}
              <div className="bg-orange-500 border border-orange-600 p-3 text-center">
                <div className="text-xs text-white mb-1">Late</div>
                <div className="text-2xl font-semibold text-white">
                  {summary && lateCount > 0
                    ? `${Math.round((lateCount / summary.totalDays) * 100)}%(${lateCount})`
                    : "0%(0)"}
                </div>
              </div>

              {/* Absent */}
              <div className="bg-cyan-400 border border-cyan-500 p-3 text-center">
                <div className="text-xs text-white mb-1">Absent</div>
                <div className="text-2xl font-semibold text-white">
                  {actualAbsent > 0
                    ? `${Math.round((actualAbsent / summary.totalDays) * 100)}%(${actualAbsent})`
                    : "0%(0)"}
                </div>
              </div>

              {/* Half day */}
              <div className="bg-yellow-400 border border-yellow-500 p-3 text-center">
                <div className="text-xs text-white mb-1">Half day</div>
                <div className="text-2xl font-semibold text-white">
                  {summary.halfDay}
                </div>
              </div>

              {/* Total Office */}
              <div className="bg-green-600 border border-green-700 p-3 text-center">
                <div className="text-xs text-white mb-1">Total Office</div>
                <div className="text-2xl font-semibold text-white">
                  {summary.totalOfficeHours}hrs{" "}
                  {((summary.totalOfficeHours % 1) * 60).toFixed(0)}mins
                </div>
              </div>

              {/* Total Worked */}
              <div className="bg-indigo-600 border border-indigo-700 p-3 text-center">
                <div className="text-xs text-white mb-1">Total Worked</div>
                <div className="text-2xl font-semibold text-white">
                  {Math.floor(summary.totalWorkHours)}hrs{" "}
                  {Math.round((summary.totalWorkHours % 1) * 60)}mins
                </div>
              </div>

              {/* Productivity Ratio */}
              <div className="bg-green-500 border border-green-600 p-3 text-center">
                <div className="text-xs text-white mb-1">
                  Productivity Ratio
                </div>
                <div className="text-2xl font-semibold text-white">
                  {summary.productivity}%
                </div>
              </div>

              {/* Total PL Leaves */}
              <div className="bg-green-700 border border-green-800 p-3 text-center">
                <div className="text-xs text-white mb-1">Total PL Leaves</div>
                <div className="text-2xl font-semibold text-white">
                  {plLeavesTaken > 0 ? plLeavesTaken : "0"}
                </div>
              </div>
            </div>
          )}

          {/* Attendance Records Table */}
          <div className="bg-white border border-gray-300 overflow-hidden mt-4">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
              <h2 className="font-medium text-gray-900">Attendance Records</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-300">
                  <tr>
                    <th className="p-3 text-left font-medium text-gray-700">
                      Date
                    </th>
                    <th className="p-3 text-left font-medium text-gray-700">
                      Check In
                    </th>
                    <th className="p-3 text-left font-medium text-gray-700">
                      Check Out
                    </th>
                    <th className="p-3 text-left font-medium text-gray-700">
                      Break Time
                    </th>
                    <th className="p-3 text-left font-medium text-gray-700">
                      Work Hours
                    </th>
                    <th className="p-3 text-left font-medium text-gray-700">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="text-center p-8 text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : currentAttendance.length > 0 ? (
                    currentAttendance.map((item) => (
                      <tr key={item._id} className="hover:bg-gray-50">
                        <td className="p-3 text-gray-900">
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
                          {formatBreakTime(item.breaks)}
                        </td>
                        <td className="p-3 text-gray-900">
                          {calculateWorkingHours(
                            item.checkIn,
                            item.checkOut,
                            item.breaks,
                          )}
                        </td>
                        <td className="p-3 text-gray-700">
                          {item.status.replace(/_/g, " ")}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center p-8 text-gray-500">
                        No attendance records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {attendance.length > 0 && (
              <div className="bg-gray-50 border-t border-gray-300 p-3">
                <div className="flex flex-col md:flex-row justify-between items-center gap-3">
                  <div className="text-xs text-gray-600">
                    Showing {startIndex + 1} to{" "}
                    {Math.min(endIndex, currentAttendance.length + startIndex)}{" "}
                    of {attendance.length} entries
                  </div>
                  <div className="flex gap-2 flex-wrap justify-center">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 bg-gray-200 border border-gray-300 text-gray-700 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>

                    {getPageNumbers.map((page, index) =>
                      page === "..." ? (
                        <span
                          key={`ellipsis-${index}`}
                          className="px-2 py-1 text-gray-400 text-sm"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`px-3 py-1 text-sm ${
                            currentPage === page
                              ? "bg-gray-700 text-white border border-gray-700"
                              : "bg-gray-200 text-gray-700 border border-gray-300"
                          }`}
                        >
                          {page}
                        </button>
                      ),
                    )}

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 bg-gray-200 border border-gray-300 text-gray-700 text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
