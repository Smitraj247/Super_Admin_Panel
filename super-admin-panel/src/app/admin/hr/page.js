"use client";
import { useAuth } from "@/context/AuthContext";
import {
  Users,
  BarChart3,
  Calendar,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Shield,
  Settings,
  Users2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { useEffect, useState } from "react";
import { getUsers } from "@/services/userApi";
import { getAdminsApi } from "@/services/adminApi";
import { useRouter } from "next/navigation";
import AttendanceButtons from "@/components/AttendanceButtons";
import BroadcastMessage from "@/components/BroadcastMessage";
import Calander from "@/components/Calendar";
import HolidayWidget from "@/components/HolidayWidget";

import { ProtectedDashboardRoute } from "@/components/ProtectedDashboardRoute";
import { ROLES, DEPARTMENTS } from "@/utils/constants";

function HRAdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAdmins: 0,
    activeUsers: 0,
    totalLeaves: 0,
    pendingTasks: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError("");

    try {
      const [usersRes, adminsRes] = await Promise.all([
        getUsers(),
        getAdminsApi(),
      ]);

      const allUsers = usersRes.data;
      const allAdmins = adminsRes.data;

      const activeUsers = allUsers.filter(
        (u) => u.status !== "inactive",
      ).length;

      // Example logic for pending tasks
      const pendingTasks = allUsers.filter(
        (u) => u.status === "pending",
      ).length;

      setStats({
        totalUsers: allUsers.length,
        totalAdmins: allAdmins.length,
        activeUsers,
        totalLeaves: allUsers.length * 20,
        pendingTasks,
      });
      
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Auto-refresh every 30 seconds when enabled
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchStats();
      }, 30000); // 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  return (
    <ProtectedDashboardRoute
      requiredRole={ROLES.ADMIN}
      requiredDepartment={DEPARTMENTS.HR.name}
    >
      <main className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
        <Navbar />
        <Sidebar />

      <div className="lg:ml-64 pt-20">
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-12 flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-green-900 mb-2">
                HR Department Admin Dashboard
              </h1>
              <p className="text-green-700 text-lg">Welcome, {user?.name}!</p>
              {lastUpdated && (
                <p className="text-sm text-gray-500 mt-1">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <BroadcastMessage />
              
              <label className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Auto-refresh (30s)</span>
              </label>
              
              <button
                onClick={fetchStats}
                disabled={loading}
                className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>
          <div className="grid  grid-cols-1  gap-3 mb-10">
            <h1 className=" text-2xl font-bold text-green-900">
              Attendance System
            </h1>
               <AttendanceButtons userId={user?._id} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-7">
            <div className="bg-white rounded-2xl p-4 ">
              <Calander />
            </div>

            <div className="bg-white rounded-2xl p-4 h-[700px] overflow-y-auto shadow-md ">
              <HolidayWidget />
            </div>
          </div>

          {error && (
            <div className="bg-red-100 text-red-600 p-3 rounded mb-6">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-20 text-gray-500">
              Loading dashboard...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <Card
                  title="Total HR Users"
                  value={stats.totalUsers}
                  icon={<Users />}
                  color="blue"
                />
                <Card
                  title="Total Admins"
                  value={stats.totalAdmins}
                  icon={<Shield />}
                  color="purple"
                />
                <Card
                  title="Active Users"
                  value={stats.activeUsers}
                  icon={<TrendingUp />}
                  color="green"
                />
                <Card
                  title="Total Leave Days"
                  value={stats.totalLeaves}
                  icon={<Calendar />}
                  color="orange"
                />
              </div>

              {/* CONTENT */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Overview */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-8 shadow-lg border">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <BarChart3 size={24} />
                    Department Overview
                  </h2>

                  <div className="space-y-4">
                    <Box
                      label="Employee Count"
                      value={`${stats.totalUsers} employees`}
                      icon={<Users2 size={18} />}
                    />
                    <Box
                      label="Admin Count"
                      value={`${stats.totalAdmins} admins`}
                      icon={<Shield size={18} />}
                    />
                    <Box
                      label="Active Status"
                      value={`${stats.activeUsers} active (${((stats.activeUsers / stats.totalUsers) * 100).toFixed(0)}%)`}
                      icon={<TrendingUp size={18} />}
                    />
                    <Box
                      label="Leave Balance"
                      value="Avg 20 days per employee"
                      icon={<Calendar size={18} />}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-8 shadow-lg border">
                  <h2 className="text-xl font-bold mb-6">Quick Actions</h2>

                  <div className="space-y-3">
                    <Action
                      title="Manage Admins"
                      desc="Add and manage department admins"
                      icon={<Shield size={20} />}
                      onClick={() => router.push("/admin/hr/admins")}
                      color="purple"
                    />

                    <Action
                      title="Manage Users"
                      desc="Add, edit, or remove employees"
                      icon={<Users size={20} />}
                      onClick={() => router.push("/admin/hr/users")}
                      color="blue"
                    />

                    <Action
                      title="Manage Departments"
                      desc="Configure departments"
                      icon={<Settings size={20} />}
                      onClick={() => router.push("/admin/hr/departments")}
                      color="green"
                    />
                  </div>
                </div>
              </div>

              {/* Stats Summary */}
              <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-8 shadow-lg text-white">
                <h2 className="text-2xl font-bold mb-6">
                  HR Management Summary
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="border-l-4 border-green-300 pl-4">
                    <p className="text-green-100 text-sm">Total Workforce</p>
                    <p className="text-4xl font-bold">{stats.totalUsers}</p>
                    <p className="text-green-100 text-xs mt-1">
                      employees managed
                    </p>
                  </div>

                  <div className="border-l-4 border-green-300 pl-4">
                    <p className="text-green-100 text-sm">Administration</p>
                    <p className="text-4xl font-bold">{stats.totalAdmins}</p>
                    <p className="text-green-100 text-xs mt-1">
                      admins assigned
                    </p>
                  </div>

                  <div className="border-l-4 border-green-300 pl-4">
                    <p className="text-green-100 text-sm">Department Health</p>
                    <p className="text-4xl font-bold">
                      {stats.activeUsers > 0
                        ? (
                            (stats.activeUsers / stats.totalUsers) *
                            100
                          ).toFixed(0)
                        : 0}
                      %
                    </p>
                    <p className="text-green-100 text-xs mt-1">
                      active employees
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
    </ProtectedDashboardRoute>
  );
}

export default function HRAdminPage() {
  return <HRAdminDashboard />;
}

function Card({ title, value, icon, color = "gray" }) {
  const colorClasses = {
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    green: "bg-green-500",
    orange: "bg-orange-500",
    gray: "bg-gray-500",
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow border hover:shadow-lg transition">
      <div className="flex justify-between mb-4">
        <h3 className="text-sm text-gray-600 font-medium">{title}</h3>
        <div className={`${colorClasses[color]} p-2 rounded-lg text-white`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function Box({ label, value, icon }) {
  return (
    <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-100 hover:border-green-300 transition">
      <div className="flex items-center gap-3 mb-1">
        <div className="text-green-600">{icon}</div>
        <p className="font-semibold text-gray-800">{label}</p>
      </div>
      <p className="text-base text-gray-700 font-medium ml-9">{value}</p>
    </div>
  );
}

function Action({ title, desc, onClick, icon, color }) {
  const colorClasses = {
    purple: "hover:bg-purple-50 border-purple-200",
    blue: "hover:bg-blue-50 border-blue-200",
    green: "hover:bg-green-50 border-green-200",
  };

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 bg-gray-50 rounded-lg text-left transition border ${colorClasses[color]} flex items-center gap-3`}
    >
      <div className="flex-shrink-0">{icon}</div>
      <div className="flex-1">
        <p className="font-semibold text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">{desc}</p>
      </div>
    </button>
  );
}
