"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { ProtectedDashboardRoute } from "@/components/auth/ProtectedDashboardRoute";
import { ROLES, DEPARTMENTS } from "@/utils/constants";

function SalesUserLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: "", priority: "" });

  useEffect(() => {
    fetchLeads();
    fetchStats();
  }, [filter]);

  const fetchLeads = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filter.status) queryParams.append("status", filter.status);
      if (filter.priority) queryParams.append("priority", filter.priority);

      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/leads?${queryParams}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLeads(data);
      }
    } catch (error) {
      toast.error("Failed to fetch leads");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/leads/stats`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats");
    }
  };

  const updateLeadStatus = async (leadId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/leads/${leadId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        toast.success("Lead status updated");
        fetchLeads();
        fetchStats();
      } else {
        toast.error("Failed to update lead");
      }
    } catch (error) {
      toast.error("Error updating lead");
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      New: "bg-blue-100 text-blue-800",
      Contacted: "bg-purple-100 text-purple-800",
      Qualified: "bg-green-100 text-green-800",
      Proposal: "bg-yellow-100 text-yellow-800",
      Negotiation: "bg-orange-100 text-orange-800",
      Won: "bg-green-600 text-white",
      Lost: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
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
          <h1 className="text-3xl font-bold mb-6">My Leads</h1>

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-gray-600 text-sm">Total Leads</div>
                <div className="text-2xl font-bold">{stats.totalLeads}</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-gray-600 text-sm">Won Leads</div>
                <div className="text-2xl font-bold text-green-600">{stats.wonLeads}</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-gray-600 text-sm">Conversion Rate</div>
                <div className="text-2xl font-bold text-blue-600">{stats.conversionRate}%</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="text-gray-600 text-sm">Total Value</div>
                <div className="text-2xl font-bold text-purple-600">
                  ${stats.totalValue.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                className="border rounded px-3 py-2"
              >
                <option value="">All Status</option>
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Proposal">Proposal</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
              </select>
              <select
                value={filter.priority}
                onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
                className="border rounded px-3 py-2"
              >
                <option value="">All Priority</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leads.map((lead) => (
                  <tr key={lead._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                      <div className="text-sm text-gray-500">{lead.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.company}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={lead.status}
                        onChange={(e) => updateLeadStatus(lead._id, e.target.value)}
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(lead.status)}`}
                      >
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Proposal">Proposal</option>
                        <option value="Negotiation">Negotiation</option>
                        <option value="Won">Won</option>
                        <option value="Lost">Lost</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{lead.priority}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${lead.estimatedValue?.toLocaleString() || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {leads.length === 0 && (
              <div className="text-center py-12 text-gray-500">No leads assigned yet</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SalesUserLeadsPageWrapper() {
  return (
    <ProtectedDashboardRoute
      requiredRole={ROLES.USER}
      requiredDepartment={DEPARTMENTS.SALES.name}
    >
      <SalesUserLeadsPage />
    </ProtectedDashboardRoute>
  );
}
