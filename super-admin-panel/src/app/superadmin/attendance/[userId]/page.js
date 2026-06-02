"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getAllUsersAttendanceApi,
  updateAttendanceApi,
  getAttendanceSummary,
} from "@/services/attandanceApi";
import { getUsers } from "@/services/userApi";
import { getAdminsApi } from "@/services/superAdminApi";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/Sidebar";
import {
  Calendar,
  Edit,
  Download,
  ArrowLeft,
  User,
  CheckCircle,
  XCircle,
  Briefcase,
} from "lucide-react";

export default function UserAttendanceDetail() {
  const { userId } = useParams();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // ✅ Set default month/year
  useEffect(() => {
    const now = new Date();
    setSelectedMonth(String(now.getMonth() + 1).padStart(2, "0"));
    setSelectedYear(String(now.getFullYear()));
    fetchUserData();
  }, [userId]);

  // ✅ Fetch attendance when filter changes
  useEffect(() => {
    if (selectedMonth && selectedYear) fetchAttendance();
  }, [selectedMonth, selectedYear, userId]);

  // ✅ Get user
  const fetchUserData = async () => {
    try {
      const [usersRes, adminsRes] = await Promise.all([
        getUsers(),
        getAdminsApi(),
      ]);

      const allUsers = [...(usersRes.data || []), ...(adminsRes.data || [])];
      setUser(allUsers.find((u) => u._id === userId));
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  // ✅ Reusable date range
  const getDateRange = () => {
    const year = parseInt(selectedYear);
    const month = parseInt(selectedMonth);
    return {
      firstDay: new Date(year, month - 1, 1).toISOString().split("T")[0],
      lastDay: new Date(year, month, 0).toISOString().split("T")[0],
    };
  };

  // ✅ Fetch attendance
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const { firstDay, lastDay } = getDateRange();

      const [attendanceRes, summaryRes] = await Promise.all([
        getAllUsersAttendanceApi(firstDay, lastDay),
        getAttendanceSummary(firstDay, lastDay),
      ]);

      const userAttendance = (attendanceRes.data?.data || [])
        .filter((a) => a.userId?._id === userId)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      setAttendance(userAttendance);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Edit modal
  const openEditModal = (record) => {
    setEditingRecord({
      ...record,
      newCheckIn: record.checkIn
        ? new Date(record.checkIn).toISOString().slice(0, 16)
        : "",
      newCheckOut: record.checkOut
        ? new Date(record.checkOut).toISOString().slice(0, 16)
        : "",
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      const updates = {};

      if (editingRecord.newCheckIn) updates.checkIn = editingRecord.newCheckIn;
      if (editingRecord.newCheckOut)
        updates.checkOut = editingRecord.newCheckOut;

      if (Object.keys(updates).length) {
        await updateAttendanceApi(editingRecord._id, updates);
        fetchAttendance();
      }

      setShowEditModal(false);
      setEditingRecord(null);
    } catch (error) {
      console.error(error);
    }
  };

  // ✅ CSV export
  const generateReport = () => {
    const csv = [
      ["Date", "Check In", "Check Out", "Break", "Work", "Status"],
      ...attendance.map((r) => [
        new Date(r.date).toLocaleDateString(),
        formatTime(r.checkIn),
        formatTime(r.checkOut),
        formatBreakTime(r.breaks),
        calculateWorkingHours(r.checkIn, r.checkOut, r.breaks),
        r.status,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${user?.name}-attendance.csv`;
    link.click();
  };

  // ✅ Helpers
  const formatTime = (t) =>
    t
      ? new Date(t).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
      : "-";

  const formatBreakTime = (breaks = []) => {
    let mins = 0;
    breaks.forEach((b) => {
      if (b.breakIn && b.breakOut)
        mins += (new Date(b.breakOut) - new Date(b.breakIn)) / 60000;
    });
    const h = Math.floor(mins / 60);
    const m = Math.floor(mins % 60);
    return h ? `${h}h ${m}m` : `${m}m`;
  };

  const calculateWorkingHours = (inT, outT, breaks = []) => {
    if (!inT || !outT) return "-";
    let mins = (new Date(outT) - new Date(inT)) / 60000;
    breaks.forEach((b) => {
      if (b.breakIn && b.breakOut)
        mins -= (new Date(b.breakOut) - new Date(b.breakIn)) / 60000;
    });
    return `${Math.floor(mins / 60)}h ${Math.floor(mins % 60)}m`;
  };

  const months = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i,
  );

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <Sidebar />
      <Navbar />

      <div className="md:ml-64 pt-20 p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/superadmin/attendance")}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-4 font-semibold"
          >
            <ArrowLeft size={20} />
            Back to All Users
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center">
                <User className="text-indigo-600" size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">
                  {user?.name}
                </h1>
                <p className="text-[var(--text-secondary)]">{user?.email}</p>
                <div className="flex gap-3 mt-1">
                  <span className="text-sm text-[var(--text-secondary)]">
                    Department:{" "}
                    <span className="font-semibold">
                      {typeof user?.department === "object"
                        ? user?.department?.name
                        : user?.department}
                    </span>
                  </span>
                  <span className="text-sm text-[var(--text-secondary)]">
                    Role:{" "}
                    <span className="font-semibold">
                      {typeof user?.role === "object"
                        ? user?.role?.name
                        : user?.role}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={generateReport}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
            >
              <Download size={18} />
              Download Report
            </button>
          </div>
        </div>
        {/* Month/Year Selector */}
        <div className="bg-[var(--bg-surface)] rounded-2xl shadow-sm border border-[var(--border)] p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                Select Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full border-2 border-[var(--border-strong)] p-2 rounded-lg focus:outline-none focus:border-indigo-500"
              >
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                Select Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full border-2 border-[var(--border-strong)] p-2 rounded-lg focus:outline-none focus:border-indigo-500"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>.

        {/* Attendance Table */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm overflow-hidden">

          {/* HEADER */}
          <div className="px-6 py-5 border-b border-[var(--border)] flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Attendance Records
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                {attendance.length} records found
              </p>
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">

              <thead className="bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
                <tr>
                  {["Date", "Check In", "Check Out", "Break", "Hours", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-6 py-4 text-left font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border)]">

                {loading ? (
                  <tr>
                    <td colSpan="7" className="text-center py-10 text-[var(--text-secondary)]">
                      Loading attendance records...
                    </td>
                  </tr>
                ) : attendance.length > 0 ? (
                  attendance.map((record) => (
                    <tr
                      key={record._id}
                      className="hover:bg-[var(--bg-elevated)] transition"
                    >

                      {/* DATE */}
                      <td className="px-6 py-4 font-medium text-[var(--text-primary)] whitespace-nowrap">
                        {new Date(record.date).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      {/* CHECK IN */}
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-md bg-green-50 text-green-700 border border-green-100 text-xs font-medium">
                          {formatTime(record.checkIn)}
                        </span>
                      </td>

                      {/* CHECK OUT */}
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-md bg-red-50 text-red-700 border border-red-100 text-xs font-medium">
                          {formatTime(record.checkOut)}
                        </span>
                      </td>

                      {/* BREAK */}
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-md bg-orange-50 text-orange-700 border border-orange-100 text-xs font-medium">
                          {formatBreakTime(record.breaks)}
                        </span>
                      </td>

                      {/* HOURS */}
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-100 text-xs font-semibold">
                          {calculateWorkingHours(
                            record.checkIn,
                            record.checkOut,
                            record.breaks
                          )}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 text-xs rounded-full font-medium ${record.status === "CHECKED_OUT"
                            ? "bg-green-100 text-green-700"
                            : record.status === "ON_BREAK"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-blue-100 text-blue-700"
                            }`}
                        >
                          {record.status}
                        </span>
                      </td>

                      {/* ACTION */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openEditModal(record)}
                          className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition"
                        >
                          <Edit size={14} />
                          Edit
                        </button>
                      </td>

                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center py-10 text-[var(--text-secondary)]">
                      No attendance records found for this month
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-surface)] rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Edit Attendance Record</h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">
                  Date: {new Date(editingRecord.date).toLocaleDateString()}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                  Check In Time
                </label>
                <input
                  type="datetime-local"
                  value={editingRecord.newCheckIn}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      newCheckIn: e.target.value,
                    })
                  }
                  className="w-full border-2 border-[var(--border-strong)] p-2 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                  Check Out Time
                </label>
                <input
                  type="datetime-local"
                  value={editingRecord.newCheckOut}
                  onChange={(e) =>
                    setEditingRecord({
                      ...editingRecord,
                      newCheckOut: e.target.value,
                    })
                  }
                  className="w-full border-2 border-[var(--border-strong)] p-2 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveEdit}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingRecord(null);
                }}
                className="flex-1 bg-slate-300 text-[var(--text-primary)] px-4 py-2 rounded-lg hover:bg-slate-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




