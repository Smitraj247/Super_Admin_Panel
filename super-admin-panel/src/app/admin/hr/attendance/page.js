"use client";

import { useEffect, useState } from "react";
import { getUsersApi, getAdminsApi } from "@/services/adminApi";
import { getAllUsersAttendanceApi } from "@/services/attandanceApi";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/Sidebar";

import {
  User,
  Search,
  ChevronRight,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Coffee,
  Briefcase,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function SuperAdminAttendance() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [attendanceStats, setAttendanceStats] = useState({});
  const router = useRouter();

  useEffect(() => {
    fetchUsers();
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

      // Combine both arrays
      const allUsers = [...regularUsers, ...adminUsers];
      setUsers(allUsers);
      setFilteredUsers(allUsers);

      // Fetch current month attendance stats for all users
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0];

      const attendanceRes = await getAllUsersAttendanceApi(firstDay, lastDay);
      const attendanceData = attendanceRes.data?.data || [];

      // Calculate stats per user
      const stats = {};
      allUsers.forEach((user) => {
        const userAttendance = attendanceData.filter(
          (a) => a.userId?._id === user._id,
        );
        stats[user._id] = {
          totalDays: userAttendance.length,
          present: userAttendance.filter((a) => a.status === "CHECKED_OUT")
            .length,
          pending: userAttendance.filter((a) => a.status !== "CHECKED_OUT")
            .length,
        };
      });
      setAttendanceStats(stats);
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
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Navbar />

      <div className="md:ml-64 pt-16 p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="text-indigo-600" />
            All Users & Admins Attendance Management
          </h1>
          <p className="text-slate-600 mt-2">
            Select a user or admin to view their detailed attendance records
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <p className="text-sm text-slate-600">Total Users & Admins</p>
            <p className="text-2xl font-bold text-slate-900">{users.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <p className="text-sm text-slate-600">Departments</p>
            <p className="text-2xl font-bold text-indigo-600">
              {uniqueDepartments.length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <p className="text-sm text-slate-600">Roles</p>
            <p className="text-2xl font-bold text-purple-600">
              {uniqueRoles.length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <p className="text-sm text-slate-600">Active This Month</p>
            <p className="text-2xl font-bold text-green-600">
              {
                Object.values(attendanceStats).filter((s) => s.totalDays > 0)
                  .length
              }
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
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
                  className="w-full border-2 border-slate-300 p-2 pl-10 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Filter by Department
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full border-2 border-slate-300 p-2 rounded-lg focus:outline-none focus:border-indigo-500"
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
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Filter by Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full border-2 border-slate-300 p-2 rounded-lg focus:outline-none focus:border-indigo-500"
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

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center p-8 text-slate-500">
              Loading users...
            </div>
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map((user) => {
              const stats = attendanceStats[user._id] || {
                totalDays: 0,
                present: 0,
                pending: 0,
              };
              return (
                <div
                  key={user._id}
                  onClick={() => handleUserClick(user._id)}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-lg hover:border-indigo-300 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                        <User className="text-indigo-600" size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {user.name}
                        </h3>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <ChevronRight
                      className="text-slate-400 group-hover:text-indigo-600 transition-colors"
                      size={20}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Department:</span>
                      <span className="font-semibold text-slate-900">
                        {typeof user.department === "object"
                          ? user.department?.name
                          : user.department || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Role:</span>
                      <span className="font-semibold text-slate-900">
                        {typeof user.role === "object"
                          ? user.role?.name
                          : user.role || "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-xs text-slate-500 mb-2">This Month</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <p className="text-lg font-bold text-slate-900">
                          {stats.totalDays}
                        </p>
                        <p className="text-xs text-slate-500">Total</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-green-600">
                          {stats.present}
                        </p>
                        <p className="text-xs text-slate-500">Present</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-yellow-600">
                          {stats.pending}
                        </p>
                        <p className="text-xs text-slate-500">Pending</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center p-8 text-slate-500">
              No users found
            </div>

          )}
        </div>
      </div>
    </div>
  );
}
