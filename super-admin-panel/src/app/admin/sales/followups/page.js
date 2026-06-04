"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

export default function SalesFollowUpsPage() {
  const [followUps, setFollowUps] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [leads, setLeads] = useState([]);
  const [newFollowUp, setNewFollowUp] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "Medium",
    leadId: "",
    type: "Call",
  });

  useEffect(() => {
    fetchFollowUps();
    fetchStats();
    fetchLeads();
  }, []);

  const fetchFollowUps = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/followups`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setFollowUps(data);
      }
    } catch (error) {
      toast.error("Failed to fetch follow-ups");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/followups/stats`,
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

  const fetchLeads = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/leads`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLeads(data);
      }
    } catch (error) {
      console.error("Failed to fetch leads");
    }
  };

  const handleCreateFollowUp = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/followups`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newFollowUp),
        }
      );

      if (response.ok) {
        toast.success("Follow-up created successfully");
        setShowCreate(false);
        setNewFollowUp({
          title: "",
          description: "",
          dueDate: "",
          priority: "Medium",
          leadId: "",
          type: "Call",
        });
        fetchFollowUps();
        fetchStats();
      } else {
        toast.error("Failed to create follow-up");
      }
    } catch (error) {
      toast.error("Error creating follow-up");
    }
  };

  const updateFollowUpStatus = async (followUpId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/followups/${followUpId}`,
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
        toast.success("Follow-up status updated");
        fetchFollowUps();
        fetchStats();
      } else {
        toast.error("Failed to update follow-up");
      }
    } catch (error) {
      toast.error("Error updating follow-up");
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      Pending: "bg-yellow-100 text-yellow-800",
      "In Progress": "bg-blue-100 text-blue-800",
      Completed: "bg-green-100 text-green-800",
      Cancelled: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getPriorityColor = (priority) => {
    const colors = {
      Low: "text-gray-600",
      Medium: "text-blue-600",
      High: "text-orange-600",
      Urgent: "text-red-600",
    };
    return colors[priority] || "text-gray-600";
  };

  const getTypeIcon = (type) => {
    const icons = {
      Call: "📞",
      Email: "📧",
      Meeting: "🤝",
      Task: "✅",
      Other: "📋",
    };
    return icons[type] || "📋";
  };

  const isOverdue = (dueDate, status) => {
    return (
      new Date(dueDate) < new Date() &&
      (status === "Pending" || status === "In Progress")
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading follow-ups...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Customer Follow-ups</h1>
          <p className="text-gray-600">Track and manage follow-up activities</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Create Follow-up
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-600 text-sm">Total</div>
            <div className="text-2xl font-bold">{stats.totalFollowUps}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-600 text-sm">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingFollowUps}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-600 text-sm">In Progress</div>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgressFollowUps}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-600 text-sm">Completed</div>
            <div className="text-2xl font-bold text-green-600">{stats.completedFollowUps}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-600 text-sm">Overdue</div>
            <div className="text-2xl font-bold text-red-600">{stats.overdueFollowUps}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-600 text-sm">Due Today</div>
            <div className="text-2xl font-bold text-orange-600">{stats.dueTodayFollowUps}</div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Create Follow-up</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Lead</label>
                <select
                  value={newFollowUp.leadId}
                  onChange={(e) => setNewFollowUp({ ...newFollowUp, leadId: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Select Lead</option>
                  {leads.map((lead) => (
                    <option key={lead._id} value={lead._id}>
                      {lead.name} - {lead.company}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={newFollowUp.title}
                  onChange={(e) => setNewFollowUp({ ...newFollowUp, title: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Follow-up title"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={newFollowUp.type}
                    onChange={(e) => setNewFollowUp({ ...newFollowUp, type: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="Call">Call</option>
                    <option value="Email">Email</option>
                    <option value="Meeting">Meeting</option>
                    <option value="Task">Task</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    value={newFollowUp.priority}
                    onChange={(e) => setNewFollowUp({ ...newFollowUp, priority: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Due Date</label>
                <input
                  type="datetime-local"
                  value={newFollowUp.dueDate}
                  onChange={(e) => setNewFollowUp({ ...newFollowUp, dueDate: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newFollowUp.description}
                  onChange={(e) => setNewFollowUp({ ...newFollowUp, description: e.target.value })}
                  className="w-full border rounded px-3 py-2 h-24"
                  placeholder="Follow-up details..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFollowUp}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Follow-ups List */}
      <div className="grid gap-4">
        {followUps.map((followUp) => (
          <div
            key={followUp._id}
            className={`bg-white rounded-lg shadow p-6 ${
              isOverdue(followUp.dueDate, followUp.status) ? "border-l-4 border-red-500" : ""
            }`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{getTypeIcon(followUp.type)}</span>
                  <h3 className="text-xl font-semibold">{followUp.title}</h3>
                  <span className={`px-3 py-1 rounded text-sm ${getStatusColor(followUp.status)}`}>
                    {followUp.status}
                  </span>
                  <span className={`text-sm font-medium ${getPriorityColor(followUp.priority)}`}>
                    {followUp.priority} Priority
                  </span>
                </div>
                {followUp.description && (
                  <p className="text-gray-600 mb-2">{followUp.description}</p>
                )}
                {followUp.leadId && (
                  <p className="text-sm text-blue-600 mb-2">
                    Lead: {followUp.leadId.name} - {followUp.leadId.company}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center text-sm">
              <div>
                <span className="text-gray-600">Due:</span>{" "}
                <span className={`font-medium ${isOverdue(followUp.dueDate, followUp.status) ? "text-red-600" : ""}`}>
                  {new Date(followUp.dueDate).toLocaleString()}
                </span>
                {isOverdue(followUp.dueDate, followUp.status) && (
                  <span className="ml-2 text-red-600 font-semibold">OVERDUE</span>
                )}
              </div>
              <div className="flex gap-2">
                {followUp.status === "Pending" && (
                  <button
                    onClick={() => updateFollowUpStatus(followUp._id, "In Progress")}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Start
                  </button>
                )}
                {(followUp.status === "Pending" || followUp.status === "In Progress") && (
                  <button
                    onClick={() => updateFollowUpStatus(followUp._id, "Completed")}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Complete
                  </button>
                )}
                {(followUp.status === "Pending" || followUp.status === "In Progress") && (
                  <button
                    onClick={() => updateFollowUpStatus(followUp._id, "Cancelled")}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {followUps.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            No follow-ups found
          </div>
        )}
      </div>
    </div>
  );
}
