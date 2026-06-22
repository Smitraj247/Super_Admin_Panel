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
import { toast } from "react-toastify";
import { CalendarRange } from "lucide-react";

const EMPTY_FORM = {
  leaveType: "",
  fromDate: "",
  toDate: "",
  reason: "",
  isHalfDay: false,
  halfDayPeriod: "FIRST_HALF",
};

export default function EmployeeLeavePage() {
  const [userLeaves, setUserLeaves] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [dlInfo, setDlInfo] = useState(null);
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
      setDlInfo(balanceRes.data.data.dlInfo);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  // Helper to compute leave days
  const getLeaveDays = (leave, d) => {
    if (leave.isHalfDay) return 0.5;
    return Math.ceil((new Date(leave.toDate) - d) / (1000 * 60 * 60 * 24)) + 1;
  };

  // Monthly PL/SL usage for the selected fromDate month
  const monthlyUsage = (() => {
    const target = form.fromDate ? new Date(form.fromDate) : new Date();
    const m = target.getMonth();
    const y = target.getFullYear();
    const sum = (type) =>
      userLeaves.reduce((acc, l) => {
        const d = new Date(l.fromDate);
        if (
          l.leaveType === type &&
          (l.status === "PENDING" || l.status === "APPROVED") &&
          d.getMonth() === m &&
          d.getFullYear() === y &&
          (!editingLeave || l._id !== editingLeave._id)
        ) {
          return acc + getLeaveDays(l, d);
        }
        return acc;
      }, 0);
    return { PL: sum("PL"), SL: sum("SL") };
  })();

  // Cycle PL/SL usage - use values from API
  const cycleUsage = {
    PL: leaveBalance?.cycleInfo?.usedPL || 0,
    SL: leaveBalance?.cycleInfo?.usedSL || 0,
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (new Date(form.toDate) < new Date(form.fromDate)) {
      toast.error("End date cannot be before start date");
      return;
    }
    setFormLoading(true);
    try {
      const res = editingLeave
        ? await updateUserLeaveApi(editingLeave._id, form)
        : await applyLeaveApi(form);

      if (res.data.success) {
        toast.success(
          editingLeave
            ? "Leave updated successfully"
            : "Leave applied successfully",
        );
        setForm(EMPTY_FORM);
        setShowForm(false);
        setEditingLeave(null);
        fetchLeaves();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Server error");
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (leave) => {
    setEditingLeave(leave);
    setForm({
      leaveType: leave.leaveType,
      fromDate: new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
      }).format(new Date(leave.fromDate)),
      toDate: new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
      }).format(new Date(leave.toDate)),
      reason: leave.reason,
      isHalfDay: leave.isHalfDay || false,
      halfDayPeriod: leave.halfDayPeriod || "FIRST_HALF",
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
      toast.error(err.response?.data?.message || "Error deleting leave");
    }
  };

  const isLeaveDatePassed = (fromDate) => {  
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(fromDate);
    d.setHours(0, 0, 0, 0);
    return d < today;
  };

  const statusColor = (s) =>
    s === "APPROVED"
      ? "bg-green-200 text-green-800"
      : s === "REJECTED"
        ? "bg-red-200 text-red-800"
        : "bg-yellow-200 text-yellow-800";

  return (
    <main className="min-h-screen">
      <Sidebar />
      <Navbar />
      <div className="lg:ml-64 pt-18">
        <div className="p-6 space-y-6 min-h-screen">
          {/* Leave Balance Cards */}
          {leaveBalance && (
            <div className="space-y-6">
              {/* Cycle Details */}
              <div className="bg-white p-6 rounded-lg shadow-md border border-blue-200">
                <div className="flex items-center gap-2 mb-5">
                  <CalendarRange className="w-6 h-6 text-indigo-600 shrink-0" />

                  <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Leave Application Cycle ({leaveBalance.cycleInfo.cycleLabel}
                    )
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    {
                      label: "Privilege Leave (PL)",
                      key: "PL",
                      color: "from-blue-500 to-blue-600",
                      sub:
                        monthlyUsage.PL >= 1
                          ? `Monthly limit reached (${cycleUsage.PL}/${leaveBalance.cycleInfo.allocatedPL} used this cycle)`
                          : `✓ ${monthlyUsage.PL % 1 === 0 ? monthlyUsage.PL : monthlyUsage.PL.toFixed(1)}/1 this month (${cycleUsage.PL % 1 === 0 ? cycleUsage.PL : cycleUsage.PL.toFixed(1)}/${leaveBalance.cycleInfo.allocatedPL} this cycle)`,
                    },
                    {
                      label: "Casual Leave (CL)",
                      key: "CL",
                      color: "from-green-500 to-green-600",
                      sub: "Available",
                      displayValue:
                        leaveBalance.leaveBalance.CL === "Unlimited" ||
                        leaveBalance.leaveBalance.CL >= 9999
                          ? "Unlimited"
                          : leaveBalance.leaveBalance.CL,
                    },
                    {
                      label: "Sick Leave (SL)",
                      key: "SL",
                      color: "from-orange-500 to-orange-600",
                      sub:
                        monthlyUsage.SL >= 1
                          ? `Monthly limit reached (${cycleUsage.SL}/${leaveBalance.cycleInfo.allocatedSL} used this cycle)`
                          : `✓ ${monthlyUsage.SL % 1 === 0 ? monthlyUsage.SL : monthlyUsage.SL.toFixed(1)}/1 this month (${cycleUsage.SL % 1 === 0 ? cycleUsage.SL : cycleUsage.SL.toFixed(1)}/${leaveBalance.cycleInfo.allocatedSL} this cycle)`,
                    },
                    {
                      label: "Duty Leave (DL)",
                      key: "DL",
                      color: "from-purple-500 to-purple-600",
                      displayValue:
                        dlInfo?.currentBalance % 1 === 0
                          ? dlInfo?.currentBalance
                          : dlInfo?.currentBalance.toFixed(1) || 0,
                      sub:
                        dlInfo?.breakdown &&
                        (dlInfo.breakdown.PL.length > 0 ||
                          dlInfo.breakdown.SL.length > 0)
                          ? `From Unused PL: ${dlInfo.breakdown.PL.join(", ") || "None"} | SL: ${dlInfo.breakdown.SL.join(", ") || "None"}`
                          : "✗ No balance (earn DL from unused PL/SL)",
                    },
                  ].map(({ label, key, color, sub, displayValue }) => (
                    <div
                      key={key}
                      className={`bg-gradient-to-br ${color} text-white p-4 rounded-lg shadow-lg`}
                    >
                      <p className="text-sm opacity-90">{label}</p>
                      <h3 className="text-3xl font-bold">
                        {displayValue !== undefined
                          ? displayValue
                          : leaveBalance.leaveBalance[key] % 1 === 0
                            ? leaveBalance.leaveBalance[key]
                            : leaveBalance.leaveBalance[key].toFixed(1)}
                      </h3>
                      <p className="text-xs opacity-75 mt-1">{sub}</p>
                    </div>
                  ))}

                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                    <p className="text-sm text-purple-700 mb-1">
                      Next Cycle Allocation
                    </p>
                    <p className="text-lg font-bold text-purple-800">
                      PL:{" "}
                      {leaveBalance.cycleInfo.nextCycleAllocation.PL % 1 === 0
                        ? leaveBalance.cycleInfo.nextCycleAllocation.PL
                        : leaveBalance.cycleInfo.nextCycleAllocation.PL.toFixed(
                            1,
                          )}{" "}
                      | SL: {leaveBalance.cycleInfo.nextCycleAllocation.SL}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Header + Add button */}
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-cyan-600">
              My Leave Applications
            </h3>
            <button
              onClick={() => {
                setEditingLeave(null);
                setForm(EMPTY_FORM);
                setShowForm(!showForm);
              }}
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
              dlInfo={dlInfo}
              monthlyUsage={monthlyUsage}
              cycleUsage={cycleUsage}
              formLoading={formLoading}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          )}

          {/* Leaves Table */}
          <div className="bg-white rounded-lg border border-blue-200 shadow overflow-hidden">
            {userLeaves.length === 0 ? (
              <p className="p-6 text-center text-gray-500">
                No leave requests yet. Click "+ Apply Leave" to submit one.
              </p>
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
                      <tr
                        key={leave._id}
                        className="border-t hover:bg-gray-50 transition"
                      >
                        <td className="p-4 max-w-xs truncate text-md text-gray-600 font-semibold">
                          {leave.leaveType}
                        </td>
                        <td className="p-4 max-w-xs truncate text-md text-gray-600">
                          {new Date(leave.fromDate).toLocaleDateString()}
                        </td>
                        <td className="p-4 max-w-xs truncate text--md text-gray-600">
                          {new Date(leave.toDate).toLocaleDateString()}
                        </td>
                        <td className="p-4 max-w-xs truncate text--md text-gray-600">
                          {leave.isHalfDay ? (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                              Half Day
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="p-4 max-w-xs truncate text-md text-gray-600">
                          {leave.reason}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-3 py-1 text-sm rounded-full font-semibold ${statusColor(leave.status)}`}
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
                              <span className="text-sm text-gray-400 italic">
                                Past
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
      </div>
    </main>
  );
}
