"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/Sidebar";

import {
  getUserAttendanceByIdApi,
  updateAttendanceApi,
  getUserSummaryByIdApi,
  adminCreateBreakEntryApi,
  adminCreateAttendanceEntryApi,
} from "@/services/attandanceApi";

import { getUsersApi, getAdminsApi } from "@/services/adminApi";

import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Download,
  Edit,
  PlayCircle,
  Plus,
  StopCircle,
  User,
  XCircle,
  Briefcase,
} from "lucide-react";
import { toast } from "react-toastify";

import { STATUS, MONTHS, ROWS_PER_PAGE_OPTIONS } from "@/constants/attendance";
import {
  toDateStr,
  getMonthRange,
  formatDateTimeLocal,
  formatTime,
  calculateBreakMinutes,
  formatBreakTime,
  calculateWorkingHours,
  getTodayStr,
} from "@/utils/attendanceHelpers";
import SummaryCard from "@/components/features/attendance/SummaryCard";
import TableHead from "@/components/features/attendance/TableHead";
import StatusBadge from "@/components/features/attendance/StatusBadge";

// MAIN COMPONENT

export default function HRUserAttendanceDetail() {
  const params = useParams();
  const router = useRouter();

  const userId = params.userId;
  const currentDate = new Date();

  const [user, setUser] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState(null);

  const [selectedMonth, setSelectedMonth] = useState(
    String(currentDate.getMonth() + 1).padStart(2, "0"),
  );
  const [selectedYear, setSelectedYear] = useState(
    String(currentDate.getFullYear()),
  );
  const [loading, setLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const [showAddBreakModal, setShowAddBreakModal] = useState(false);
  const [addBreakForm, setAddBreakForm] = useState({
    date: getTodayStr(),
    breakIn: "",
    breakOut: "",
  });

  const [showAddAttendanceModal, setShowAddAttendanceModal] = useState(false);
  const [addAttendanceForm, setAddAttendanceForm] = useState({
    date: getTodayStr(),
    checkIn: "",
    checkOut: "",
  });

  const years = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  }, []);

  // Pagination calculations
  const totalRecords = attendance.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / rowsPerPage));
  const paginatedAttendance = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return attendance.slice(start, start + rowsPerPage);
  }, [attendance, currentPage, rowsPerPage]);

  // Reset to page 1 when filters or rows-per-page change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth, selectedYear, rowsPerPage]);

  // FETCH USER DATA

  const fetchUserData = useCallback(async () => {
    try {
      const [usersRes, adminsRes] = await Promise.all([
        getUsersApi(),
        getAdminsApi(),
      ]);
      const toArray = (res) => {
        const d = res?.data;
        if (Array.isArray(d)) return d;
        if (Array.isArray(d?.data)) return d.data;
        if (Array.isArray(d?.users)) return d.users;
        if (Array.isArray(d?.admins)) return d.admins;
        return [];
      };
      const allUsers = [...toArray(usersRes), ...toArray(adminsRes)];
      const foundUser = allUsers.find((u) => u._id === userId);
      setUser(foundUser);
    } catch (error) {
      console.error(error);
    }
  }, [userId]);

  // FETCH ATTENDANCE

  const fetchAttendance = useCallback(async () => {
    if (!selectedMonth || !selectedYear) return;
    setLoading(true);
    try {
      const year = parseInt(selectedYear);
      const month = parseInt(selectedMonth);
      const [attendanceRes, summaryRes] = await Promise.all([
        getUserAttendanceByIdApi(
          userId,
          getMonthRange(month, year).firstDay,
          getMonthRange(month, year).lastDay,
        ),
        getUserSummaryByIdApi(userId, year, month),
      ]);
      const records = (attendanceRes.data?.data || []).sort(
        (a, b) => new Date(b.date) - new Date(a.date),
      );
      setAttendance(records);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear, userId]);

  // EFFECTS

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);
  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  // AUTO REFRESH
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAttendance();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAttendance]);

  // EDIT MODAL

  const openEditModal = (record) => {
    setEditingRecord({
      ...record,
      form: {
        checkIn: formatDateTimeLocal(record.checkIn),
        checkOut: formatDateTimeLocal(record.checkOut),
        breaks: (record.breaks || []).map((brk) => ({
          breakIn: formatDateTimeLocal(brk.breakIn),
          breakOut: formatDateTimeLocal(brk.breakOut),
        })),
      },
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      const updates = {
        checkIn: editingRecord.form.checkIn
          ? new Date(editingRecord.form.checkIn).toISOString()
          : null,
        checkOut: editingRecord.form.checkOut
          ? new Date(editingRecord.form.checkOut).toISOString()
          : null,
        breaks: editingRecord.form.breaks.map((brk) => ({
          breakIn: brk.breakIn ? new Date(brk.breakIn).toISOString() : null,
          breakOut: brk.breakOut ? new Date(brk.breakOut).toISOString() : null,
        })),
      };
      await updateAttendanceApi(editingRecord._id, updates);
      await fetchAttendance();
      toast.success("Attendance updated successfully");
      setShowEditModal(false);
      setEditingRecord(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update attendance");
    }
  };

  const handleAddBreak = async () => {
    try {
      if (!addBreakForm.breakIn) {
        toast.error("Break In time is required");
        return;
      }
      if (!addBreakForm.date) {
        toast.error("Date is required");
        return;
      }
      const breaks = [
        { breakIn: new Date(addBreakForm.breakIn).toISOString() },
      ];
      if (addBreakForm.breakOut) {
        const breakOutDate = new Date(addBreakForm.breakOut);
        const breakInDate = new Date(addBreakForm.breakIn);
        if (breakOutDate <= breakInDate) {
          toast.error("Break Out must be after Break In");
          return;
        }
        breaks[0].breakOut = breakOutDate.toISOString();
      }
      const response = await adminCreateBreakEntryApi(
        userId,
        addBreakForm.date,
        breaks,
      );
      if (response.data?.record?.breaks && editingRecord) {
        setEditingRecord((prev) => ({
          ...prev,
          form: {
            ...prev.form,
            breaks: response.data.record.breaks.map((brk) => ({
              breakIn: formatDateTimeLocal(brk.breakIn),
              breakOut: formatDateTimeLocal(brk.breakOut),
            })),
          },
        }));
      }
      await fetchAttendance();
      toast.success("Break entry created successfully");
      setShowAddBreakModal(false);
      setAddBreakForm({ date: getTodayStr(), breakIn: "", breakOut: "" });
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message || "Failed to create break entry",
      );
    }
  };

  const openAddBreakModal = () => {
    setAddBreakForm({ date: getTodayStr(), breakIn: "", breakOut: "" });
    setShowAddBreakModal(true);
  };

  const openAddAttendanceModal = () => {
    setAddAttendanceForm({ date: getTodayStr(), checkIn: "", checkOut: "" });
    setShowAddAttendanceModal(true);
  };

  const handleAddAttendance = async () => {
    try {
      if (!addAttendanceForm.date) {
        toast.error("Date is required");
        return;
      }
      if (!addAttendanceForm.checkIn) {
        toast.error("Check-in time is required");
        return;
      }
      if (addAttendanceForm.checkOut) {
        const checkOutDate = new Date(addAttendanceForm.checkOut);
        const checkInDate = new Date(addAttendanceForm.checkIn);
        if (checkOutDate <= checkInDate) {
          toast.error("Check-out must be after check-in");
          return;
        }
      }
      await adminCreateAttendanceEntryApi(
        userId,
        addAttendanceForm.date,
        new Date(addAttendanceForm.checkIn).toISOString(),
        addAttendanceForm.checkOut
          ? new Date(addAttendanceForm.checkOut).toISOString()
          : null,
      );
      await fetchAttendance();
      toast.success("Attendance record saved successfully");
      setShowAddAttendanceModal(false);
    } catch (error) {
      console.error(error);
      toast.error(
        error.response?.data?.message || "Failed to create attendance record",
      );
    }
  };

  // DOWNLOAD REPORT

  const generateReport = () => {
    const csvContent = [
      ["Date", "Check In", "Check Out", "Break", "Work Hours", "Status"],
      ...attendance.map((record) => [
        new Date(record.date).toLocaleDateString(),
        formatTime(record.checkIn),
        formatTime(record.checkOut),
        formatBreakTime(record.breaks),
        calculateWorkingHours(record.checkIn, record.checkOut, record.breaks),
        record.status,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${user?.name}-attendance.csv`;
    a.click();
  };

  // PAGE RANGE for pagination buttons
  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    for (
      let i = Math.max(1, currentPage - delta);
      i <= Math.min(totalPages, currentPage + delta);
      i++
    ) {
      range.push(i);
    }
    if (range[0] > 1) {
      if (range[0] > 2) range.unshift("...");
      range.unshift(1);
    }
    if (range[range.length - 1] < totalPages) {
      if (range[range.length - 1] < totalPages - 1) range.push("...");
      range.push(totalPages);
    }
    return range;
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <Sidebar />

      <div className="md:ml-64 p-4 md:p-8 pt-24">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8 mt-16">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <User className="text-white" size={26} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">
                {user?.name || "Employee Name"}
              </h1>
              <p className="text-sm md:text-base">
                {user?.email || "employee@email.com"}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {user?.department && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    {typeof user.department === "object"
                      ? user.department?.name
                      : user.department}
                  </span>
                )}
                {user?.role && (
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {typeof user.role === "object"
                      ? user.role?.name
                      : user.role}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => router.push("/superadmin/attendance")}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 transition-all duration-200 shadow-sm hover:shadow"
            >
              <ArrowLeft size={18} />
              Back
            </button>
            <button
              onClick={generateReport}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Download size={18} />
              Export Report
            </button>
          </div>
        </div>

        {/* SUMMARY */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <SummaryCard
              title="Total Days"
              value={summary.totalDays}
              icon={<Calendar />}
              color="from-blue-500 to-cyan-500"
            />
            <SummaryCard
              title="Present"
              value={summary.present}
              icon={<CheckCircle />}
              color="from-green-500 to-emerald-500"
            />
            <SummaryCard
              title="Half Day"
              value={summary.halfDay ?? 0}
              icon={<Clock />}
              color="from-purple-500 to-violet-500"
            />
            <SummaryCard
              title="Absent"
              value={summary.absent}
              icon={<XCircle />}
              color="from-red-500 to-orange-500"
            />
            <SummaryCard
              title="Work Hours"
              value={`${summary.totalWorkHours}h`}
              icon={<Briefcase />}
              color="from-purple-500 to-pink-500"
            />
          </div>
        )}

        {/* TABLE */}
        <div className="bg-white border border-blue-200 rounded-2xl shadow overflow-hidden">
          {/* Table Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 border-b">
            <h2 className="text-xl font-bold">Attendance Records</h2>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={openAddAttendanceModal}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Plus size={18} />
                Add Attendance
              </button>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border p-3 rounded-xl"
              >
                {MONTHS.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="border p-3 rounded-xl"
              >
                {years.map((year) => (
                  <option key={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <TableHead icon={<Calendar size={15} />} title="Date" />
                  <TableHead icon={<PlayCircle size={15} />} title="Check In" />
                  <TableHead
                    icon={<StopCircle size={15} />}
                    title="Check Out"
                  />
                  <TableHead icon={<Coffee size={15} />} title="Break" />
                  <TableHead icon={<Clock size={15} />} title="Work Hours" />
                  <TableHead icon={<CheckCircle size={15} />} title="Status" />
                  <TableHead icon={<Edit size={15} />} title="Action" />
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center p-10 text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : paginatedAttendance.length ? (
                  paginatedAttendance.map((record) => (
                    <tr key={record._id} className="border-b      ">
                      <td className="p-4">
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      <td className="p-4">{formatTime(record.checkIn)}</td>
                      <td className="p-4">{formatTime(record.checkOut)}</td>
                      <td className="p-4">{formatBreakTime(record.breaks)}</td>
                      <td className="p-4">
                        {calculateWorkingHours(
                          record.checkIn,
                          record.checkOut,
                          record.breaks,
                        )}
                      </td>
                      <td className="p-4">
                        <StatusBadge status={record.status} />
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => openEditModal(record)}
                          className="bg-blue-600 text-white px-2 py-1 rounded-lg flex items-center gap-2"
                        >
                          <Edit size={14} />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center p-10 text-gray-500">
                      No attendance found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION FOOTER */}
          {!loading && totalRecords > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4 border-t bg-gray-50">
              {/* Rows per page + record count */}
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <span>Rows per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  className="border border-gray-300 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  {ROWS_PER_PAGE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <span className="text-gray-400">
                  {(currentPage - 1) * rowsPerPage + 1}–
                  {Math.min(currentPage * rowsPerPage, totalRecords)} of{" "}
                  {totalRecords}
                </span>
              </div>

              {/* Page buttons */}
              <div className="flex items-center gap-1">
                {/* Prev */}
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Page numbers */}
                {getPageNumbers().map((page, idx) =>
                  page === "..." ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="px-2 text-gray-400 select-none"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[36px] h-9 rounded-lg border text-sm font-medium transition ${
                        currentPage === page
                          ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {page}
                    </button>
                  ),
                )}

                {/* Next */}
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* EDIT MODAL */}
        {showEditModal && editingRecord && (
          <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-6">Edit Attendance</h2>
              <div className="space-y-5">
                <div>
                  <label className="block mb-2 font-medium">Check In</label>
                  <input
                    type="datetime-local"
                    value={editingRecord.form.checkIn}
                    onChange={(e) =>
                      setEditingRecord((prev) => ({
                        ...prev,
                        form: { ...prev.form, checkIn: e.target.value },
                      }))
                    }
                    className="w-full border p-3 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block mb-2 font-medium">Check Out</label>
                  <input
                    type="datetime-local"
                    value={editingRecord.form.checkOut}
                    onChange={(e) =>
                      setEditingRecord((prev) => ({
                        ...prev,
                        form: { ...prev.form, checkOut: e.target.value },
                      }))
                    }
                    className="w-full border p-3 rounded-xl"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="font-medium">Breaks</label>
                    <button
                      onClick={openAddBreakModal}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <Plus size={18} />
                      Add Break
                    </button>
                  </div>
                  <div className="space-y-4">
                    {editingRecord.form.breaks.map((brk, idx) => (
                      <div
                        key={idx}
                        className="grid md:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-xl"
                      >
                        <input
                          type="datetime-local"
                          value={brk.breakIn}
                          onChange={(e) => {
                            const updatedBreaks = [
                              ...editingRecord.form.breaks,
                            ];
                            updatedBreaks[idx].breakIn = e.target.value;
                            setEditingRecord((prev) => ({
                              ...prev,
                              form: { ...prev.form, breaks: updatedBreaks },
                            }));
                          }}
                          className="border p-3 rounded-xl"
                        />
                        <input
                          type="datetime-local"
                          value={brk.breakOut}
                          onChange={(e) => {
                            const updatedBreaks = [
                              ...editingRecord.form.breaks,
                            ];
                            updatedBreaks[idx].breakOut = e.target.value;
                            setEditingRecord((prev) => ({
                              ...prev,
                              form: { ...prev.form, breaks: updatedBreaks },
                            }));
                          }}
                          className="border p-3 rounded-xl"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSaveEdit}
                    className="flex-1 bg-green-600 text-white py-3 rounded-xl"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingRecord(null);
                    }}
                    className="flex-1 bg-gray-200 py-3 rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* ADD BREAK MODAL */}
              {showAddBreakModal && (
                <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
                  <div className="bg-white rounded-3xl w-full max-w-lg p-6">
                    <h2 className="text-2xl font-bold mb-6">
                      Add Break for {user?.name || "Employee"}
                    </h2>
                    <div className="space-y-5">
                      <div>
                        <label className="block mb-2 font-medium">Date</label>
                        <input
                          type="date"
                          value={addBreakForm.date}
                          onChange={(e) =>
                            setAddBreakForm((prev) => ({
                              ...prev,
                              date: e.target.value,
                            }))
                          }
                          className="w-full border p-3 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block mb-2 font-medium">
                          Break In <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          value={addBreakForm.breakIn}
                          onChange={(e) =>
                            setAddBreakForm((prev) => ({
                              ...prev,
                              breakIn: e.target.value,
                            }))
                          }
                          className="w-full border p-3 rounded-xl"
                        />
                      </div>
                      <div>
                        <label className="block mb-2 font-medium">
                          Break Out
                        </label>
                        <input
                          type="datetime-local"
                          value={addBreakForm.breakOut}
                          onChange={(e) =>
                            setAddBreakForm((prev) => ({
                              ...prev,
                              breakOut: e.target.value,
                            }))
                          }
                          className="w-full border p-3 rounded-xl"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Optional. Leave empty if break is ongoing.
                        </p>
                      </div>
                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={handleAddBreak}
                          className="flex-1 bg-purple-600 text-white py-3 rounded-xl hover:bg-purple-700"
                        >
                          Add Break
                        </button>
                        <button
                          onClick={() => {
                            setShowAddBreakModal(false);
                            setAddBreakForm({
                              date: getTodayStr(),
                              breakIn: "",
                              breakOut: "",
                            });
                          }}
                          className="flex-1 bg-gray-200 py-3 rounded-xl"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ADD ATTENDANCE MODAL */}
        {showAddAttendanceModal && (
          <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-3xl w-full max-w-lg p-6">
              <h2 className="text-2xl font-bold mb-6">
                Add Attendance for {user?.name || "Employee"}
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block mb-2 font-medium">Date</label>
                  <input
                    type="date"
                    value={addAttendanceForm.date}
                    onChange={(e) =>
                      setAddAttendanceForm((prev) => ({
                        ...prev,
                        date: e.target.value,
                      }))
                    }
                    className="w-full border p-3 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block mb-2 font-medium">
                    Check In <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={addAttendanceForm.checkIn}
                    onChange={(e) =>
                      setAddAttendanceForm((prev) => ({
                        ...prev,
                        checkIn: e.target.value,
                      }))
                    }
                    className="w-full border p-3 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block mb-2 font-medium">Check Out</label>
                  <input
                    type="datetime-local"
                    value={addAttendanceForm.checkOut}
                    onChange={(e) =>
                      setAddAttendanceForm((prev) => ({
                        ...prev,
                        checkOut: e.target.value,
                      }))
                    }
                    className="w-full border p-3 rounded-xl"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Optional. Leave empty if employee has not checked out yet.
                  </p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleAddAttendance}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700"
                  >
                    Save Attendance
                  </button>
                  <button
                    onClick={() => setShowAddAttendanceModal(false)}
                    className="flex-1 bg-gray-200 py-3 rounded-xl"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
