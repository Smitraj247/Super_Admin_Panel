import Leave from "../models/Leave.js";
import User from "../models/User.models.js";
import Notification from "../models/Notification.js";
import Role from "../models/Roles.models.js";
import Department from "../models/Department.models.js";
import Attendance from "../models/Attendance.js";
import { emitEvent, SocketEvents } from "../utils/socketEmitter.js";

/**
 * Get the current time of day in IST to determine which half-day it is
 * @returns {string} - 'FIRST_HALF' (before 12:30) or 'SECOND_HALF' (after 12:30)
 */
const getCurrentHalfDayPeriod = () => {
  const now = new Date();
  const istParts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(istParts.find((p) => p.type === "hour").value);
  const minute = Number(istParts.find((p) => p.type === "minute").value);

  if (hour < 12 || (hour === 12 && minute < 30)) {
    return "FIRST_HALF";
  }
  return "SECOND_HALF";
};

/**
 * Check if a user can check in (accounting for half-day leave periods)
 * @param {ObjectId} userId - The user's ID
 * @returns {Promise<{canCheckIn: boolean, reason: string}>}
 */
export const canUserCheckIn = async (userId) => {
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
  const todayStart = new Date(todayStr + "T00:00:00.000Z");
  const todayEnd = new Date(todayStr + "T23:59:59.999Z");

  const todayLeaves = await Leave.find({
    user: userId,
    status: "APPROVED",
    fromDate: { $lte: todayEnd },
    toDate: { $gte: todayStart },
  });

  if (todayLeaves.length === 0) {
    return { canCheckIn: true, reason: null };
  }

  for (const leave of todayLeaves) {
    if (!leave.isHalfDay) {
      return {
        canCheckIn: false,
        reason: "You are on full-day leave today.",
      };
    }

    const currentPeriod = getCurrentHalfDayPeriod();
    if (leave.halfDayPeriod === currentPeriod) {
      return {
        canCheckIn: false,
        reason: `You are on ${leave.halfDayPeriod.replace("_", " ").toLowerCase()} leave now.`,
      };
    }
  }

  return { canCheckIn: true, reason: null };
};

/**
 * Calculate the number of leave days between two dates.
 * Returns 0.5 for half-day leaves.
 */
export const calcLeaveDays = (fromDate, toDate, isHalfDay) => {
  if (isHalfDay) return 0.5;
  const from = new Date(fromDate);
  const to = new Date(toDate);
  return Math.ceil(Math.abs(to - from) / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * Check for overlapping leave requests for a user.
 * Optionally exclude a specific leave id (for edits).
 */
export const checkOverlap = async (
  userId,
  fromDate,
  toDate,
  excludeId = null,
) => {
  const from = new Date(fromDate);
  const to = new Date(toDate);

  const query = {
    user: userId,
    status: { $in: ["PENDING", "APPROVED"] },
    fromDate: { $lte: to },
    toDate: { $gte: from },
  };

  if (excludeId) query._id = { $ne: excludeId };

  return Leave.find(query);
};

/**
 * Adjust (deduct or restore) a user's leave balance.
 * direction: -1 to deduct, +1 to restore
 * if usesCarriedPL is true, deduct/restore from PL balance instead of CL
 * DL is deducted from PL balance
 */
export const adjustLeaveBalance = async (
  userId,
  leaveType,
  days,
  direction,
  usesCarriedPL = false,
) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // If it's CL using carried PL OR DL, adjust PL balance instead
  const actualLeaveType =
    (leaveType === "CL" && usesCarriedPL) || leaveType === "DL"
      ? "PL"
      : leaveType;

  if (user.leaveBalance[actualLeaveType] === undefined) {
    throw new Error(`Invalid leave type: ${actualLeaveType}`);
  }

  // Regular CL is unlimited (sentinel 9999) — never adjust its numeric balance
  if (leaveType === "CL" && !usesCarriedPL) return user;

  if (direction === -1 && user.leaveBalance[actualLeaveType] < days) {
    throw new Error(`Insufficient ${actualLeaveType} balance for user`);
  }

  user.leaveBalance[actualLeaveType] += direction * days;
  await user.save();
  return user;
};

/**
 * Send a leave status notification to the employee.
 */
export const notifyLeaveStatus = async (leave, status, approvedBy) => {
  const linkMap = {
    "Super Admin": "/dashboard/employee/apply-leave",
    "HR Admin": "/dashboard/employee/apply-leave",
  };

  await Notification.create({
    userId: leave.user._id || leave.user,
    type: status === "APPROVED" ? "success" : "warning",
    title: `Leave ${status}`,
    message: `Your ${leave.leaveType} leave from ${new Date(leave.fromDate).toLocaleDateString()} to ${new Date(leave.toDate).toLocaleDateString()} has been ${status.toLowerCase()} by ${approvedBy}`,
    link: linkMap[approvedBy] || "/dashboard/employee/apply-leave",
  });
};

/**
 * Send a new leave application notification to Super Admins and HR Admins.
 */
export const notifyNewLeave = async (
  applicant,
  leaveType,
  fromDate,
  toDate,
) => {
  const [superAdminRole, adminRole, hrDepartment] = await Promise.all([
    Role.findOne({ name: "SUPER_ADMIN" }),
    Role.findOne({ name: "ADMIN" }),
    Department.findOne({ name: "HR" }),
  ]);

  const recipientIds = [];

  if (superAdminRole) {
    const superAdmins = await User.find({ role: superAdminRole._id }).select(
      "_id",
    );
    recipientIds.push(...superAdmins.map((u) => u._id.toString()));
  }

  if (adminRole && hrDepartment) {
    const hrAdmins = await User.find({
      role: adminRole._id,
      department: hrDepartment._id,
    }).select("_id");
    recipientIds.push(...hrAdmins.map((u) => u._id.toString()));
  }

  const unique = [...new Set(recipientIds)];
  if (unique.length === 0) return;

  await Notification.insertMany(
    unique.map((id) => ({
      userId: id,
      type: "info",
      title: "New Leave Application",
      message: `${applicant.name} applied for ${leaveType} leave from ${new Date(fromDate).toLocaleDateString()} to ${new Date(toDate).toLocaleDateString()}`,
      link: "/superadmin/leaves",
    })),
  );
};

/**
 * Get monthly usage stats (PL used, carried PL used as CL, etc.)
 */
export const getMonthlyUsageStats = async (
  userId,
  year,
  month,
  excludeId = null,
) => {
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0);

  const query = {
    user: userId,
    status: { $in: ["PENDING", "APPROVED"] },
    fromDate: { $gte: startOfMonth, $lte: endOfMonth },
  };

  if (excludeId) query._id = { $ne: excludeId };

  const leaves = await Leave.find(query);

  let plUsed = 0;
  let carriedPLUsed = 0;

  for (const leave of leaves) {
    const days = calcLeaveDays(leave.fromDate, leave.toDate, leave.isHalfDay);
    if (leave.leaveType === "PL") {
      plUsed += days;
    }
    if (leave.leaveType === "CL" && leave.usesCarriedPL) {
      carriedPLUsed += days;
    }
  }

  return { plUsed, carriedPLUsed };
};

/**
 * Check monthly leave limits (PL:1, SL:1, DL:1, carried PL as CL:1 per month)
 */
export const checkMonthlyLimit = async (
  userId,
  leaveType,
  fromDate,
  leaveDays = 0,
  excludeId = null,
  usesCarriedPL = false,
) => {
  const from = new Date(fromDate);
  const year = from.getFullYear();
  const month = from.getMonth();

  const { plUsed, carriedPLUsed } = await getMonthlyUsageStats(
    userId,
    year,
    month,
    excludeId,
  );

  if (leaveType === "PL" && plUsed + leaveDays > 1) {
    return `Maximum 1 PL day allowed per month. Already applied ${plUsed} day(s) this month.`;
  }

    if (leaveType === "SL") {
      const slQuery = {
        user: userId,
        leaveType: "SL",
        status: { $in: ["PENDING", "APPROVED"] },
        fromDate: {
          $gte: new Date(year, month, 1),
          $lte: new Date(year, month + 1, 0),
        },
      };
      if (excludeId) slQuery._id = { $ne: excludeId };

      const slLeaves = await Leave.find(slQuery);
      const slUsed = slLeaves.reduce(
        (sum, l) => sum + calcLeaveDays(l.fromDate, l.toDate, l.isHalfDay),
        0,
      );
      if (slUsed + leaveDays > 1) {
        return `Maximum 1 SL day allowed per month. Already applied ${slUsed} day(s) this month.`;
      }
    }

    if (leaveType === "DL") {
      const dlQuery = {
        user: userId,
        leaveType: "DL",
        status: { $in: ["PENDING", "APPROVED"] },
        fromDate: {
          $gte: new Date(year, month, 1),
          $lte: new Date(year, month + 1, 0),
        },
      };
      if (excludeId) dlQuery._id = { $ne: excludeId };

      const dlLeaves = await Leave.find(dlQuery);
      const dlUsed = dlLeaves.reduce(
        (sum, l) => sum + calcLeaveDays(l.fromDate, l.toDate, l.isHalfDay),
        0,
      );
      if (dlUsed + leaveDays > 1) {
        return `Maximum 1 DL day allowed per month. Already applied ${dlUsed} day(s) this month.`;
      }
    }

    if (leaveType === "CL" && usesCarriedPL && carriedPLUsed + leaveDays > 1) {
    return `Maximum 1 carried forward PL day can be used as CL per month. Already used ${carriedPLUsed} day(s) this month.`;
  }

  return null;
};

/**
 * Calculate DL balance dynamically on-the-fly.
 * Uses probation start date to determine when leave credits begin.
 * DL is earned from unused PL months.
 */
export const calculateDynamicDL = async (userId, year, month) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // DL/PL/SL eligibility is tied to probation start date.
  if (!user.probationStartDate) {
    return { netDL: 0, grossDL: 0, dlUsed: 0, breakdown: { PL: [], SL: [] } };
  }

  const now = new Date();
  const targetYear = year || now.getFullYear();
  const targetMonth = month || now.getMonth() + 1;
  const targetMonthStart = new Date(targetYear, targetMonth - 1, 1);
  const cycleStart =
    targetMonth - 1 < 6
      ? new Date(targetYear, 0, 1)
      : new Date(targetYear, 6, 1);

  // Leave credits start after probation (bonding) begins - use probationStartDate
  const effectiveDate = new Date(user.probationStartDate);

  const joiningMonthStart = new Date(
    effectiveDate.getFullYear(),
    effectiveDate.getMonth(),
    1,
  );

  const evalStart = new Date(
    Math.max(cycleStart.getTime(), joiningMonthStart.getTime()),
  );

  const leaves = await Leave.find({
    user: userId,
    leaveType: { $in: ["PL", "SL", "DL"] },
    status: { $in: ["PENDING", "APPROVED"] },
    fromDate: { $gte: evalStart },
  });

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  let grossDL = 0;
  const breakdown = { PL: [], SL: [] };

  let processDate = new Date(evalStart);

  while (processDate < targetMonthStart) {
    const year = processDate.getFullYear();
    const month = processDate.getMonth();
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);

    const plUsed = leaves
      .filter(
        (l) =>
          l.leaveType === "PL" &&
          new Date(l.fromDate) >= startOfMonth &&
          new Date(l.fromDate) <= endOfMonth,
      )
      .reduce(
        (acc, l) => acc + calcLeaveDays(l.fromDate, l.toDate, l.isHalfDay),
        0,
      );

    const unusedPL = Math.max(0, 1 - plUsed);

    if (unusedPL > 0) {
      grossDL += unusedPL;
      breakdown.PL.push(monthNames[month]);
    }

    processDate.setMonth(processDate.getMonth() + 1);
  }

  const dlUsed = leaves
    .filter((l) => l.leaveType === "DL")
    .reduce(
      (acc, l) => acc + calcLeaveDays(l.fromDate, l.toDate, l.isHalfDay),
      0,
    );

  return {
    netDL: grossDL - dlUsed,
    grossDL,
    dlUsed,
    breakdown,
  };
};

/**
 * Check DL eligibility — verify user has enough DL balance
 */
export const checkDLEligibility = async (userId, fromDate, days = 1) => {
  const { netDL } = await calculateDynamicDL(userId);
  if (netDL < days) {
    return `Insufficient DL balance. Available: ${netDL}, Required: ${days}. DL is credited from unused monthly PL allowances.`;
  }
  return null;
};

/**
 * Helper to convert Date to YYYY-MM-DD string (local time)
 */
const toDateStr = (d) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Helper to create Date from YYYY-MM-DD string (local time, no timezone shift)
 */
const localDate = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// We need to import recalculateRecordStatus? Wait recalculateRecordStatus is in attendanceService.js, but we can't import it here due to circular dependency! Let's replicate the logic for unmark, or fix!

/**
 * Mark/Unmark leave in attendance records (handles both full-day and half-day)
 */
export const markLeaveAttendance = async (
  userId,
  fromDate,
  toDate,
  isHalfDay,
  halfDayPeriod,
  action,
) => {
  const lc = localDate(toDateStr(new Date(fromDate)));
  const le = localDate(toDateStr(new Date(toDate)));

  while (lc <= le) {
    const dateStr = toDateStr(lc);

    if (action === "mark") {
      const existingAttendance = await Attendance.findOne({
        userId,
        date: dateStr,
      });

      if (existingAttendance) {
        if (isHalfDay) {
          existingAttendance.status = "HALF_DAY_LEAVE";
        } else {
          existingAttendance.checkIn = null;
          existingAttendance.checkOut = null;
          existingAttendance.breaks = [];
          existingAttendance.status = "ON_LEAVE";
        }
        await existingAttendance.save();
      } else {
        await Attendance.create({
          userId,
          date: dateStr,
          checkIn: null,
          checkOut: null,
          breaks: [],
          status: isHalfDay ? "HALF_DAY_LEAVE" : "ON_LEAVE",
        });
      }
    } else {
      // Unmark action
      const record = await Attendance.findOne({ userId, date: dateStr });
      if (record) {
        if (!record.checkIn) {
          await Attendance.deleteOne({ _id: record._id });
        } else {
          // Recalculate status properly
          if (record.checkOut) {
            record.status = "CHECKED_OUT";
          } else {
            const hasActiveBreak = (record.breaks || []).some(
              (b) => b.breakIn && !b.breakOut,
            );
            if (hasActiveBreak) {
              record.status = "ON_BREAK";
            } else if ((record.breaks || []).length > 0) {
              record.status = "BACK_TO_WORK";
            } else {
              record.status = record.isLate ? "LATE" : "CHECKED_IN";
            }
          }
          await record.save();
        }
      }
    }

    lc.setDate(lc.getDate() + 1);
  }
};

/**
 * Mark/Unmark half-day leave in attendance records (backward compatible)
 */
export const markHalfDayAttendance = async (userId, leaveDate, action) => {
  await markLeaveAttendance(userId, leaveDate, leaveDate, true, null, action);
};
