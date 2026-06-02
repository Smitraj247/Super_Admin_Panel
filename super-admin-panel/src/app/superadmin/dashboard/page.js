"use client";

import SuperAdminDashboard from "@/components/pages/SuperAdminDashboard";
import { ProtectedDashboardRoute } from "@/components/auth/ProtectedDashboardRoute";
import { ROLES } from "@/utils/constants";

export default function SuperAdminDashboardPage() {
  return (
    <ProtectedDashboardRoute requiredRole={ROLES.SUPER_ADMIN}>
      <SuperAdminDashboard />
    </ProtectedDashboardRoute>
  );
}

/* OLD CODE - KEEPING FOR REFERENCE
export default function SuperAdminDashboardOld() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [data, setData] = useState({
    stats: { users: 0, admins: 0, departments: 0, roles: 0 },
    userGrowth: [],
    departmentUsage: [],
    recentActivity: [],
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

  // Helper function to calculate time ago
  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} mins ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getStatsApi();

        setData({
          stats: res.data.stats || {},
          userGrowth: res.data.userGrowth || [],
          departmentUsage: res.data.departmentUsage || [],
          recentActivity: res.data.recentActivity || [],
        });
      } catch (error) {
        console.error("Failed to fetch stats", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    fetchStats();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await getStatsApi();
      setData({
        stats: res.data.stats || {},
        userGrowth: res.data.userGrowth || [],
        departmentUsage: res.data.departmentUsage || [],
        recentActivity: res.data.recentActivity || [],
      });
    } catch (error) {
      console.error("Failed to refresh stats", error);
    } finally {
      setRefreshing(false);
    }
  };

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
      <div className="min-h-screen bg-[var(--bg-base)]">
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
                <p className="text-[var(--text-secondary)] font-medium mb-1">Overview</p>
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">
                  Platform Dashboard
                </h1>
              </div>
              <SuperAdminBroadcast />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              {statCards.map((card, i) => (
                <Link key={i} href={card.link}>
                  <div className="bg-[var(--bg-surface)] p-6 rounded-3xl border border-[var(--border)] shadow-sm cursor-pointer hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                        <card.icon size={24} />
                      </div>

                      <span className="text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-600 rounded-lg flex items-center gap-1">
                        <TrendingUp size={12} />
                        {card.trend}
                      </span>
                    </div>

                    <p className="text-[var(--text-secondary)] text-sm mb-1">{card.title}</p>
                    <h2 className="text-3xl font-bold text-[var(--text-primary)]">
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
              <div className="bg-[var(--bg-surface)] p-8 rounded-2xl border border-[var(--border)] shadow-sm">
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

              <div className="bg-[var(--bg-surface)] p-8 rounded-2xl border border-[var(--border)] shadow-sm">
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

            <div className="bg-[var(--bg-surface)] p-8 rounded-2xl border border-[var(--border)] shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Activity className="text-indigo-600" size={22} />
                  Recent Activity
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Live
                  </span>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition disabled:opacity-50"
                    title="Refresh activity"
                  >
                    <RefreshCw
                      size={18}
                      className={`text-[var(--text-secondary)] ${refreshing ? "animate-spin" : ""}`}
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-6 overflow-y-auto max-h-[400px] pr-2">
                {data.recentActivity.length > 0 ? (
                  data.recentActivity.map((activity) => {
                    const timeAgo = getTimeAgo(activity.time);
                    return (
                      <div key={activity.id} className="flex gap-4">
                        <div className="mt-1 h-3 w-3 rounded-full bg-blue-500"></div>

                        <div className="flex-1">
                          <p className="text-[var(--text-primary)] font-medium">
                            {activity.text}
                          </p>
                          {activity.performedBy && (
                            <p className="text-xs text-[var(--text-secondary)] mt-1">
                              by {activity.performedBy}
                              {activity.targetUser &&
                                ` → ${activity.targetUser}`}
                              {activity.department &&
                                ` (${activity.department})`}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                            <Clock size={12} />
                            {timeAgo}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    No recent activity
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedDashboardRoute>
  );
}
*/

