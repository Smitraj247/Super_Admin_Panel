"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { ProtectedDashboardRoute } from "@/components/auth/ProtectedDashboardRoute";
import { ROLES, DEPARTMENTS } from "@/utils/constants";

function SalesUserReportsPage() {
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformance();
  }, []);

  const fetchPerformance = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/sales-reports/performance`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPerformance(data);
      }
    } catch (error) {
      toast.error("Failed to fetch performance data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Sidebar />
        <Navbar />
        <main className="md:pl-64 pt-16">
          <div className="flex justify-center items-center min-h-[80vh]">Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <Navbar />
      <main className="md:pl-64 pt-16">
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-6">My Performance</h1>

          {performance && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow">
                  <div className="text-sm opacity-90">Leads Generated</div>
                  <div className="text-3xl font-bold">{performance.thisMonth.leadsGenerated}</div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow">
                  <div className="text-sm opacity-90">Leads Won</div>
                  <div className="text-3xl font-bold">{performance.thisMonth.leadsWon}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow">
                  <div className="text-sm opacity-90">Revenue</div>
                  <div className="text-3xl font-bold">
                    ${performance.thisMonth.revenue.toLocaleString()}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow">
                  <div className="text-sm opacity-90">Conversion Rate</div>
                  <div className="text-3xl font-bold">{performance.thisMonth.conversionRate}%</div>
                </div>
              </div>

              {performance.target && (
                <div className="bg-white p-6 rounded-lg shadow mb-6">
                  <h3 className="text-xl font-bold mb-4">Target Progress</h3>
                  <div className="mb-4">
                    <div className="flex justify-between mb-2">
                      <span>
                        ${performance.target.achievedAmount.toLocaleString()} / $
                        {performance.target.targetAmount.toLocaleString()}
                      </span>
                      <span className="font-bold">{performance.targetProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-green-600 h-4 rounded-full"
                        style={{ width: `${Math.min(performance.targetProgress, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-bold mb-4">This Week Activities</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded">
                    <div>
                      <div className="text-gray-600 text-sm">Meetings</div>
                      <div className="text-2xl font-bold">{performance.thisWeek.meetings}</div>
                    </div>
                    <div className="text-4xl">🤝</div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded">
                    <div>
                      <div className="text-gray-600 text-sm">Follow-ups</div>
                      <div className="text-2xl font-bold">{performance.thisWeek.followUps}</div>
                    </div>
                    <div className="text-4xl">✅</div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded">
                    <div>
                      <div className="text-gray-600 text-sm">Emails</div>
                      <div className="text-2xl font-bold">{performance.thisWeek.emails}</div>
                    </div>
                    <div className="text-4xl">📧</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function SalesUserReportsPageWrapper() {
  return (
    <ProtectedDashboardRoute
      requiredRole={ROLES.USER}
      requiredDepartment={DEPARTMENTS.SALES.name}
    >
      <SalesUserReportsPage />
    </ProtectedDashboardRoute>
  );
}
