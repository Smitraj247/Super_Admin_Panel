"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/Sidebar";
import {
  getUserLeavesApi,
  getLeavesApi,
  applyLeaveApi,
  updateLeaveStatusApi,
  getUserLeaveBalanceApi,
  deleteUserLeaveApi,
  updateUserLeaveApi,
} from "@/services/leaveApi";

export default function HRLeaveDashboard() {
  const [activeTab, setActiveTab] = useState("personal");
  const [userLeaves, setUserLeaves] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [filteredLeaves, setFilteredLeaves] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [dlEligibility, setDlEligibility] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingLeave, setEditingLeave] = useState(null);

  const [form, setForm] = useState({
    leaveType: "",
    fromDate: "",
    toDate: "",
    reason: "",
  });

  const [formLoading, setFormLoading] = useState(false);

  const fetchLeaveBalance = async () => {
    try {
      const res = await getUserLeaveBalanceApi();
      console.log("Leave Balance Data:", res.data.data); // Debug log
      setLeaveBalance(res.data.data);
      setDlEligibility(res.data.data.dlEligibility);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchUserLeaves = async () => {
    try {
      const res = await getUserLeavesApi();
      setUserLeaves(res.data.data);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchAllLeaves = async () => {
    try {
      const res = await getLeavesApi();
      setAllLeaves(res.data.data);
      setFilteredLeaves(res.data.data);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchLeaves = async (showLoader = true) => {
    if (showLoader) setLoading(true);

    await Promise.all([
      fetchUserLeaves(),
      fetchAllLeaves(),
      fetchLeaveBalance(),
    ]);

    if (showLoader) setLoading(false);
  };

  // Calculate monthly usage from leaves data based on selected leave month
  const calculateMonthlyUsage = () => {
    // If fromDate is selected, use that month; otherwise use current month
    const targetDate = form.fromDate ? new Date(form.fromDate) : new Date();
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();

    const plCount = userLeaves.filter((leave) => {
      const leaveDate = new Date(leave.fromDate);
      return (
        leave.leaveType === "PL" &&
        (leave.status === "PENDING" || leave.status === "APPROVED") &&
        leaveDate.getMonth() === targetMonth &&
        leaveDate.getFullYear() === targetYear &&
        (!editingLeave || leave._id !== editingLeave._id) // Exclude current editing leave
      );
    }).length;

    const slCount = userLeaves.filter((leave) => {
      const leaveDate = new Date(leave.fromDate);
      return (
        leave.leaveType === "SL" &&
        (leave.status === "PENDING" || leave.status === "APPROVED") &&
        leaveDate.getMonth() === targetMonth &&
        leaveDate.getFullYear() === targetYear &&
        (!editingLeave || leave._id !== editingLeave._id) // Exclude current editing leave
      );
    }).length;

    console.log("Calculated Monthly Usage - PL:", plCount, "SL:", slCount);
    return { PL: plCount, SL: slCount };
  };

  const monthlyUsage = calculateMonthlyUsage();

  useEffect(() => {
    fetchLeaves(true);

    const interval = setInterval(() => {
      fetchLeaves(false);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let data = [...allLeaves];

    if (statusFilter !== "ALL") {
      data = data.filter((l) => l.status === statusFilter);
    }

    if (search) {
      data = data.filter((l) =>
        l.user?.name?.toLowerCase().includes(search.toLowerCase()),
      );
    }

    setFilteredLeaves(data);
  }, [statusFilter, search, allLeaves]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (!form.leaveType || !form.fromDate || !form.toDate || !form.reason) {
      alert("All fields are required");
      return false;
    }

    if (new Date(form.toDate) < new Date(form.fromDate)) {
      alert("End date cannot be before start date");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setFormLoading(true);

    try {
      let res;
      if (editingLeave) {
        res = await updateUserLeaveApi(editingLeave._id, form);
      } else {
        res = await applyLeaveApi(form);
      }

      if (res.data.success) {
        alert(
          editingLeave
            ? "Leave updated successfully"
            : "Leave applied successfully",
        );

        setForm({
          leaveType: "",
          fromDate: "",
          toDate: "",
          reason: "",
        });

        setShowForm(false);
        setEditingLeave(null);
        fetchLeaves();
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error("Error applying leave:", err);
      alert(err.response?.data?.message || "Server error");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (leave) => {
    if (leave.status !== "PENDING") {
      alert("Only pending leaves can be edited");
      return;
    }

    if (isLeaveDatePassed(leave.fromDate)) {
      alert("Cannot edit leave after the leave date has passed");
      return;
    }

    setEditingLeave(leave);
    setForm({
      leaveType: leave.leaveType,
      fromDate: new Date(leave.fromDate).toISOString().split("T")[0],
      toDate: new Date(leave.toDate).toISOString().split("T")[0],
      reason: leave.reason,
    });
    setShowForm(true);
    setActiveTab("personal");
  };

  const handleDelete = async (leaveId) => {
    if (!confirm("Are you sure you want to delete this leave?")) {
      return;
    }

    try {
      await deleteUserLeaveApi(leaveId);
      alert("Leave deleted successfully");
      fetchLeaves();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Error deleting leave");
    }
  };

  // Helper function to check if leave date has passed
  const isLeaveDatePassed = (fromDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const leaveDate = new Date(fromDate);
    leaveDate.setHours(0, 0, 0, 0);
    return leaveDate < today;
  };

  const handleCancelEdit = () => {
    setEditingLeave(null);
    setShowForm(false);
    setForm({
      leaveType: "",
      fromDate: "",
      toDate: "",
      reason: "",
    });
  };

  const updateStatus = async (id, status) => {
    try {
      await updateLeaveStatusApi(id, status);
      fetchLeaves();
    } catch (err) {
      console.error("Error updating leave status:", err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-200 text-yellow-800";
      case "APPROVED":
        return "bg-green-200 text-green-800";
      case "REJECTED":
        return "bg-red-200 text-red-800";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  const total = allLeaves.length;
  const pending = allLeaves.filter((l) => l.status === "PENDING").length;
  const approved = allLeaves.filter((l) => l.status === "APPROVED").length;
  const rejected = allLeaves.filter((l) => l.status === "REJECTED").length;

  return (
    <main className=" min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      <Sidebar />
      <Navbar />

      <div className="lg:ml-64 pt-14 ">
        <div className="p-6 space-y-6  min-h-screen rounded-tl-3xl">
          <h2 className="text-2xl font-bold">Leave Management</h2>

          <div className="flex gap-4 border-b">
            <button
              onClick={() => setActiveTab("personal")}
              className={`px-4 py-2 font-semibold transition ${
                activeTab === "personal"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              My Leaves
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 font-semibold transition ${
                activeTab === "all"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              All Leaves (Manage)
            </button>
          </div>

          {/* Personal Leaves Tab */}
          {activeTab === "personal" && (
            <div className="space-y-6">
              {/* Leave Balance Cards */}
              {leaveBalance && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg shadow-lg">
                    <p className="text-sm opacity-90">Privilege Leave (PL)</p>
                    <h3 className="text-3xl font-bold">
                      {leaveBalance.leaveBalance.PL}
                    </h3>
                    <p className="text-xs opacity-75 mt-1">
                      {(() => {
                        const targetDate = form.fromDate
                          ? new Date(form.fromDate)
                          : new Date();
                        const monthName = targetDate.toLocaleDateString(
                          "en-US",
                          { month: "short", year: "numeric" },
                        );
                        return monthlyUsage.PL >= 1
                          ? `Limit reached for ${monthName}`
                          : `✓ ${monthlyUsage.PL}/1 used in ${monthName}`;
                      })()}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg shadow-lg">
                    <p className="text-sm opacity-90">Casual Leave (CL)</p>
                    <h3 className="text-3xl font-bold">
                      {leaveBalance.leaveBalance.CL}
                    </h3>
                    <p className="text-xs opacity-75 mt-1">Available</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-lg shadow-lg">
                    <p className="text-sm opacity-90">Sick Leave (SL)</p>
                    <h3 className="text-3xl font-bold">
                      {leaveBalance.leaveBalance.SL}
                    </h3>
                    <p className="text-xs opacity-75 mt-1">
                      {(() => {
                        const targetDate = form.fromDate
                          ? new Date(form.fromDate)
                          : new Date();
                        const monthName = targetDate.toLocaleDateString(
                          "en-US",
                          { month: "short", year: "numeric" },
                        );
                        return monthlyUsage.SL >= 1
                          ? `Limit reached for ${monthName}`
                          : `✓ ${monthlyUsage.SL}/1 used in ${monthName}`;
                      })()}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-lg shadow-lg">
                    <p className="text-sm opacity-90">Duty Leave (DL)</p>
                    <h3 className="text-3xl font-bold">
                      {leaveBalance.leaveBalance.DL}
                    </h3>
                    <p className="text-xs opacity-75 mt-1">
                      {dlEligibility?.eligible
                        ? "✓ Eligible (No PL/CL last month)"
                        : "✗ Not eligible (PL/CL taken)"}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">My Leave Requests</h3>
                <button
                  onClick={() => {
                    setEditingLeave(null);
                    setShowForm(!showForm);
                  }}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  {showForm ? "Cancel" : "+ Add Leave"}
                </button>
              </div>

              {showForm && (
                <div className="bg-white p-6 rounded-lg shadow-lg border border-blue-200">
                  <h3 className="text-xl font-bold mb-4">
                    {editingLeave ? "Edit Leave" : "Apply for Leave"}
                  </h3>

                  {/* Warning Messages */}
                  {monthlyUsage.PL >= 1 && monthlyUsage.SL >= 1 && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                      ⚠️ Monthly limit reached for both PL and SL for{" "}
                      {form.fromDate
                        ? new Date(form.fromDate).toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                          })
                        : new Date().toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                          })}
                      . Only CL and DL are available.
                    </div>
                  )}
                  {monthlyUsage.PL >= 1 && monthlyUsage.SL < 1 && (
                    <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
                      ⚠️ Monthly limit reached for PL for{" "}
                      {form.fromDate
                        ? new Date(form.fromDate).toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                          })
                        : new Date().toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                          })}{" "}
                      ({monthlyUsage.PL}/1 used).
                    </div>
                  )}
                  {monthlyUsage.SL >= 1 && monthlyUsage.PL < 1 && (
                    <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
                      ⚠️ Monthly limit reached for SL for{" "}
                      {form.fromDate
                        ? new Date(form.fromDate).toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                          })
                        : new Date().toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                          })}{" "}
                      ({monthlyUsage.SL}/1 used).
                    </div>
                  )}

                  {/* DL Eligibility Warning */}
                  {dlEligibility && !dlEligibility.eligible && (
                    <div className="mb-4 p-3 bg-orange-100 border border-orange-400 text-orange-700 rounded">
                      ⚠️ DL (Duty Leave) is not available.{" "}
                      {dlEligibility.reason}. DL is only available when no PL or
                      CL is taken in the previous month.
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold mb-2">
                          Leave Type
                        </label>
                        <select
                          name="leaveType"
                          value={form.leaveType}
                          onChange={handleChange}
                          className="w-full border p-2 rounded focus:outline-none focus:border-blue-500"
                        >
                          <option value="">Select Leave Type</option>
                          <option value="PL" disabled={monthlyUsage.PL >= 1}>
                            Privilege Leave (PL) - Balance:{" "}
                            {leaveBalance?.leaveBalance.PL || 0}
                            {monthlyUsage.PL >= 1
                              ? ` (Limit reached for ${form.fromDate ? new Date(form.fromDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })})`
                              : ` (${monthlyUsage.PL}/1 for ${form.fromDate ? new Date(form.fromDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })})`}
                          </option>
                          <option value="CL">
                            Casual Leave (CL) - Balance:{" "}
                            {leaveBalance?.leaveBalance.CL || 0}
                          </option>
                          <option value="SL" disabled={monthlyUsage.SL >= 1}>
                            Sick Leave (SL) - Balance:{" "}
                            {leaveBalance?.leaveBalance.SL || 0}
                            {monthlyUsage.SL >= 1
                              ? ` (Limit reached for ${form.fromDate ? new Date(form.fromDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })})`
                              : ` (${monthlyUsage.SL}/1 for ${form.fromDate ? new Date(form.fromDate).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })})`}
                          </option>
                          <option
                            value="DL"
                            disabled={dlEligibility && !dlEligibility.eligible}
                          >
                            Duty Leave (DL) - Balance:{" "}
                            {leaveBalance?.leaveBalance.DL || 0}
                            {dlEligibility?.eligible
                              ? " (Eligible)"
                              : " (Not eligible - PL/CL taken last month)"}
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold mb-2">
                          Leave Duration
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            name="fromDate"
                            value={form.fromDate}
                            onChange={handleChange}
                            className="flex-1 border p-2 rounded focus:outline-none focus:border-blue-500"
                          />
                          <span className="flex items-center">→</span>
                          <input
                            type="date"
                            name="toDate"
                            value={form.toDate}
                            onChange={handleChange}
                            className="flex-1 border p-2 rounded focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold mb-2">Reason</label>
                      <textarea
                        name="reason"
                        value={form.reason}
                        onChange={handleChange}
                        className="w-full border p-2 rounded focus:outline-none focus:border-blue-500"
                        rows="3"
                        placeholder="Enter reason for leave..."
                      />
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={formLoading}
                        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        {formLoading
                          ? "Submitting..."
                          : editingLeave
                            ? "Update Leave"
                            : "Apply Leave"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Personal Leaves Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                {userLeaves.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No leave requests. Click "Add Leave" to apply for leave.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100 border-b">
                        <tr className="text-left">
                          <th className="p-4">Leave Type</th>
                          <th className="p-4">From Date</th>
                          <th className="p-4">To Date</th>
                          <th className="p-4">Reason</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Applied On</th>
                          <th className="p-4">Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {userLeaves.map((leave) => (
                          <tr
                            key={leave._id}
                            className="border-t hover:bg-gray-50 transition"
                          >
                            <td className="p-4 font-semibold">
                              {leave.leaveType}
                            </td>
                            <td className="p-4">
                              {new Date(leave.fromDate).toLocaleDateString()}
                            </td>
                            <td className="p-4">
                              {new Date(leave.toDate).toLocaleDateString()}
                            </td>
                            <td className="p-4 max-w-xs truncate text-sm text-gray-600">
                              {leave.reason}
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-3 py-1 text-sm rounded-full font-semibold ${getStatusColor(
                                  leave.status,
                                )}`}
                              >
                                {leave.status}
                              </span>
                            </td>
                            <td className="p-4 text-sm text-gray-600">
                              {new Date(leave.createdAt).toLocaleDateString()}
                            </td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                {leave.status === "PENDING" &&
                                  !isLeaveDatePassed(leave.fromDate) && (
                                    <button
                                      onClick={() => handleEdit(leave)}
                                      className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition"
                                    >
                                      Edit
                                    </button>
                                  )}
                                {!isLeaveDatePassed(leave.fromDate) && (
                                  <button
                                    onClick={() => handleDelete(leave._id)}
                                    className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition"
                                  >
                                    Delete
                                  </button>
                                )}
                                {isLeaveDatePassed(leave.fromDate) && (
                                  <span className="text-sm text-gray-500 italic">
                                    Past leave
                                  </span>
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
          )}

          {/* All Leaves Tab */}
          {activeTab === "all" && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold">
                All Employees' Leave Requests
              </h3>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-100 p-4 rounded shadow">
                  <p>Total</p>
                  <h2 className="text-xl font-bold">{total}</h2>
                </div>

                <div className="bg-yellow-100 p-4 rounded shadow">
                  <p>Pending</p>
                  <h2 className="text-xl font-bold">{pending}</h2>
                </div>

                <div className="bg-green-100 p-4 rounded shadow">
                  <p>Approved</p>
                  <h2 className="text-xl font-bold">{approved}</h2>
                </div>

                <div className="bg-red-100 p-4 rounded shadow">
                  <p>Rejected</p>
                  <h2 className="text-xl font-bold">{rejected}</h2>
                </div>
              </div>

              {/* Filters */}
              <div className="flex justify-between items-center gap-4">
                <input
                  type="text"
                  placeholder="Search by name..."
                  className="border px-3 py-2 rounded flex-1"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <select
                  className="border px-3 py-2 rounded"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              {/* All Leaves Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                  <div className="p-6 text-center text-gray-500">
                    Loading...
                  </div>
                ) : filteredLeaves.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    No Leaves Found
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100 border-b">
                        <tr className="text-left">
                          <th className="p-4">Name</th>
                          <th className="p-4">Department</th>
                          <th className="p-4">Type</th>
                          <th className="p-4">Dates</th>
                          <th className="p-4">Status</th>
                          <th className="p-4">Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {filteredLeaves.map((leave) => (
                          <tr
                            key={leave._id}
                            className="border-t hover:bg-gray-50 transition"
                          >
                            <td className="p-4">{leave.user?.name}</td>
                            <td className="p-4">{leave.department?.name}</td>
                            <td className="p-4">{leave.leaveType}</td>

                            <td className="p-4">
                              {new Date(leave.fromDate).toLocaleDateString()} →{" "}
                              {new Date(leave.toDate).toLocaleDateString()}
                            </td>

                            <td className="p-4">
                              <span
                                className={`px-3 py-1 text-sm rounded-full font-semibold ${getStatusColor(
                                  leave.status,
                                )}`}
                              >
                                {leave.status}
                              </span>
                            </td>

                            <td className="p-4 space-x-2">
                              {leave.status === "PENDING" ? (
                                <>
                                  <button
                                    onClick={() =>
                                      updateStatus(leave._id, "APPROVED")
                                    }
                                    className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition text-sm"
                                  >
                                    Approve
                                  </button>

                                  <button
                                    onClick={() =>
                                      updateStatus(leave._id, "REJECTED")
                                    }
                                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition text-sm"
                                  >
                                    Reject
                                  </button>
                                </>
                              ) : (
                                <span className="text-gray-500 text-sm">
                                  No Action
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
