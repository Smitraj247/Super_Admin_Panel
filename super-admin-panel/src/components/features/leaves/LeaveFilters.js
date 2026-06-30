import React from "react";
import { Search, Download, RefreshCw } from "lucide-react";

const LeaveFilters = React.memo(({
  isDetailView = false,
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth,
  years = [],
  months = [],
  // List view specific props
  searchQuery = "",
  setSearchQuery,
  downloadReport,
  totalPendingCount,
  resetFilters,
  // Detail view specific props
  statusFilter = "",
  setStatusFilter,
  generateReport,
}) => {
  if (isDetailView) {
    return (
      <div className="bg-[var(--bg-surface)] rounded-2xl shadow-sm border border-[var(--border)] p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full border-2 border-[var(--border-strong)] p-2 rounded-lg focus:outline-none focus:border-indigo-500"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
              Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full border-2 border-[var(--border-strong)] p-2 rounded-lg focus:outline-none focus:border-indigo-500"
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border-2 border-[var(--border-strong)] p-2 rounded-lg focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={generateReport}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-bold transition"
            >
              <Download size={18} />
              Export CSV
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-elevated)]">
      {/* Top row: pending count + download */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <span className="font-semibold">
            Total Pending Leaves: {totalPendingCount}
          </span>
        </div>
        <button
          onClick={downloadReport}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-bold transition cursor-pointer"
        >
          Download Excel Report
        </button>
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
            Year
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="border-2 border-[var(--border-strong)] p-2 rounded-lg focus:outline-none focus:border-indigo-500 text-sm"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
            Month
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="border-2 border-[var(--border-strong)] p-2 rounded-lg focus:outline-none focus:border-indigo-500 text-sm"
          >
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
            Search User
          </label>
          <div className="relative">
            <Search
              className="absolute left-3 top-2.5 text-slate-400"
              size={16}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email"
              className="border-2 border-[var(--border-strong)] p-2 pl-9 rounded-lg focus:outline-none focus:border-indigo-500 text-sm w-56"
            />
          </div>
        </div>

        <button
          onClick={resetFilters}
          className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 text-sm font-semibold transition flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw size={14} />
          Reset Filters
        </button>
      </div>
    </div>
  );
});

LeaveFilters.displayName = "LeaveFilters";
export default LeaveFilters;
