"use client";

import { useEffect, useState } from "react";
import {
  getAllUsersWithLeavesApi,
  getUserLeaveHistoryApi,
  updateSuperAdminLeaveStatusApi,
} from "@/services/leaveApi";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/Sidebar";
import {
  Calendar,
  Check,
  X,
  Download,
  Filter,
  Search,
  ArrowLeft,
  User as UserIcon,
  Bell,
  BellDot,
} from "lucide-react";

export default function SuperAdminLeaves() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userLeaves, setUserLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [userPendingLeaves, setUserPendingLeaves] = useState({});

  // Leave filters
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await getAllUsersWithLeavesApi();
      const data = res.data?.data || res.data || [];
      setUsers(data);
      setFilteredUsers(data);

      // Extract pending leave counts from user data
      const pendingCounts = {};
      data.forEach((user) => {
        pendingCounts[user._id] = user.pendingLeaveCount || 0;
      });
      setUserPendingLeaves(pendingCounts);
    } catch (error) {
      console.error("Error fetching users:", error);
      alert("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserLeaves = async (userId) => {
    setLoading(true);
    try {
      const res = await getUserLeaveHistoryApi(
        userId,
        selectedYear,
        selectedMonth,
      );
      const data = res.data?.data || res.data || {};
      setSelectedUser(data.user);
      setUserLeaves(data.leaves || []);
    } catch (error) {
      console.error("Error fetching user leaves:", error);
      alert("Failed to fetch leave history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = users;

    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (roleFilter) {
      filtered = filtered.filter((user) => user.role?.name === roleFilter);
    }

    if (departmentFilter) {
      filtered = filtered.filter(
        (user) => user.department?._id === departmentFilter,
      );
    }

    setFilteredUsers(filtered);
  }, [searchQuery, roleFilter, departmentFilter, users]);

  useEffect(() => {
    if (selectedUser) {
      fetchUserLeaves(selectedUser._id);
    }
  }, [selectedYear, selectedMonth]);

  const handleUserClick = (user) => {
    setSelectedUser(user);
    fetchUserLeaves(user._id);
  };

  const handleBackToList = () => {
    setSelectedUser(null);
    setUserLeaves([]);
    setStatusFilter("");
  };

  const handleStatusUpdate = async (leaveId, newStatus) => {
    try {
      await updateSuperAdminLeaveStatusApi(leaveId, newStatus);
      alert(`Leave ${newStatus.toLowerCase()} successfully`);
      fetchUserLeaves(selectedUser._id);

      // Update pending count for the user
      if (newStatus !== "PENDING") {
        setUserPendingLeaves((prev) => ({
          ...prev,
          [selectedUser._id]: Math.max(0, (prev[selectedUser._id] || 0) - 1),
        }));
      }
    } catch (error) {
      console.error("Error updating leave status:", error);
      alert("Failed to update leave status");
    }
  };

  const generateReport = () => {
    const csvContent = [
      [
        "Name",
        "Email",
        "Department",
        "Leave Type",
        "From Date",
        "To Date",
        "Duration",
        "Reason",
        "Status",
        "Applied On",
      ],
      ...filteredLeaves.map((leave) => [
        leave.user?.name || "N/A",
        leave.user?.email || "N/A",
        leave.user?.department?.name || "N/A",
        leave.leaveType,
        new Date(leave.fromDate).toLocaleDateString(),
        new Date(leave.toDate).toLocaleDateString(),
        leave.isHalfDay ? "Half Day" : "Full Day",
        leave.reason,
        leave.status,
        new Date(leave.createdAt).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leave-report-${selectedUser?.name || "all"}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const uniqueDepartments = Array.from(
    new Set(users.map((u) => u.department?._id).filter(Boolean)),
  ).map((id) => users.find((u) => u.department?._id === id)?.department);

  const uniqueRoles = Array.from(
    new Set(users.map((u) => u.role?.name).filter(Boolean)),
  );

  const filteredLeaves = userLeaves.filter(
    (leave) => !statusFilter || leave.status === statusFilter,
  );

  const leaveStats = {
    total: filteredLeaves.length,
    pending: filteredLeaves.filter((l) => l.status === "PENDING").length,
    approved: filteredLeaves.filter((l) => l.status === "APPROVED").length,
    rejected: filteredLeaves.filter((l) => l.status === "REJECTED").length,
  };

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i,
  );
  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  return (
    <div className="min-h-screen">
      <Sidebar />
      <Navbar />

      <div className="md:ml-64 pt-20 p-6">
        {!selectedUser ? (
          <>
            {/* User List View */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                <Calendar className="text-indigo-600" />
                Leave Management - All Users
              </h1>
              <p className="text-[var(--text-secondary)] mt-2">
                Select a user to view their leave history
              </p>
            </div>

            {/* User Filters */}
            <div className="bg-[var(--bg-surface)] rounded-2xl shadow-sm border border-[var(--border)] p-6 mb-6">
              <div className="mb-4">
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <BellDot className="text-orange-500" size={20} />
                  <span className="font-semibold">
                    Total Pending Leaves:{" "}
                    {Object.values(userPendingLeaves).reduce(
                      (sum, count) => sum + count,
                      0,
                    )}
                  </span>
                </div>
              </div>

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
                      <option key={dept?._id} value={dept?._id}>
                        {dept?.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={() => {
                  setSearchQuery("");
                  setRoleFilter("");
                  setDepartmentFilter("");
                }}
                className="mt-4 bg-slate-600 text-white px-6 py-2 rounded-lg hover:bg-slate-700"
              >
                Reset Filters
              </button>
            </div>

            {/* Users Table */}
            <div className="bg-[var(--bg-surface)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--bg-elevated)] border-b">
                    <tr>
                      <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Name
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Email
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Role
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Department
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Leave Balance
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Notifications
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan="7"
                          className="text-center p-8 text-[var(--text-secondary)]"
                        >
                          Loading...
                        </td>
                      </tr>
                    ) : filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => {
                        const pendingCount = userPendingLeaves[user._id] || 0;
                        return (
                          <tr
                            key={user._id}
                            className="border-b hover:bg-[var(--bg-elevated)]"
                          >
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                  <UserIcon
                                    className="text-indigo-600"
                                    size={20}
                                  />
                                </div>
                                <div className="font-semibold text-[var(--text-primary)]">
                                  {user.name}
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-sm text-[var(--text-primary)]">
                              {user.email}
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-3 py-1 text-xs rounded-full font-semibold ${
                                  user.role?.name === "SUPER_ADMIN"
                                    ? "bg-purple-100 text-purple-800"
                                    : user.role?.name === "ADMIN"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-green-100 text-green-800"
                                }`}
                              >
                                {user.role?.name}
                              </span>
                            </td>
                            <td className="p-4 text-sm text-[var(--text-primary)]">
                              {user.department?.name || "N/A"}
                            </td>
                            <td className="p-4 text-sm text-[var(--text-primary)]">
                              {user.leaveBalance ? (
                                <div className="flex gap-2">
                                  <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                                    PL: {user.leaveBalance.PL || 0}
                                  </span>
                                  <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded">
                                    CL: {user.leaveBalance.CL || 0}
                                  </span>
                                  <span className="px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded">
                                    SL: {user.leaveBalance.SL || 0}
                                  </span>
                                </div>
                              ) : (
                                "N/A"
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-center">
                                {pendingCount > 0 ? (
                                  <div className="relative group cursor-pointer">
                                    <BellDot
                                      className="text-orange-500 animate-pulse"
                                      size={24}
                                    />
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                      {pendingCount}
                                    </span>
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                      {pendingCount} pending leave
                                      {pendingCount > 1 ? "s" : ""}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="relative group cursor-pointer">
                                    <Bell
                                      className="text-slate-300"
                                      size={24}
                                    />
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                      No pending leaves
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <button
                                onClick={() => handleUserClick(user)}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
                              >
                                View Leaves
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan="7"
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
        ) : (
          <>
            {/* User Leave Detail View */}
            <div className="mb-6">
              <button
                onClick={handleBackToList}
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-4"
              >
                <ArrowLeft size={20} />
                Back to User List
              </button>

              <div className="bg-[var(--bg-surface)] rounded-2xl shadow-sm border border-[var(--border)] p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                    <UserIcon className="text-indigo-600" size={28} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                      {selectedUser.name}
                    </h1>
                    <p className="text-[var(--text-secondary)]">
                      {selectedUser.email}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <span
                        className={`px-3 py-1 text-xs rounded-full font-semibold ${
                          selectedUser.role?.name === "SUPER_ADMIN"
                            ? "bg-purple-100 text-purple-800"
                            : selectedUser.role?.name === "ADMIN"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                        }`}
                      >
                        {selectedUser.role?.name}
                      </span>
                      <span className="px-3 py-1 text-xs rounded-full font-semibold bg-gray-100 text-gray-800">
                        {selectedUser.department?.name || "No Department"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Leave Balance */}
                {selectedUser.leaveBalance && (
                  <div className="grid grid-cols-4 gap-4 mt-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-600 font-semibold">
                        Privilege Leave
                      </p>
                      <p className="text-2xl font-bold text-blue-700">
                        {selectedUser.leaveBalance.PL || 0}
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-green-600 font-semibold">
                        Casual Leave
                      </p>
                      <p className="text-2xl font-bold text-green-700">
                        {selectedUser.leaveBalance.CL || 0}
                      </p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <p className="text-sm text-yellow-600 font-semibold">
                        Sick Leave
                      </p>
                      <p className="text-2xl font-bold text-yellow-700">
                        {selectedUser.leaveBalance.SL || 0}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-purple-600 font-semibold">
                        Duty Leave
                      </p>
                      <p className="text-2xl font-bold text-purple-700">
                        {selectedUser.leaveBalance.DL || 0}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[var(--bg-surface)] rounded-xl shadow-sm border border-[var(--border)] p-4">
                <p className="text-sm text-[var(--text-secondary)]">
                  Total Leaves
                </p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {leaveStats.total}
                </p>
              </div>
              <div className="bg-[var(--bg-surface)] rounded-xl shadow-sm border border-[var(--border)] p-4">
                <p className="text-sm text-[var(--text-secondary)]">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {leaveStats.pending}
                </p>
              </div>
              <div className="bg-[var(--bg-surface)] rounded-xl shadow-sm border border-[var(--border)] p-4">
                <p className="text-sm text-[var(--text-secondary)]">Approved</p>
                <p className="text-2xl font-bold text-green-600">
                  {leaveStats.approved}
                </p>
              </div>
              <div className="bg-[var(--bg-surface)] rounded-xl shadow-sm border border-[var(--border)] p-4">
                <p className="text-sm text-[var(--text-secondary)]">Rejected</p>
                <p className="text-2xl font-bold text-red-600">
                  {leaveStats.rejected}
                </p>
              </div>
            </div>

            {/* Leave Filters */}
            <div className="bg-[var(--bg-surface)] rounded-2xl shadow-sm border border-[var(--border)] p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                    Year
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-full border-2 border-[var(--border-strong)] p-2 rounded-lg focus:outline-none focus:border-indigo-500"
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                    Month
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="w-full border-2 border-[var(--border-strong)] p-2 rounded-lg focus:outline-none focus:border-indigo-500"
                  >
                    {months.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full border-2 border-[var(--border-strong)] p-2 rounded-lg focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={generateReport}
                    className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                  >
                    <Download size={18} />
                    Export CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Leaves Table */}
            <div className="bg-[var(--bg-surface)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--bg-elevated)] border-b">
                    <tr>
                      <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Leave Type
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Duration
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                        From Date
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                        To Date
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Reason
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Status
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Applied On
                      </th>
                      <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan="8"
                          className="text-center p-8 text-[var(--text-secondary)]"
                        >
                          Loading...
                        </td>
                      </tr>
                    ) : filteredLeaves.length > 0 ? (
                      filteredLeaves.map((leave) => (
                        <tr
                          key={leave._id}
                          className="border-b hover:bg-[var(--bg-elevated)]"
                        >
                          <td className="p-4 text-sm font-semibold text-[var(--text-primary)]">
                            {leave.leaveType}
                          </td>
                          <td className="p-4">
                            {leave.isHalfDay ? (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-semibold">
                                Half Day
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full font-semibold">
                                Full Day
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-sm text-[var(--text-primary)]">
                            {new Date(leave.fromDate).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-sm text-[var(--text-primary)]">
                            {new Date(leave.toDate).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-sm text-[var(--text-secondary)] max-w-xs truncate">
                            {leave.reason}
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-3 py-1 text-xs rounded-full font-semibold ${
                                leave.status === "APPROVED"
                                  ? "bg-green-100 text-green-800"
                                  : leave.status === "REJECTED"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {leave.status}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-[var(--text-primary)]">
                            {new Date(leave.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            {leave.status === "PENDING" && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    handleStatusUpdate(leave._id, "APPROVED")
                                  }
                                  className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-700"
                                >
                                  <Check size={14} />
                                  Approve
                                </button>
                                <button
                                  onClick={() =>
                                    handleStatusUpdate(leave._id, "REJECTED")
                                  }
                                  className="flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700"
                                >
                                  <X size={14} />
                                  Reject
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="8"
                          className="text-center p-8 text-[var(--text-secondary)]"
                        >
                          No leave records found for{" "}
                          {months.find((m) => m.value === selectedMonth)?.label}{" "}
                          {selectedYear}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
