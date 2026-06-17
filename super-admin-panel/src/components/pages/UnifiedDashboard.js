"use client";

import {
  Calendar as CalendarIcon,
  Users,
  Clock,
  UserX,
  Coffee,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/Sidebar";
import LoadingScreen from "@/components/common/LoadingScreen";

// Import refactored components
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import StatCard from "@/components/dashboard/StatCard";
import AttendanceTracking from "@/components/dashboard/AttendanceTracking";
import AttendanceHistory from "@/components/dashboard/AttendanceHistory";
import UpcomingBirthdays from "@/components/dashboard/UpcomingBirthdays";
import LeaveAndHolidaySection from "@/components/dashboard/LeaveAndHolidaySection";

// Import custom hooks
import { useUnifiedDashboardData } from "@/hooks/useUnifiedDashboardData";
import { useAttendanceStats } from "@/hooks/useAttendanceStats";
import { useAttendanceAction } from "@/hooks/useAttendanceAction";

/**
 * Unified Dashboard Component
 * Main dashboard for attendance tracking, leaves, and statistics
 * Refactored for scalability and maintainability
 */

export default function UnifiedDashboard() {
  const { user, isAuthenticated } = useAuth();   

  if (!user || !isAuthenticated()) {
    return null;
  }
  // const { user } = useAuth();

  // Data fetching hook
  const {
    stats,
    history,
    monthlyRecords,
    monthlySummary,
    leaves,
    holidays,
    loading,
    refetch: refetchData,
  } = useUnifiedDashboardData();

  // Derived state calculations
  const {
    isCheckedIn,
    isOnBreak,
    hasCheckedInToday,
    lateCount,
    actualAbsent,
    displayValues,
  } = useAttendanceStats(stats, monthlyRecords, monthlySummary, leaves);

  // Attendance action handler
  const { executeAction: handleAttendanceAction } = useAttendanceAction(
    (data) => {
      // Data will be refetched automatically via the hook
      refetchData(true);
    },
  );

  if (loading) {
    return (
      <main className="min-h-screen">
        <Navbar />
        <Sidebar />
        <LoadingScreen />
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <Sidebar />

      <div className="sidebar-aware pt-20">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">
          {/* Header Section */}
          <DashboardHeader />

          {/* Stat Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 auto-rows-fr">
            <StatCard
              title="Days Present"
              color="green"
              value={displayValues.present}
              icon={<Users className="w-5 h-5" />}
            />
            <StatCard
              title="Work Hours"
              color="blue"
              value={`${displayValues.workHours}h`}
              icon={<Clock className="w-5 h-5" />}
            />
            <StatCard
              title="Late Check-ins"
              color="orange"
              value={lateCount}
              icon={<Clock className="w-5 h-5" />}
            />
            <StatCard
              title="Days Absent"
              color="red"
              value={actualAbsent}
              icon={<UserX className="w-5 h-5" />}
            />
            <StatCard
              title="On Break"
              color="purple"
              value={isOnBreak ? "Yes" : "No"}
              icon={<Coffee className="w-5 h-5" />}
              sparkline={[0, 0, isOnBreak ? 1 : 0]}
            />
          </div>

          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            {/* Left Column */}
            <div className="xl:col-span-2 space-y-6">
              <AttendanceTracking
                isCheckedIn={isCheckedIn}
                isOnBreak={isOnBreak}
                hasCheckedInToday={hasCheckedInToday}
                userStatus={stats.userStatus}
                onAction={handleAttendanceAction}
              />
              <AttendanceHistory records={history} />
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <UpcomingBirthdays />
            </div>
          </div>

          {/* Leave and Holiday Section */}
          <LeaveAndHolidaySection leaves={leaves} holidays={holidays} />
        </div>
      </div>
    </main>
  );
}
