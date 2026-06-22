"use client";

import { useEffect, useState } from "react";
import { getUsersApi, getAdminsApi } from "@/services/adminApi";
import { getAllUsersSummaryApi } from "@/services/attandanceApi";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/Sidebar";
import AttendanceStats from "@/components/features/AttendanceStats";
import { User, Search, ChevronRight, Users } from "lucide-react";
import { useRouter } from "next/navigation";

const getDateStr = () =>
  new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

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

      const allUsers = [...(usersRes.data || []), ...(adminsRes.data || [])];
      setUsers(allUsers);
      setFilteredUsers(allUsers);

      const { todayStats, userStats } = summaryRes.data;

      setAttendanceSummary({
        presentToday: todayStats.presentToday,
        lateCheckIns: todayStats.lateToday,
        onBreak: todayStats.onBreakToday,
        totalWorkHours: todayStats.totalWorkHours,
        absentToday: Math.max(0, allUsers.length - todayStats.presentToday),
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
  const activeThisMonth = users.filter((u) => {
    const s = attendanceStats[u._id];
    return s && s.present + s.pending > 0;
  }).length;

  return (
    <div className="min-h-screen">
      <Sidebar />
      <Navbar />
      <div className="md:ml-64 pt-25 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <Users className="text-blue-600" />
            All Users &amp; Admins Attendance Management
          </h2>
          <div className="text-sm px-3 py-2  rounded-xl font-medium">
            {dateStr} 📅
          </div>
        </div>

        <AttendanceStats stats={attendanceSummary} />

        {/* Table card with integrated filter toolbar */}
        <div className="bg-[var(--bg-surface)] rounded-xl shadow-sm overflow-hidden border border-[var(--border)]">
          <div className="p-6 border-b border-[var(--border)]">
            <div className="flex flex-col lg:flex-row justify-between gap-4">
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
                    "This Month (Total / Expected / Present / Pending)",
                    "Action",
                  ].map((h, i) => (
                    <th
                      key={h}
                      className={`p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider${i === 3 ? " text-center" : i === 4 ? " text-right" : ""}`}
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
                      pending: 0,
                      expectedWorkingDays: 0,
                    };
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
                            <span className="text-green-600" title="Present">
                              {stats.present}
                            </span>
                            <span className="text-yellow-600" title="Pending">
                              {stats.pending}
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
                      colSpan="5"
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
      </div>
    </div>
  );
}
