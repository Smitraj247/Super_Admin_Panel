import Leave from "../models/Leave.js";
import User from "../models/User.models.js";
import Notification from "../models/Notification.js";
import Role from "../models/Roles.models.js";
import Department from "../models/Department.models.js";
import Attendance from "../models/Attendance.js";
import { emitEvent, SocketEvents } from "../utils/socketEmitter.js";

/**
 * Get the current time of day in IST to determine which half-day it is
 * @returns {number} - 0 for FIRST_HALF (before 12:30), 1 for SECOND_HALF (after 12:30)
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
  // Assume 8.5h day: FIRST_HALF is up to 12:30, SECOND_HALF after
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

  // Find any approved leave that includes today
  const todayLeaves = await Leave.find({
    user: userId,
    status: "APPROVED",
    fromDate: { $lte: todayEnd },
    toDate: { $gte: todayStart },
  });

  if (todayLeaves.length === 0) {
    return { canCheckIn: true, reason: null };
  }

  // Check each leave
  for (const leave of todayLeaves) {
    if (!leave.isHalfDay) {
      // Full-day leave: cannot check in
      return {
        canCheckIn: false,
        reason: "You are on full-day leave today.",
      };
    }

    // Half-day leave: check which period it's for
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
 */
export const adjustLeaveBalance = async (
  userId,
  leaveType,
  days,
  direction,
) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  if (user.leaveBalance[leaveType] === undefined) {
    throw new Error(`Invalid leave type: ${leaveType}`);
  }

  // CL is unlimited (sentinel 9999) — never adjust its numeric balance
  if (leaveType === "CL") return user;

  if (direction === -1 && user.leaveBalance[leaveType] < days) {
    throw new Error(`Insufficient leave balance for user`);
  }

  user.leaveBalance[leaveType] += direction * days;
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
 * Check monthly PL/SL application limit (max 1 day per month).
 */
export const checkMonthlyLimit = async (
  userId,
  leaveType,
  fromDate,
  leaveDays = 0,
  excludeId = null,
) => {
  if (leaveType !== "PL" && leaveType !== "SL") return null;

  const from = new Date(fromDate);
  const startOfMonth = new Date(from.getFullYear(), from.getMonth(), 1);
  const endOfMonth = new Date(from.getFullYear(), from.getMonth() + 1, 0);

  const query = {
    user: userId,
    leaveType,
    status: { $in: ["PENDING", "APPROVED"] },
    fromDate: { $gte: startOfMonth, $lte: endOfMonth },
  };

  if (excludeId) query._id = { $ne: excludeId };

  const leaves = await Leave.find(query);
  const totalDaysUsed = leaves.reduce(
    (sum, l) => sum + calcLeaveDays(l.fromDate, l.toDate, l.isHalfDay),
    0,
  );

  if (totalDaysUsed + leaveDays > 1) {
    return `Maximum 1 ${leaveType} day allowed per month. Already applied ${totalDaysUsed} day(s) this month.`;
  }
  return null;
};

/**
 * Calculate DL balance dynamically on-the-fly.
 * It checks the missed months in the current cycle from joining date up to the start of the specified month (or current month if not provided).
 */
export const calculateDynamicDL = async (userId, year, month) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const now = new Date();
  // Use provided year/month if available, otherwise current
  const targetYear = year || now.getFullYear();
  const targetMonth = month || now.getMonth() + 1;
  const targetMonthStart = new Date(targetYear, targetMonth - 1, 1);
  const cycleStart =
    targetMonth - 1 < 6
      ? new Date(targetYear, 0, 1)
      : new Date(targetYear, 6, 1);

  const joiningDate = user.joiningDate
    ? new Date(user.joiningDate)
    : new Date(user.createdAt);
  const joiningMonthStart = new Date(
    joiningDate.getFullYear(),
    joiningDate.getMonth(),
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

    const slUsed = leaves
      .filter(
        (l) =>
          l.leaveType === "SL" &&
          new Date(l.fromDate) >= startOfMonth &&
          new Date(l.fromDate) <= endOfMonth,
      )
      .reduce(
        (acc, l) => acc + calcLeaveDays(l.fromDate, l.toDate, l.isHalfDay),
        0,
      );

    const unusedPL = Math.max(0, 1 - plUsed);
    const unusedSL = Math.max(0, 1 - slUsed);

    if (unusedPL > 0) {
      grossDL += unusedPL;
      breakdown.PL.push(monthNames[month]);
    }
    if (unusedSL > 0) {
      grossDL += unusedSL;
      breakdown.SL.push(monthNames[month]);
    }

    processDate = new Date(year, month + 1, 1);
  }

  const dlLeaves = leaves.filter(
    (l) => l.leaveType === "DL" && new Date(l.fromDate) >= cycleStart,
  );
  const dlUsed = dlLeaves.reduce(
    (acc, l) => acc + calcLeaveDays(l.fromDate, l.toDate, l.isHalfDay),
    0,
  );

  const netDL = Math.max(0, grossDL - dlUsed);

  return { netDL, grossDL, dlUsed, breakdown };
};

/**
 * Check DL eligibility.
 * DL is an accumulated balance credited dynamically from unused PL+SL each month.
 *
 * @param {ObjectId} userId
 * @param {Date}     fromDate
 * @param {number}   days  - number of DL days requested
 */
export const checkDLEligibility = async (userId, fromDate, days = 1) => {
  const { netDL } = await calculateDynamicDL(userId);
  if (netDL < days) {
    return `Insufficient DL balance. Available: ${netDL}, Required: ${days}. DL is credited from unused monthly PL and SL allowances.`;
  }
  return null;
};

/**
 * When a half-day leave is approved, upsert an attendance record
 * with status HALF_DAY_LEAVE for that date so it appears in
 * attendance pages and summary counts.
 *
 * When a half-day leave is un-approved (rejected/cancelled), remove
 * the HALF_DAY_LEAVE attendance record if no real check-in exists.
 *
 * @param {ObjectId} userId
 * @param {Date}     leaveDate  - the date of the half-day leave
 * @param {'mark'|'unmark'} action
 */
export const markHalfDayAttendance = async (userId, leaveDate, action) => {
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date(leaveDate));

  if (action === "mark") {
    // Upsert: if a real check-in exists keep it, just set status
    await Attendance.findOneAndUpdate(
      { userId, date: dateStr },
      {
        $set: { status: "HALF_DAY_LEAVE" },
        $setOnInsert: { userId, date: dateStr },
      },
      { upsert: true, new: true },
    );
  } else {
    // Only remove/revert if no real check-in is recorded
    const record = await Attendance.findOne({ userId, date: dateStr });
    if (record) {
      if (!record.checkIn) {
        await Attendance.deleteOne({ _id: record._id });
      } else {
        // Real check-in exists — revert status back to CHECKED_OUT or CHECKED_IN
        record.status = record.checkOut ? "CHECKED_OUT" : "CHECKED_IN";
        await record.save();
      }
    }
  }
};
