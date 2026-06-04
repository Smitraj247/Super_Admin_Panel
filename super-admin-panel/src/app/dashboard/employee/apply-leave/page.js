"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/Sidebar";
import LeaveForm from "@/components/leave/LeaveForm";
import {
  getUserLeavesApi,
  applyLeaveApi,
  getUserLeaveBalanceApi,
  deleteUserLeaveApi,
  updateUserLeaveApi,
} from "@/services/leaveApi";

const EMPTY_FORM = { leaveType: "", fromDate: "", toDate: "", reason: "", isHalfDay: false };

export default function EmployeeLeavePage() {
  const [userLeaves, setUserLeaves] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [dlEligibility, setDlEligibility] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);

  const fetchLeaves = async () => {
    try {
      const [leavesRes, balanceRes] = await Promise.all([
        getUserLeavesApi(),
        getUserLeaveBalanceApi(),
      ]);
      setUserLeaves(leavesRes.data.data);
      setLeaveBalance(balanceRes.data.data);
      setDlEligibility(balanceRes.data.data.dlEligibility);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchLeaves(); }, []);

  // Monthly PL/SL usage for the selected fromDate month
  const monthlyUsage = (() => {
    const target = form.fromDate ? new Date(form.fromDate) : new Date();
    const m = target.getMonth();
    const y = target.getFullYear();
    const count = (type) =>
      userLeaves.filter((l) => {
        const d = new Date(l.fromDate);
        return (
          l.leaveType === type &&
          (l.status === "PENDING" || l.status === "APPROVED") &&
          d.getMonth() === m && d.getFullYear() === y &&
          (!editingLeave || l._id !== editingLeave._id)
        );
      }).length;
    return { PL: count("PL"), SL: count("SL") };
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (new Date(form.toDate) < new Date(form.fromDate)) {
      alert("End date cannot be before start date");
      return;
    }
    setFormLoading(true);
    try {
      const res = editingLeave
        ? await updateUserLeaveApi(editingLeave._id, form)
        : await applyLeaveApi(form);

      if (res.data.success) {
        alert(editingLeave ? "Leave updated successfully" : "Leave applied successfully");
        setForm(EMPTY_FORM);
        setShowForm(false);
        setEditingLeave(null);
        fetchLeaves();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Server error");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (leave) => {
    setEditingLeave(leave);
    setForm({
      leaveType: leave.leaveType,
      fromDate: new Date(leave.fromDate).toISOString().split("T")[0],
      toDate: new Date(leave.toDate).toISOString().split("T")[0],
      reason: leave.reason,
      isHalfDay: leave.isHalfDay || false,
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingLeave(null);
    setShowForm(false);
    setForm(EMPTY_FORM);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this leave request?")) return;
    try {
      await deleteUserLeaveApi(id);
      fetchLeaves();
    } catch (err) {
      alert(err.response?.data?.message || "Error deleting leave");
    }
  };

  const isLeaveDatePassed = (fromDate) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(fromDate); d.setHours(0, 0, 0, 0);
    return d < today;
  };

  const statusColor = (s) =>
    s === "APPROVED" ? "bg-green-200 text-green-800"
    : s === "REJECTED" ? "bg-red-200 text-red-800"
    : "bg-yellow-200 text-yellow-800";

  return (
    <main className="min-h-screen">
      <Sidebar />
      <Navbar />
      <div className="lg:ml-64 pt-14">
        <div className="p-6 space-y-6 min-h-screen">
          <h2 className="text-2xl font-bold">My Leave Requests</h2>

          {/* Leave Balance Cards */}
          {leaveBalance && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Privilege Leave (PL)", key: "PL", color: "from-blue-500 to-blue-600",
                  sub: monthlyUsage.PL >= 1 ? `Limit reached` : `✓ ${monthlyUsage.PL}/1 used` },
                { label: "Casual Leave (CL)", key: "CL", color: "from-green-500 to-green-600", sub: "Available" },
                { label: "Sick Leave (SL)", key: "SL", color: "from-orange-500 to-orange-600",
                  sub: monthlyUsage.SL >= 1 ? `Limit reached` : `✓ ${monthlyUsage.SL}/1 used` },
                { label: "Duty Leave (DL)", key: "DL", color: "from-purple-500 to-purple-600",
                  sub: dlEligibility?.eligible ? "✓ Eligible" : "✗ Not eligible (PL/CL taken)" },
              ].map(({ label, key, color, sub }) => (
                <div key={key} className={`bg-gradient-to-br ${color} text-white p-4 rounded-lg shadow-lg`}>
                  <p className="text-sm opacity-90">{label}</p>
                  <h3 className="text-3xl font-bold">{leaveBalance.leaveBalance[key]}</h3>
                  <p className="text-xs opacity-75 mt-1">{sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* Header + Add button */}
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">My Leave Applications</h3>
            <button
              onClick={() => { setEditingLeave(null); setForm(EMPTY_FORM); setShowForm(!showForm); }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {showForm ? "Cancel" : "+ Apply Leave"}
            </button>
          </div>

          {/* Leave Form */}
          {showForm && (
            <LeaveForm
              form={form}
              setForm={setForm}
              editingLeave={editingLeave}
              leaveBalance={leaveBalance}
              dlEligibility={dlEligibility}
              monthlyUsage={monthlyUsage}
              formLoading={formLoading}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          )}

          {/* Leaves Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {userLeaves.length === 0 ? (
              <p className="p-6 text-center text-gray-500">No leave requests yet. Click "+ Apply Leave" to submit one.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr className="text-left">
                      <th className="p-4">Type</th>
                      <th className="p-4">From</th>
                      <th className="p-4">To</th>
                      <th className="p-4">Half Day</th>
                      <th className="p-4">Reason</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Applied On</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userLeaves.map((leave) => (
                      <tr key={leave._id} className="border-t hover:bg-gray-50 transition">
                        <td className="p-4 font-semibold">{leave.leaveType}</td>
                        <td className="p-4">{new Date(leave.fromDate).toLocaleDateString()}</td>
                        <td className="p-4">{new Date(leave.toDate).toLocaleDateString()}</td>
                        <td className="p-4">
                          {leave.isHalfDay
                            ? <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">Half Day</span>
                            : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                        <td className="p-4 max-w-xs truncate text-sm text-gray-600">{leave.reason}</td>
                        <td className="p-4">
                          <span className={`px-3 py-1 text-sm rounded-full font-semibold ${statusColor(leave.status)}`}>
                            {leave.status}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-600">{new Date(leave.createdAt).toLocaleDateString()}</td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            {leave.status === "PENDING" && !isLeaveDatePassed(leave.fromDate) && (
                              <button onClick={() => handleEdit(leave)}
                                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition">
                                Edit
                              </button>
                            )}
                            {!isLeaveDatePassed(leave.fromDate) && (
                              <button onClick={() => handleDelete(leave._id)}
                                className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition">
                                Delete
                              </button>
                            )}
                            {isLeaveDatePassed(leave.fromDate) && (
                              <span className="text-sm text-gray-400 italic">Past</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
