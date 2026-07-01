"use client";

import { useEffect, useState } from "react";
import { getUsersApi, getAdminsApi } from "@/services/adminApi";
import { getAllUsersSummaryApi } from "@/services/attandanceApi";
import DashboardLayout from "@/components/layout/DashboardLayout";
import HrAttendancePageWithSummary from "@/components/features/HrAttendancePageWithSummary";
import AttendanceStats from "@/components/features/AttendanceStats";
import {
  User,
  Search,
  ChevronRight,
  Users,
  X,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

const getDateStr = () =>
  new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

// ─── Status Badge
function StatusBadge({ status }) {
  const map = {
    Present: {
      icon: <CheckCircle size={11} />,
      cls: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    },
    Absent: {
      icon: <XCircle size={11} />,
      cls: "bg-red-50 text-red-700 border border-red-200",
    },
    "On Leave": {
      icon: <span className="text-[11px]">🌴</span>,
      cls: "bg-amber-50 text-amber-700 border border-amber-200",
    },
  };
  const { icon, cls } = map[status] ?? map["Absent"];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}
    >
      {icon}
      {status}
    </span>
  );
}

// ─── Month Stats Cell
function MonthStats({ stats }) {
  const items = [
    {
      label: "Total",
      value: stats.totalDays,
      cls: "text-[var(--text-primary)]",
    },
    {
      label: "Exp.",
      value: stats.expectedWorkingDays ?? stats.totalDays,
      cls: "text-blue-600",
    },
    { label: "Present", value: stats.present, cls: "text-emerald-600" },
    { label: "Absent", value: stats.absent, cls: "text-red-500" },
    { label: "Half-day", value: stats.halfDay, cls: "text-amber-500" },
  ];
  return (
    <div className="flex items-center justify-center divide-x divide-[var(--border)]">
      {items.map(({ label, value, cls }) => (
        <div key={label} className="flex flex-col items-center px-2.5">
          <span className={`text-sm font-semibold ${cls}`}>{value}</span>
          <span className="text-[10px] text-[var(--text-secondary)] mt-0.5 whitespace-nowrap">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Stat Card
function StatCard({ label, value, colorClass }) {
  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-4">
      <p className="text-xs text-[var(--text-secondary)] mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${colorClass}`}>{value}</p>
    </div>
  );
}

// ─── Main Page
export default function HRAttendance() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [attendanceStats, setAttendanceStats] = useState({});
  const [attendanceSummary, setAttendanceSummary] = useState({
    presentToday: 0,
    totalWorkHours: 0,
    lateCheckIns: 0,
    absentToday: 0,
    onBreak: 0,
  });
  const [activeTab, setActiveTab] = useState("all");
  const [dateStr] = useState(getDateStr);
  const router = useRouter();

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const [usersRes, adminsRes, summaryRes] = await Promise.all([
        getUsersApi(),
        getAdminsApi(),
        getAllUsersSummaryApi(year, month),
      ]);

      // Merge users and admins, remove SUPER_ADMIN role and deduplicate by _id
      const merged = [
        ...(usersRes.data?.data || []),
        ...(adminsRes.data?.data || []),
      ];
      const uniqueUsers = [];
      const seenIds = new Set();
      for (const u of merged) {
        if (u.role?.name === 'SUPER_ADMIN') continue;
        if (!seenIds.has(u._id)) {
          seenIds.add(u._id);
          uniqueUsers.push(u);
        }
      }
      setUsers(uniqueUsers);
      setFilteredUsers(uniqueUsers);

      const { todayStats, userStats } = summaryRes.data;

      setAttendanceSummary({
        presentToday: todayStats.presentToday,
        lateCheckIns: todayStats.lateToday,
        onBreak: todayStats.onBreakToday,
        totalWorkHours: todayStats.totalWorkHours,
        absentToday: Math.max(0, uniqueUsers.length - todayStats.presentToday),
      });

      setAttendanceStats(userStats);
    } catch (err) {
      console.error("Error fetching attendance:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = users;
    if (searchQuery)
      filtered = filtered.filter(
        (u) =>
          u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    if (departmentFilter)
      filtered = filtered.filter(
        (u) =>
          (typeof u.department === "object"
            ? u.department?.name
            : u.department) === departmentFilter,
      );
    if (roleFilter)
      filtered = filtered.filter(
        (u) =>
          (typeof u.role === "object" ? u.role?.name : u.role) === roleFilter,
      );
    setFilteredUsers(filtered);
  }, [searchQuery, departmentFilter, roleFilter, users]);

  const uniqueDepartments = [
    ...new Set(
      users.map((u) =>
        typeof u.department === "object" ? u.department?.name : u.department,
      ),
    ),
  ].filter(Boolean);

  const uniqueRoles = [
    ...new Set(
      users.map((u) => (typeof u.role === "object" ? u.role?.name : u.role)),
    ),
  ].filter(Boolean);

  const hasFilter = searchQuery || departmentFilter || roleFilter;

  const presentCount = filteredUsers.filter(
    (u) => (attendanceStats[u._id]?.todayStatus ?? "Absent") === "Present",
  ).length;
  const absentCount = filteredUsers.filter(
    (u) => (attendanceStats[u._id]?.todayStatus ?? "Absent") === "Absent",
  ).length;
  const leaveCount = filteredUsers.filter(
    (u) => (attendanceStats[u._id]?.todayStatus ?? "Absent") === "On Leave",
  ).length;

  return (
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <Users size={20} className="text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
            Attendance Management
          </h1>
        </div>
        <span className="text-xs text-[var(--text-secondary)] bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg px-3 py-1.5">
          {dateStr} 📅
        </span>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        {[
          { key: "personal", label: "My Attendance" },
          { key: "all", label: "All Users" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "personal" && <HrAttendancePageWithSummary />}

      {/* ── All users tab ── */}
      {activeTab === "all" && (
        <>
          <AttendanceStats stats={attendanceSummary} />

          {/* Table card with integrated filter toolbar */}
          <div className="bg-[var(--bg-surface)] rounded-xl shadow-sm overflow-hidden border border-[var(--border)]">
            <div className="p-6 border-b border-[var(--border)]">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or email"
                    className="w-72 border p-2 pl-10 rounded-lg"
                  />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="border p-2 rounded-lg"
                  >
                    <option value="">All Departments</option>
                    {uniqueDepartments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>

                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="border p-2 rounded-lg"
                  >
                    <option value="">All Roles</option>
                    {uniqueRoles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>

                  {(searchQuery || departmentFilter || roleFilter) && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setDepartmentFilter("");
                        setRoleFilter("");
                      }}
                      className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)]">
                  <tr>
                    {[
                      "User",
                      "Department",
                      "Role",
                      "Today's Status",
                      "This Month (Total / Expected / Present / Absent / Half Day)",
                      "Action",
                    ].map((h, i) => (
                      <th
                        key={h}
                        className={`p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider${i === 3 || i === 4 ? " text-center" : i === 5 ? " text-right" : ""}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {loading ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="text-center p-8 text-[var(--text-secondary)]"
                      >
                        Loading users...
                      </td>
                    </tr>
                  ) : filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => {
                      const stats = attendanceStats[user._id] || {
                        totalDays: 0,
                        present: 0,
                        absent: 0,
                        halfDay: 0,
                        expectedWorkingDays: 0,
                        todayStatus: "Absent",
                      };
                      const statusColor =
                        stats.todayStatus === "Present"
                          ? "text-green-600"
                          : stats.todayStatus === "On Leave"
                            ? "text-yellow-600"
                            : "text-red-600";
                      return (
                        <tr
                          key={user._id}
                          onClick={() =>
                            router.push(`/admin/hr/attendance/${user._id}`)
                          }
                          className="hover:bg-[var(--bg-elevated)] transition cursor-pointer group"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                                <User className="text-indigo-600" size={20} />
                              </div>
                              <div>
                                <p className="text-[var(--text-primary)] group-hover:text-indigo-600 transition-colors">
                                  {user.name}
                                </p>
                                <p className="text-xs text-[var(--text-secondary)]">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-sm text-[var(--text-primary)]">
                            {(typeof user.department === "object"
                              ? user.department?.name
                              : user.department) || "N/A"}
                          </td>
                          <td className="p-4 text-sm text-[var(--text-primary)]">
                            {(typeof user.role === "object"
                              ? user.role?.name
                              : user.role) || "N/A"}
                          </td>
                          <td
                            className={`p-4 text-center text-sm font-semibold ${statusColor}`}
                          >
                            {stats.todayStatus}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-4 text-sm">
                              <span
                                className="text-[var(--text-primary)]"
                                title="Total Working Days"
                              >
                                {stats.totalDays}
                              </span>
                              <span
                                className="text-indigo-600 font-semibold"
                                title="Expected Working Days (excl. leaves)"
                              >
                                {stats.expectedWorkingDays || stats.totalDays}
                              </span>
                              <span
                                className="text-green-600"
                                title="Present"
                              >
                                {stats.present}
                              </span>
                              <span className="text-red-600" title="Absent">
                                {stats.absent}
                              </span>
                              <span
                                className="text-yellow-600"
                                title="Half Day"
                              >
                                {stats.halfDay}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <button className="p-2 text-[var(--text-secondary)] group-hover:text-indigo-600 group-hover:bg-indigo-50 rounded-lg transition-colors">
                              <ChevronRight size={18} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
                        className="text-center p-8 text-[var(--text-secondary)]"
                      >
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
