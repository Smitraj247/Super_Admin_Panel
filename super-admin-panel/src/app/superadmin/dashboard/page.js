"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

import {
  Users,
  ShieldCheck,
  Building2,
  UserCog,
  TrendingUp,
  Activity,
  Clock,
} from "lucide-react";

import Link from "next/link";
import Calendar from "../../../components/Calendar";
import HolidayWidget from "../../../components/HolidayWidget";
import Sidebar from "../../../components/Sidebar";
import Navbar from "../../../components/Navbar";
import SuperAdminBroadcast from "../../../components/SuperAdminBroadcast";
import { Breadcrumb } from "../../../components/Breadcrumb";
import { getStatsApi } from "../../../services/superAdminApi";
import Loader from "../../../components/Loader";
import { ProtectedDashboardRoute } from "../../../components/ProtectedDashboardRoute";
import { ROLES } from "../../../utils/constants";

export default function SuperAdminDashboard() {
  const [loading, setLoading] = useState(true);

  const [data, setData] = useState({
    stats: { users: 0, admins: 0, departments: 0, roles: 0 },
    userGrowth: [],
    departmentUsage: [],
  });

  const activities = [
    {
      id: 1,
      text: "Admin Rahul created new department",
      time: "2 mins ago",
      type: "create",
    },
    {
      id: 2,
      text: "User Amit updated profile",
      time: "10 mins ago",
      type: "update",
    },
    {
      id: 3,
      text: "Role Manager updated permissions",
      time: "30 mins ago",
      type: "update",
    },
    {
      id: 4,
      text: "Super Admin deleted inactive user",
      time: "1 hour ago",
      type: "delete",
    },
  ];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getStatsApi();

        setData({
          stats: res.data.stats || {},
          userGrowth: res.data.userGrowth || [],
          departmentUsage: res.data.departmentUsage || [],
        });
      } catch (error) {
        console.error("Failed to fetch stats", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) return <Loader />;

  const statCards = [
    {
      title: "Total Users",
      value: data.stats.users,
      icon: Users,
      trend: "+12%",
      link: "/superadmin/users",
    },
    {
      title: "Active Admins",
      value: data.stats.admins,
      icon: ShieldCheck,
      trend: "+2",
      link: "/superadmin/admins",
    },
    {
      title: "Departments",
      value: data.stats.departments,
      icon: Building2,
      trend: "0",
      link: "/superadmin/departments",
    },
    {
      title: "System Roles",
      value: data.stats.roles,
      icon: UserCog,
      trend: "+1",
      link: "/superadmin/roles",
    },
  ];

  return (
    <ProtectedDashboardRoute requiredRole={ROLES.SUPER_ADMIN}>
      <div className="min-h-screen bg-[#F8FAFC]">
        <Sidebar />
        <Navbar />

        <main className="md:pl-64 pt-16">
          <div className="p-8">
            <Breadcrumb
              items={[
                { label: "Super Admin", href: "/superadmin/dashboard" },
                { label: "Dashboard" },
              ]}
            />
            <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-slate-500 font-medium mb-1">Overview</p>
                <h1 className="text-3xl font-bold text-slate-900">
                  Platform Dashboard
                </h1>
              </div>
              <SuperAdminBroadcast />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {statCards.map((card, i) => (
                <Link key={i} href={card.link}>
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                        <card.icon size={24} />
                      </div>

                      <span className="text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-600 rounded-lg flex items-center gap-1">
                        <TrendingUp size={12} />
                        {card.trend}
                      </span>
                    </div>

                    <p className="text-slate-500 text-sm mb-1">{card.title}</p>
                    <h2 className="text-3xl font-bold text-slate-900">
                      {card.value}
                    </h2>
                  </div>
                </Link>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 mb-10">
              <Calendar />
              <HolidayWidget />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xl font-bold mb-6">User Growth</h3>

                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.userGrowth}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />

                      <Area
                        type="monotone"
                        dataKey="users"
                        stroke="#4F46E5"
                        fill="#C7D2FE"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xl font-bold mb-6">Department Usage</h3>

                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.departmentUsage}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />

                      <Bar dataKey="users" fill="#466ee5" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Activity className="text-indigo-600" size={22} />
                Recent Activity
              </h3>

              <div className="space-y-6">
                {activities.map((a) => (
                  <div key={a.id} className="flex gap-4">
                    <div className="mt-1 h-3 w-3 rounded-full bg-blue-500"></div>

                    <div>
                      <p className="text-slate-700 font-medium">{a.text}</p>

                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Clock size={12} />
                        {a.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedDashboardRoute>
  );
}
