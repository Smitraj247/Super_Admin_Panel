"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

export default function SalesReportsPage() {
  const [report, setReport] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [pipeline, setPipeline] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    fetchAllData();
  }, [dateRange]);

  const fetchAllData = async () => {
    await Promise.all([
      fetchReport(),
      fetchPerformance(),
      fetchPipeline(),
      fetchTimeline(),
    ]);
    setLoading(false);
  };

  const fetchReport = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (dateRange.startDate) queryParams.append("startDate", dateRange.startDate);
      if (dateRange.endDate) queryParams.append("endDate", dateRange.endDate);

      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/sales-reports?${queryParams}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReport(data);
      }
    } catch (error) {
      console.error("Failed to fetch report");
    }
  };

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
      console.error("Failed to fetch performance");
    }
  };

  const fetchPipeline = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/sales-reports/pipeline`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPipeline(data);
      }
    } catch (error) {
      console.error("Failed to fetch pipeline");
    }
  };

  const fetchTimeline = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/sales-reports/timeline`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTimeline(data);
      }
    } catch (error) {
      console.error("Failed to fetch timeline");
    }
  };

  const getActivityIcon = (type) => {
    const icons = {
      Lead: "👤",
      Meeting: "🤝",
      FollowUp: "📋",
      Email: "📧",
    };
    return icons[type] || "📌";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Sales Reports & Analytics</h1>
        <p className="text-gray-600">Track your performance and sales metrics</p>
      </div>

      {/* Date Filter */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setDateRange({ startDate: "", endDate: "" })}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Clear Filter
            </button>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      {performance && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">This Month Performance</h2>
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
              <div className="text-sm opacity-90">Revenue Generated</div>
              <div className="text-3xl font-bold">
                ${performance.thisMonth.revenue.toLocaleString()}
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow">
              <div className="text-sm opacity-90">Conversion Rate</div>
              <div className="text-3xl font-bold">{performance.thisMonth.conversionRate}%</div>
            </div>
          </div>

          {/* This Week Activities */}
          <div className="bg-white p-6 rounded-lg shadow mb-6">
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
                  <div className="text-gray-600 text-sm">Follow-ups Completed</div>
                  <div className="text-2xl font-bold">{performance.thisWeek.followUps}</div>
                </div>
                <div className="text-4xl">✅</div>
              </div>
              <div className="flex items-center justify-between p-4 bg-purple-50 rounded">
                <div>
                  <div className="text-gray-600 text-sm">Emails Sent</div>
                  <div className="text-2xl font-bold">{performance.thisWeek.emails}</div>
                </div>
                <div className="text-4xl">📧</div>
              </div>
            </div>
          </div>

          {/* Target Progress */}
          {performance.target && (
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h3 className="text-xl font-bold mb-4">Target Progress</h3>
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">
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
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Period:</span>{" "}
                  <span className="font-medium">{performance.target.targetPeriod}</span>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>{" "}
                  <span className="font-medium">{performance.target.status}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sales Pipeline */}
      {pipeline.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-2xl font-bold mb-4">Sales Pipeline</h2>
          <div className="space-y-4">
            {pipeline.map((stage) => (
              <div key={stage._id} className="border rounded p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-lg">{stage._id}</h3>
                  <div className="flex gap-4">
                    <span className="text-gray-600">
                      Leads: <span className="font-bold">{stage.count}</span>
                    </span>
                    <span className="text-gray-600">
                      Value: <span className="font-bold">${stage.totalValue.toLocaleString()}</span>
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${report ? (stage.count / report.totalLeads) * 100 : 0}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lead Statistics */}
      {report && (
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-2xl font-bold mb-4">Lead Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded">
              <div className="text-gray-600 text-sm">Total Leads</div>
              <div className="text-2xl font-bold">{report.totalLeads}</div>
            </div>
            <div className="p-4 bg-green-50 rounded">
              <div className="text-gray-600 text-sm">Won Leads</div>
              <div className="text-2xl font-bold text-green-600">{report.wonLeads}</div>
            </div>
            <div className="p-4 bg-blue-50 rounded">
              <div className="text-gray-600 text-sm">Conversion Rate</div>
              <div className="text-2xl font-bold text-blue-600">{report.conversionRate}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      {timeline.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4">Recent Activity Timeline</h2>
          <div className="space-y-3">
            {timeline.slice(0, 20).map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                <div className="text-2xl">{getActivityIcon(activity.type)}</div>
                <div className="flex-1">
                  <div className="font-semibold">{activity.title}</div>
                  <div className="text-sm text-gray-600">
                    {activity.type} - {activity.status}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(activity.date).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
