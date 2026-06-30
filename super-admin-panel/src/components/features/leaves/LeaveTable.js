import React from "react";
import { User as UserIcon, Bell, BellDot, Check, X } from "lucide-react";

const LeaveTable = React.memo(({
  isDetailView = false,
  users = [],
  leaves = [],
  loading = false,
  userPendingLeaves = {},
  onUserClick,
  onStatusUpdate,
  selectedMonth,
  selectedYear,
  months = [],
}) => {
  if (isDetailView) {
    return (
      <div className="bg-[var(--bg-surface)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[var(--bg-elevated)] border-b">
              <tr>
                <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">Leave Type</th>
                <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">Duration</th>
                <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">From Date</th>
                <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">To Date</th>
                <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">Reason</th>
                <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">Status</th>
                <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">Applied On</th>
                <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center p-8 text-[var(--text-secondary)]">
                    Loading...
                  </td>
                </tr>
              ) : leaves.length > 0 ? (
                leaves.map((leave) => (
                  <tr key={leave._id} className="border-b hover:bg-[var(--bg-elevated)]">
                    <td className="p-4 text-sm font-semibold text-[var(--text-primary)]">
                      {leave.leaveType}
                    </td>
                    <td className="p-4">
                      {leave.isHalfDay ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-semibold">
                          Half Day
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full font-semibold">
                          Full Day
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-[var(--text-primary)]">
                      {new Date(leave.fromDate).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-sm text-[var(--text-primary)]">
                      {new Date(leave.toDate).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-sm text-[var(--text-secondary)] max-w-xs truncate" title={leave.reason}>
                      {leave.reason}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 text-xs rounded-full font-semibold ${
                        leave.status === "APPROVED"
                          ? "bg-green-100 text-green-800"
                          : leave.status === "REJECTED"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {leave.status}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-[var(--text-primary)]">
                      {new Date(leave.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      {leave.status === "PENDING" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => onStatusUpdate(leave._id, "APPROVED")}
                            className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-700 font-semibold cursor-pointer transition"
                          >
                            <Check size={14} />
                            Approve
                          </button>
                          <button
                            onClick={() => onStatusUpdate(leave._id, "REJECTED")}
                            className="flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700 font-semibold cursor-pointer transition"
                          >
                            <X size={14} />
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center p-8 text-[var(--text-secondary)]">
                    No leave records found for {months.find((m) => m.value === selectedMonth)?.label} {selectedYear}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-[var(--bg-elevated)] border-b">
          <tr>
            <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">Name</th>
            <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">Total Office</th>
            <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">Total Worked</th>
            <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">Total Leaves Applied</th>
            <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">Leave Balance</th>
            <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">Notifications</th>
            <th className="p-4 text-left text-sm font-semibold text-[var(--text-primary)]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="7" className="text-center p-8 text-[var(--text-secondary)]">
                Loading...
              </td>
            </tr>
          ) : users.length > 0 ? (
            users.map((user) => {
              const pendingCount = userPendingLeaves[user._id] || 0;
              return (
                <tr key={user._id} className="border-b hover:bg-[var(--bg-elevated)]">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <UserIcon className="text-indigo-600" size={20} />
                      </div>
                      <div className="font-semibold text-[var(--text-primary)]">
                        {user.name}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    {typeof user.totalHour === "number" ? `${user.totalHour.toFixed(1)}h` : "0.0h"}
                  </td>
                  <td className="p-4">
                    {typeof user.workingHour === "number" ? `${user.workingHour.toFixed(1)}h` : "0.0h"}
                  </td>
                  <td className="p-4">{user.totalLeavesApplied}</td>
                  <td className="p-4 text-sm text-[var(--text-primary)]">
                    {user.leaveBalance ? (
                      <div className="flex gap-2 flex-wrap">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                          PL: {user.leaveBalance.usedPL || 0}/{user.leaveBalance.monthlyPLTotal || 1}
                        </span>
                        <span className="px-2 py-1 bg-teal-50 text-teal-700 text-xs rounded">
                          Remaining PL: {user.leaveBalance.DL || 0}/{user.leaveBalance.PLTotal || 0}
                        </span>
                        <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded">
                          SL: {user.leaveBalance.usedSL || 0}/{user.leaveBalance.monthlySLTotal || 1}
                        </span>
                        <span className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded">
                          CL: {user.leaveBalance.usedCL || 0}
                        </span>
                        <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded">
                          DL: {user.leaveBalance.DL || 0}
                        </span>
                      </div>
                    ) : (
                      "N/A"
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center">
                      {pendingCount > 0 ? (
                        <div className="relative group cursor-pointer">
                          <BellDot className="text-orange-500 animate-pulse" size={24} />
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {pendingCount}
                          </span>
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            {pendingCount} pending leave{pendingCount > 1 ? "s" : ""}
                          </div>
                        </div>
                      ) : (
                        <div className="relative group cursor-pointer">
                          <Bell className="text-slate-300" size={24} />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            No pending leaves
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => onUserClick(user)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition font-medium cursor-pointer"
                    >
                      View Leaves
                    </button>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="7" className="text-center p-8 text-[var(--text-secondary)]">
                No users found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
});

LeaveTable.displayName = "LeaveTable";
export default LeaveTable;
