"use client";

import { Calendar, ArrowLeft, User as UserIcon } from "lucide-react";
import { useLeaves } from "@/hooks/useLeaves";
import LeaveFilters from "@/components/features/leaves/LeaveFilters";
import LeaveTable from "@/components/features/leaves/LeaveTable";

export default function SuperAdminLeaves() {
  const {
    filteredUsers,
    selectedUser,
    userLeaves,
    loading,
    searchQuery,
    setSearchQuery,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    statusFilter,
    setStatusFilter,
    handleUserClick,
    handleBackToList,
    handleStatusUpdate,
    generateReport,
    downloadReport,
    filteredLeaves,
    leaveStats,
    years,
    months,
    totalPendingLeavesCount,
    userPendingLeaves,
  } = useLeaves();

  return (
    <div className="p-6">
        {!selectedUser ? (
          <>
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-xl sm:text-3xl font-bold flex items-center gap-3">
                <Calendar className="text-[var(--accent)]" />
                <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 dark:from-cyan-400 dark:via-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  Leave Management - All Users
                </span>
              </h1>
              <p className="text-cyan-600 mt-2">
                Select a user to view their leave history
              </p>
            </div>

            {/* Combined Filters + Table */}
            <div className="bg-[var(--bg-surface)] rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden">
              <LeaveFilters
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                years={years}
                months={months}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                downloadReport={downloadReport}
                totalPendingCount={totalPendingLeavesCount}
                resetFilters={handleBackToList}
              />
              <LeaveTable
                users={filteredUsers}
                loading={loading}
                userPendingLeaves={userPendingLeaves}
                onUserClick={handleUserClick}
              />
            </div>
          </>
        ) : (
          <>
            {/* User Leave Detail View */}
            <div className="mb-6">
              <button
                onClick={handleBackToList}
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-4 cursor-pointer font-semibold"
              >
                <ArrowLeft size={20} />
                Back to User List
              </button>

              <div className="bg-[var(--bg-surface)] rounded-2xl shadow-sm border border-[var(--border)] p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                    <UserIcon className="text-indigo-600" size={28} />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                      {selectedUser.name}
                    </h1>
                    <p className="text-[var(--text-secondary)]">
                      {selectedUser.email}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <span
                        className={`px-3 py-1 text-xs rounded-full font-semibold ${
                          selectedUser.role?.name === "SUPER_ADMIN"
                            ? "bg-purple-100 text-purple-800"
                            : selectedUser.role?.name === "ADMIN"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                        }`}
                      >
                        {selectedUser.role?.name}
                      </span>
                      <span className="px-3 py-1 text-xs rounded-full font-semibold bg-gray-100 text-gray-800">
                        {selectedUser.department?.name || "No Department"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Leave Balance */}
                {selectedUser.leaveBalance && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-blue-600 font-semibold">
                        Privilege Leave
                      </p>
                      <p className="text-2xl font-bold text-blue-700">
                        {selectedUser.leaveBalance.PL || 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Used: {selectedUser.leaveBalance.usedPL || 0}
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-green-600 font-semibold">
                        Casual Leave
                      </p>
                      <p className="text-2xl font-bold text-green-700">
                        {selectedUser.leaveBalance.usedCL || 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Used: {selectedUser.leaveBalance.usedCL || 0}
                      </p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <p className="text-sm text-yellow-600 font-semibold">
                        Sick Leave
                      </p>
                      <p className="text-2xl font-bold text-yellow-700">
                        {selectedUser.leaveBalance.SL || 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Used: {selectedUser.leaveBalance.usedSL || 0}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-purple-600 font-semibold">
                        Duty Leave
                      </p>
                      <p className="text-2xl font-bold text-purple-700">
                        {selectedUser.leaveBalance.DL || 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Used: {selectedUser.leaveBalance.usedDL || 0}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-[var(--bg-surface)] rounded-xl shadow-sm border border-[var(--border)] p-4">
                <p className="text-sm text-[var(--text-secondary)]">
                  Total Leaves
                </p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {leaveStats.total}
                </p>
              </div>
              <div className="bg-[var(--bg-surface)] rounded-xl shadow-sm border border-[var(--border)] p-4">
                <p className="text-sm text-[var(--text-secondary)]">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {leaveStats.pending}
                </p>
              </div>
              <div className="bg-[var(--bg-surface)] rounded-xl shadow-sm border border-[var(--border)] p-4">
                <p className="text-sm text-[var(--text-secondary)]">Approved</p>
                <p className="text-2xl font-bold text-green-600">
                  {leaveStats.approved}
                </p>
              </div>
              <div className="bg-[var(--bg-surface)] rounded-xl shadow-sm border border-[var(--border)] p-4">
                <p className="text-sm text-[var(--text-secondary)]">Rejected</p>
                <p className="text-2xl font-bold text-red-600">
                  {leaveStats.rejected}
                </p>
              </div>
            </div>

            {/* Leave Filters */}
            <LeaveFilters
              isDetailView={true}
              selectedYear={selectedYear}
              setSelectedYear={setSelectedYear}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              years={years}
              months={months}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              generateReport={generateReport}
            />

            {/* Leaves Table */}
            <LeaveTable
              isDetailView={true}
              leaves={filteredLeaves}
              loading={loading}
              onStatusUpdate={handleStatusUpdate}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              months={months}
            />
          </>
        )}
    </div>
  );
}
