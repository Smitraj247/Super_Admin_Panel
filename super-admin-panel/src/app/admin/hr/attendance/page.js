"use client";

import { useEffect, useState } from "react";
import { getUsersApi, getAdminsApi } from "@/services/adminApi";
import { getAllUsersAttendanceApi } from "@/services/attandanceApi";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/Sidebar";
import AttendanceStats from "@/components/features/AttendanceStats";
import { User, Search, ChevronRight, Users } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SuperAdminAttendance() {
  const [users, setUsers] = useState([]);
  const [dateStr, setDateStr] = useState("");
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
  const router = useRouter();

  const getDateStr = () =>
    new Date().toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

  useEffect(() => {
    fetchUsers();
    setDateStr(getDateStr());
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch both users and admins
      const [usersRes, adminsRes] = await Promise.all([
        getUsersApi(),
        getAdminsApi(),
      ]);
      const regularUsers = usersRes.data || [];
      const adminUsers = adminsRes.data || [];
      const allUsers = [...regularUsers, ...adminUsers];

      setUsers(allUsers);
      setFilteredUsers(allUsers);

      // Fetch current month attendance for all users
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0];

      const attendanceRes = await getAllUsersAttendanceApi(firstDay, lastDay);
      const attendanceData = attendanceRes.data?.data || [];

      const todayKey = new Date().toISOString().split("T")[0];
      const todayRecords = attendanceData.filter((a) => {
        if (!a?.date) return false;
        const dateKey = new Date(a.date).toISOString().split("T")[0];
        return dateKey === todayKey;
      });

      const lateCount = todayRecords.filter(
        (a) => a.isLate || a.status === "LATE",
      ).length;
      const onBreakCount = todayRecords.filter(
        (a) => a.status === "ON_BREAK" || a.isOnBreak,
      ).length;
      const presentToday = todayRecords.filter(
        (a) =>
          a.status === "CHECKED_IN" ||
          a.status === "CHECKED_OUT" ||
          a.status === "BACK_TO_WORK" ||
          a.status === "LATE" ||
          a.status === "ON_BREAK",
      ).length;
      const absentToday = Math.max(0, allUsers.length - presentToday);

      const totalWorkHours = attendanceData.reduce((acc, record) => {
        if (!record.checkIn || !record.checkOut) return acc;
        let mins =
          (new Date(record.checkOut) - new Date(record.checkIn)) / 60000;
        (record.breaks || []).forEach((b) => {
          if (b.breakIn && b.breakOut) {
            mins -= (new Date(b.breakOut) - new Date(b.breakIn)) / 60000;
          }
        });
        return acc + mins / 60;
      }, 0);

      const userStats = {};
      allUsers.forEach((user) => {
        const userAttendance = attendanceData.filter(
          (a) => a.userId?._id === user._id || a.userId === user._id,
        );
        userStats[user._id] = {
          totalDays: userAttendance.length,
          present: userAttendance.filter((a) => a.status === "CHECKED_OUT")
            .length,
          pending: userAttendance.filter((a) => a.status !== "CHECKED_OUT")
            .length,
        };
      });

      setAttendanceStats(userStats);
      setAttendanceSummary({
        presentToday,
        totalWorkHours: Math.round(totalWorkHours * 10) / 10,
        lateCheckIns: lateCount,
        absentToday,
        onBreak: onBreakCount,
      });
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = users;

    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (departmentFilter) {
      filtered = filtered.filter(
        (user) =>
          (typeof user.department === "object"
            ? user.department?.name
            : user.department) === departmentFilter,
      );
    }

    if (roleFilter) {
      filtered = filtered.filter(
        (user) =>
          (typeof user.role === "object" ? user.role?.name : user.role) ===
          roleFilter,
      );
    }

    setFilteredUsers(filtered);
  }, [searchQuery, departmentFilter, roleFilter, users]);

  const uniqueDepartments = Array.from(
    new Set(
      users.map((u) =>
        typeof u.department === "object" ? u.department?.name : u.department,
      ),
    ),
  ).filter(Boolean);

  const uniqueRoles = Array.from(
    new Set(
      users.map((u) => (typeof u.role === "object" ? u.role?.name : u.role)),
    ),
  ).filter(Boolean);

  const handleUserClick = (userId) => {
    router.push(`/admin/hr/attendance/${userId}`);
  };

  return (
    <div className="min-h-screen">
      <Sidebar />
      <Navbar />

      <div className="md:ml-64 pt-20 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
              Attendance System
            </h1>
          </div>

          <div className="text-sm px-3 py-2 bg-indigo-100 rounded-xl font-medium">
            {dateStr} 📅
          </div>
        </div>
        {/* Attendance Stats Cards */}
        <AttendanceStats stats={attendanceSummary} />

        <div className="mb-6">
          <h2 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <Users className="text-blue-600" />
            All Users & Admins Attendance Management
          </h2>
          <p className="text-[var(--text-secondary)] mt-2">
            Select a user or admin to view their detailed attendance records
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[var(--bg-surface)] rounded-xl shadow-sm border border-[var(--border)] p-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Total Users & Admins
            </p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {users.length}
            </p>
          </div>
          <div className="bg-[var(--bg-surface)] rounded-xl shadow-sm border border-[var(--border)] p-4">
            <p className="text-sm text-[var(--text-secondary)]">Departments</p>
            <p className="text-2xl font-bold text-indigo-600">
              {uniqueDepartments.length}
            </p>
          </div>
          <div className="bg-[var(--bg-surface)] rounded-xl shadow-sm border border-[var(--border)] p-4">
            <p className="text-sm text-[var(--text-secondary)]">Roles</p>
            <p className="text-2xl font-bold text-purple-600">
              {uniqueRoles.length}
            </p>
          </div>
          <div className="bg-[var(--bg-surface)] rounded-xl shadow-sm border border-[var(--border)] p-4">
            <p className="text-sm text-[var(--text-secondary)]">
              Active This Month
            </p>
            <p className="text-2xl font-bold text-green-600">
              {
                Object.values(attendanceStats).filter((s) => s.totalDays > 0)
                  .length
              }
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[var(--bg-surface)] rounded-2xl shadow-sm border border-[var(--border)] p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                Search User
              </label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-2.5 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email"
                  className="w-full border-2 border-[var(--border-strong)] p-2 pl-10 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                Filter by Department
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full border-2 border-[var(--border-strong)] p-2 rounded-lg focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Departments</option>
                {uniqueDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                Filter by Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full border-2 border-[var(--border-strong)] p-2 rounded-lg focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Roles</option>
                {uniqueRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(searchQuery || departmentFilter || roleFilter) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setDepartmentFilter("");
                setRoleFilter("");
              }}
              className="mt-4 bg-slate-600 text-white px-6 py-2 rounded-lg hover:bg-slate-700"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Users Table */}
        <div className="bg-[var(--bg-surface)] rounded-xl shadow-sm overflow-hidden border border-[var(--border)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border)]">
                <tr>
                  <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    User
                  </th>
                  <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Department
                  </th>
                  <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Role
                  </th>
                  <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider text-center">
                    This Month (Total / Present / Pending)
                  </th>
                  <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {loading ? (
                  <tr>
                    <td
                      colSpan="5"
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
                    };
                    return (
                      <tr
                        key={user._id}
                        onClick={() => handleUserClick(user._id)}
                        className="hover:bg-[var(--bg-elevated)] transition cursor-pointer group"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                              <User className="text-indigo-600" size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-[var(--text-primary)] group-hover:text-indigo-600 transition-colors">
                                {user.name}
                              </p>
                              <p className="text-xs text-[var(--text-secondary)]">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm font-semibold text-[var(--text-primary)]">
                          {typeof user.department === "object"
                            ? user.department?.name
                            : user.department || "N/A"}
                        </td>
                        <td className="p-4 text-sm font-semibold text-[var(--text-primary)]">
                          {typeof user.role === "object"
                            ? user.role?.name
                            : user.role || "N/A"}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-4 text-sm font-bold">
                            <span
                              className="text-[var(--text-primary)]"
                              title="Total Days"
                            >
                              {stats.totalDays}
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
