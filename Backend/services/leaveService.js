import Leave from "../models/Leave.js";
import User from "../models/User.models.js";
import Notification from "../models/Notification.js";
import Role from "../models/Roles.models.js";
import Department from "../models/Department.models.js";
import Attendance from "../models/Attendance.js";

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
export const checkOverlap = async (userId, fromDate, toDate, excludeId = null) => {
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
export const adjustLeaveBalance = async (userId, leaveType, days, direction) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  if (user.leaveBalance[leaveType] === undefined) {
    throw new Error(`Invalid leave type: ${leaveType}`);
  }

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
export const notifyNewLeave = async (applicant, leaveType, fromDate, toDate) => {
  const [superAdminRole, adminRole, hrDepartment] = await Promise.all([
    Role.findOne({ name: "SUPER_ADMIN" }),
    Role.findOne({ name: "ADMIN" }),
    Department.findOne({ name: "HR" }),
  ]);

  const recipientIds = [];

  if (superAdminRole) {
    const superAdmins = await User.find({ role: superAdminRole._id }).select("_id");
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
    }))
  );
};

/**
 * Check monthly PL/SL application limit (max 1 per month).
 */
export const checkMonthlyLimit = async (userId, leaveType, fromDate, excludeId = null) => {
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

  const count = await Leave.countDocuments(query);
  if (count >= 1) {
    return `Maximum 1 ${leaveType} application allowed per month. Already applied ${count} time(s) this month.`;
  }
  return null;
};

/**
 * Check DL eligibility — DL not allowed if PL or CL was taken in the previous month.
 */
export const checkDLEligibility = async (userId, fromDate) => {
  const from = new Date(fromDate);
  const prevStart = new Date(from.getFullYear(), from.getMonth() - 1, 1);
  const prevEnd = new Date(from.getFullYear(), from.getMonth(), 0);

  const count = await Leave.countDocuments({
    user: userId,
    leaveType: { $in: ["PL", "CL"] },
    status: { $in: ["PENDING", "APPROVED"] },
    fromDate: { $gte: prevStart, $lte: prevEnd },
  });

  if (count > 0) {
    const monthLabel = prevStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    return `DL is not available. You took PL or CL in ${monthLabel}. DL is only available when no PL or CL is taken in the previous month.`;
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
  const dateStr = new Date(leaveDate).toISOString().split("T")[0];

  if (action === "mark") {
    // Upsert: if a real check-in exists keep it, just set status
    await Attendance.findOneAndUpdate(
      { userId, date: dateStr },
      {
        $set: { status: "HALF_DAY_LEAVE" },
        $setOnInsert: { userId, date: dateStr },
      },
      { upsert: true, new: true }
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
