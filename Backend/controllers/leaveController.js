import Leave from "../models/Leave.js";
import User from "../models/User.models.js";
import {
  calcLeaveDays,
  checkOverlap,
  adjustLeaveBalance,
  notifyLeaveStatus,
  notifyNewLeave,
  checkMonthlyLimit,
  checkDLEligibility,
  markHalfDayAttendance,
} from "../services/leaveService.js";

// ─── Apply Leave ─────────────────────────────────────────────────────────────

export const applyLeave = async (req, res) => {
  try {
    const { leaveType, fromDate, toDate, reason, isHalfDay } = req.body;

    if (!leaveType || !fromDate || !toDate || !reason) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (isHalfDay && new Date(fromDate).toDateString() !== new Date(toDate).toDateString()) {
      return res.status(400).json({ message: "Half-day leave must be for a single day" });
    }

    // DL eligibility check
    if (leaveType === "DL") {
      const dlError = await checkDLEligibility(req.user._id, fromDate);
      if (dlError) return res.status(400).json({ message: dlError });
    }

    // Overlap check
    const overlapping = await checkOverlap(req.user._id, fromDate, toDate);
    if (overlapping.length > 0) {
      const ex = overlapping[0];
      return res.status(400).json({
        message: `You already have a ${ex.leaveType} leave from ${new Date(ex.fromDate).toLocaleDateString()} to ${new Date(ex.toDate).toLocaleDateString()}. Cannot apply for overlapping dates.`,
      });
    }

    // Leave balance check
    const leaveDays = calcLeaveDays(fromDate, toDate, isHalfDay);
    const user = await User.findById(req.user._id);

    if (!user.leaveBalance || user.leaveBalance[leaveType] === undefined) {
      return res.status(400).json({ message: `Invalid leave type: ${leaveType}` });
    }
    if (user.leaveBalance[leaveType] < leaveDays) {
      return res.status(400).json({
        message: `Insufficient ${leaveType} balance. Available: ${user.leaveBalance[leaveType]}, Required: ${leaveDays}`,
      });
    }

    // Monthly limit check for PL/SL
    const limitError = await checkMonthlyLimit(req.user._id, leaveType, fromDate);
    if (limitError) return res.status(400).json({ message: limitError });

    const leave = await Leave.create({
      leaveType,
      fromDate,
      toDate,
      reason,
      isHalfDay: isHalfDay || false,
      user: req.user._id,
      department: req.user.department?._id,
      createdBy: req.user._id,
    });

    // Notify admins (non-blocking)
    notifyNewLeave(req.user, leaveType, fromDate, toDate).catch((e) =>
      console.error("Notification error:", e)
    );

    res.status(201).json({ success: true, message: "Leave applied successfully", data: leave });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Get Leaves 

export const getUserLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ user: req.user._id })
      .populate("user", "name email")
      .populate("department", "name")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: leaves });
  } catch (error) {
    res.status(500).json({ message: "Error fetching user leaves" });
  }
};

export const getAllLeaves = async (req, res) => {
  try {
    const isHRAdmin = req.user.role.name === "ADMIN" && req.user.department?.name === "HR";
    if (!isHRAdmin) {
      return res.status(403).json({ message: "Only HR Admin can view all leaves" });
    }

    const leaves = await Leave.find({})
      .populate("user", "name email")
      .populate("department", "name");

    res.json({ success: true, data: leaves });
  } catch (error) {
    res.status(500).json({ message: "Error fetching leaves" });
  }
};

export const getAllLeavesForSuperAdmin = async (req, res) => {
  try {
    const leaves = await Leave.find({})
      .populate({ path: "user", select: "name email", populate: { path: "department", select: "name" } })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: leaves });
  } catch (error) {
    res.status(500).json({ message: "Error fetching leaves" });
  }
};

// ─── Update Leave Status (shared logic) 

const handleLeaveStatusUpdate = async (req, res, approvedBy) => {
  try {
    const { status } = req.body;
    const leave = await Leave.findById(req.params.id).populate("user");

    if (!leave) return res.status(404).json({ message: "Leave not found" });

    const leaveDays = calcLeaveDays(leave.fromDate, leave.toDate, leave.isHalfDay);

    if (status === "APPROVED" && leave.status !== "APPROVED") {
      await adjustLeaveBalance(leave.user._id, leave.leaveType, leaveDays, -1);
    }

    if (status === "REJECTED" && leave.status === "APPROVED") {
      await adjustLeaveBalance(leave.user._id, leave.leaveType, leaveDays, +1);
    }

    leave.status = status;
    await leave.save();

    // Mark / unmark half-day attendance record
    if (leave.isHalfDay) {
      const action = status === "APPROVED" ? "mark" : "unmark";
      markHalfDayAttendance(leave.user._id, leave.fromDate, action).catch((e) =>
        console.error("Half-day attendance mark error:", e)
      );
    }

    notifyLeaveStatus(leave, status, approvedBy).catch((e) =>
      console.error("Notification error:", e)
    );

    res.json({ success: true, data: leave });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateLeaveStatus = async (req, res) => {
  const isHRAdmin = req.user.role.name === "ADMIN" && req.user.department?.name === "HR";
  if (!isHRAdmin) {
    return res.status(403).json({ message: "Only HR Admin can approve/reject" });
  }
  return handleLeaveStatusUpdate(req, res, "HR Admin");
};

export const updateLeaveStatusBySuperAdmin = async (req, res) => {
  return handleLeaveStatusUpdate(req, res, "Super Admin");
};

// ─── User Leave Balance 

export const getUserLeaveBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("leaveBalance joiningDate probationEndDate");
    if (!user) return res.status(404).json({ message: "User not found" });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [plCount, slCount] = await Promise.all([
      Leave.countDocuments({ user: req.user._id, leaveType: "PL", status: { $in: ["PENDING", "APPROVED"] }, fromDate: { $gte: startOfMonth, $lte: endOfMonth } }),
      Leave.countDocuments({ user: req.user._id, leaveType: "SL", status: { $in: ["PENDING", "APPROVED"] }, fromDate: { $gte: startOfMonth, $lte: endOfMonth } }),
    ]);

    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const prevMonthLeaves = await Leave.countDocuments({
      user: req.user._id,
      leaveType: { $in: ["PL", "CL"] },
      status: { $in: ["PENDING", "APPROVED"] },
      fromDate: { $gte: prevStart, $lte: prevEnd },
    });

    const isDLEligible = prevMonthLeaves === 0;

    res.json({
      success: true,
      data: {
        leaveBalance: user.leaveBalance,
        joiningDate: user.joiningDate,
        probationEndDate: user.probationEndDate,
        monthlyUsage: { PL: plCount, SL: slCount },
        dlEligibility: {
          eligible: isDLEligible,
          reason: isDLEligible ? "No PL or CL taken in previous month" : "PL or CL was taken in previous month",
          previousMonthLeaves: prevMonthLeaves,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Check Leave Availability

export const checkLeaveAvailability = async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month) return res.status(400).json({ message: "Year and month are required" });

    const targetYear = parseInt(year);
    const targetMonth = parseInt(month) - 1;
    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0);

    const [plCount, slCount] = await Promise.all([
      Leave.countDocuments({ user: req.user._id, leaveType: "PL", status: { $in: ["PENDING", "APPROVED"] }, fromDate: { $gte: startOfMonth, $lte: endOfMonth } }),
      Leave.countDocuments({ user: req.user._id, leaveType: "SL", status: { $in: ["PENDING", "APPROVED"] }, fromDate: { $gte: startOfMonth, $lte: endOfMonth } }),
    ]);

    const prevStart = new Date(targetYear, targetMonth - 1, 1);
    const prevEnd = new Date(targetYear, targetMonth, 0);
    const prevMonthLeaves = await Leave.countDocuments({
      user: req.user._id,
      leaveType: { $in: ["PL", "CL"] },
      status: { $in: ["PENDING", "APPROVED"] },
      fromDate: { $gte: prevStart, $lte: prevEnd },
    });

    const isDLEligible = prevMonthLeaves === 0;
    const user = await User.findById(req.user._id).select("leaveBalance");

    res.json({
      success: true,
      data: {
        year: targetYear,
        month: targetMonth + 1,
        monthName: new Date(targetYear, targetMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        availability: {
          PL: { used: plCount, limit: 1, available: plCount < 1, balance: user.leaveBalance.PL },
          CL: { used: 0, limit: null, available: true, balance: user.leaveBalance.CL },
          SL: { used: slCount, limit: 1, available: slCount < 1, balance: user.leaveBalance.SL },
          DL: {
            used: 0,
            limit: null,
            available: isDLEligible,
            balance: user.leaveBalance.DL,
            eligibilityReason: isDLEligible ? "No PL or CL taken in previous month" : "PL or CL was taken in previous month",
          },
        },
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Delete User Leave
export const deleteUserLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: "Leave not found" });

    if (leave.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this leave" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const leaveFrom = new Date(leave.fromDate);
    leaveFrom.setHours(0, 0, 0, 0);

    if (leaveFrom < today) {
      return res.status(400).json({ message: "Cannot delete leave after the leave date has passed" });
    }

    if (leave.status === "APPROVED") {
      const days = calcLeaveDays(leave.fromDate, leave.toDate, leave.isHalfDay);
      await adjustLeaveBalance(req.user._id, leave.leaveType, days, +1);
    }

    await Leave.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Leave deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Update User Leave 

export const updateUserLeave = async (req, res) => {
  try {
    const { leaveType, fromDate, toDate, reason, isHalfDay } = req.body;
    const leave = await Leave.findById(req.params.id);

    if (!leave) return res.status(404).json({ message: "Leave not found" });

    if (leave.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to update this leave" });
    }

    if (leave.status !== "PENDING") {
      return res.status(400).json({ message: "Only pending leaves can be edited" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const leaveFrom = new Date(leave.fromDate);
    leaveFrom.setHours(0, 0, 0, 0);
    if (leaveFrom < today) {
      return res.status(400).json({ message: "Cannot edit leave after the leave date has passed" });
    }

    if (isHalfDay && new Date(fromDate).toDateString() !== new Date(toDate).toDateString()) {
      return res.status(400).json({ message: "Half-day leave must be for a single day" });
    }

    const overlapping = await checkOverlap(req.user._id, fromDate, toDate, req.params.id);
    if (overlapping.length > 0) {
      const ex = overlapping[0];
      return res.status(400).json({
        message: `You already have a ${ex.leaveType} leave from ${new Date(ex.fromDate).toLocaleDateString()} to ${new Date(ex.toDate).toLocaleDateString()}. Cannot apply for overlapping dates.`,
      });
    }

    const leaveDays = calcLeaveDays(fromDate, toDate, isHalfDay);
    const user = await User.findById(req.user._id);

    if (!user.leaveBalance || user.leaveBalance[leaveType] === undefined) {
      return res.status(400).json({ message: `Invalid leave type: ${leaveType}` });
    }
    if (user.leaveBalance[leaveType] < leaveDays) {
      return res.status(400).json({
        message: `Insufficient ${leaveType} balance. Available: ${user.leaveBalance[leaveType]}, Required: ${leaveDays}`,
      });
    }

    const limitError = await checkMonthlyLimit(req.user._id, leaveType, fromDate, req.params.id);
    if (limitError) return res.status(400).json({ message: limitError });

    leave.leaveType = leaveType;
    leave.fromDate = fromDate;
    leave.toDate = toDate;
    leave.reason = reason;
    leave.isHalfDay = isHalfDay || false;
    await leave.save();

    res.json({ success: true, message: "Leave updated successfully", data: leave });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
