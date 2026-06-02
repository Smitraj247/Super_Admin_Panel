"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { getAttendanceSummary } from "@/services/attandanceApi";
import { getUserLeavesApi } from "@/services/leaveApi";

export default function AttendanceSummary({ startDate, endDate }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [leaves, setLeaves] = useState([]);

  const fetchSummary = useCallback(async () => {
    if (!startDate || !endDate) return;
    
    setLoading(true);
    try {
      const [attendanceRes, leavesRes] = await Promise.all([
        getAttendanceSummary(startDate, endDate),
        getUserLeavesApi()
      ]);
      
      setSummary(attendanceRes.data);
      setLeaves(leavesRes.data.data || []);
    } catch (err) {
      console.error("Error fetching summary:", err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Calculate approved leaves within the date range
  const approvedLeavesInRange = useMemo(() => {
    if (!startDate || !endDate || !leaves.length) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return leaves.filter(leave => {
      if (leave.status !== 'APPROVED') return false;
      
      const leaveStart = new Date(leave.fromDate);
      const leaveEnd = new Date(leave.toDate);
      
      // Check if leave overlaps with the date range
      return leaveStart <= end && leaveEnd >= start;
    }).reduce((total, leave) => {
      // Calculate days in the range
      const leaveStart = new Date(leave.fromDate);
      const leaveEnd = new Date(leave.toDate);
      const rangeStart = leaveStart < start ? start : leaveStart;
      const rangeEnd = leaveEnd > end ? end : leaveEnd;
      
      const days = Math.ceil((rangeEnd - rangeStart) / (1000 * 60 * 60 * 24)) + 1;
      return total + (leave.isHalfDay ? 0.5 : days);
    }, 0);
  }, [leaves, startDate, endDate]);

  // Memoize stats array to prevent recreation on every render
  const stats = useMemo(() => {
    if (!summary) return [];
    
    // Calculate actual absent (excluding approved leaves)
    const actualAbsent = Math.max(0, summary.absent - approvedLeavesInRange);
    
    return [
      { label: "Total Days", value: summary.totalDays, color: "bg-blue-100 text-blue-800" },
      { label: "Present", value: summary.present, color: "bg-green-100 text-green-800" },
      { label: "Absent", value: actualAbsent, color: "bg-red-100 text-red-800", subValue: approvedLeavesInRange > 0 ? `(${approvedLeavesInRange} on leave)` : null },
      { label: "On Leave", value: approvedLeavesInRange, color: "bg-rose-100 text-rose-800" },
      { label: "Late (After 10:15)", value: summary.late, color: "bg-orange-100 text-orange-800" },
      { label: "Half Day", value: summary.halfDay, color: "bg-yellow-100 text-yellow-800" },
      { label: "Total Work Hours", value: `${summary.totalWorkHours}h`, color: "bg-purple-100 text-purple-800" },
      { label: "Productivity", value: `${summary.productivity}%`, color: "bg-indigo-100 text-indigo-800" },
    ];
  }, [summary, approvedLeavesInRange]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <p className="text-gray-500">Loading summary...</p>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Attendance Summary</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className={`${stat.color} rounded-lg p-4`}>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm mt-1">{stat.label}</p>
              {stat.subValue && (
                <p className="text-xs mt-1 opacity-75">{stat.subValue}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Required Office Hours: {summary.totalOfficeHours}h</span>
          <span>Actual Work Hours: {summary.totalWorkHours}h</span>
        </div>
      </div>

    </div>
  );
}
