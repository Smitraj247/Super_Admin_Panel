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
  calculateDynamicDL,
  markHalfDayAttendance,
  canUserCheckIn,
} from "../services/leaveService.js";
import { emitEvent, SocketEvents } from "../utils/socketEmitter.js";

// ─── Apply Leave

export const applyLeave = async (req, res) => {
  try {
    const { leaveType, fromDate, toDate, reason, isHalfDay, halfDayPeriod } =
      req.body;

    if (!leaveType || !fromDate || !toDate || !reason) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (
      isHalfDay &&
      new Date(fromDate).toDateString() !== new Date(toDate).toDateString()
    ) {
      return res
        .status(400)
        .json({ message: "Half-day leave must be for a single day" });
    }

    if (isHalfDay && !halfDayPeriod) {
      return res.status(400).json({
        message: "Please select half-day period (FIRST_HALF or SECOND_HALF)",
      });
    }

    // Calculate leave days early (needed by DL check and balance check)
    const leaveDays = calcLeaveDays(fromDate, toDate, isHalfDay);

    // DL eligibility check — passes requested days to verify sufficient balance
    if (leaveType === "DL") {
      const dlError = await checkDLEligibility(
        req.user._id,
        fromDate,
        leaveDays,
      );
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

    // Leave balance check (CL is unlimited — skip balance validation)
    const user = await User.findById(req.user._id);

    if (!user.leaveBalance || user.leaveBalance[leaveType] === undefined) {
      return res
        .status(400)
        .json({ message: `Invalid leave type: ${leaveType}` });
    }

    if (
      leaveType !== "CL" &&
      leaveType !== "DL" &&
      user.leaveBalance[leaveType] < leaveDays
    ) {
      return res.status(400).json({
        message: `Insufficient ${leaveType} balance. Available: ${user.leaveBalance[leaveType]}, Required: ${leaveDays}`,
      });
    }

    // Monthly limit check for PL/SL
    const limitError = await checkMonthlyLimit(
      req.user._id,
      leaveType,
      fromDate,
      leaveDays,
    );
    if (limitError) return res.status(400).json({ message: limitError });

    const leave = await Leave.create({
      leaveType,
      fromDate,
      toDate,
      reason,
      isHalfDay: isHalfDay || false,
      halfDayPeriod: isHalfDay ? halfDayPeriod : null,
      user: req.user._id,
      department: req.user.department?._id,
      createdBy: req.user._id,
    });

    // Notify admins (non-blocking)
    notifyNewLeave(req.user, leaveType, fromDate, toDate).catch((e) =>
      console.error("Notification error:", e),
    );

    // Emit real-time event
    const populatedLeave = await leave.populate("user");
    emitEvent(
      SocketEvents.LEAVE_CREATED,
      { leave: populatedLeave },
      req.user._id.toString(),
    );
    emitEvent(SocketEvents.LEAVE_CREATED, { leave: populatedLeave });

    res.status(201).json({
      success: true,
      message: "Leave applied successfully",
      data: leave,
    });
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
    const isHRAdmin =
      req.user.role.name === "ADMIN" && req.user.department?.name === "HR";
    if (!isHRAdmin) {
      return res
        .status(403)
        .json({ message: "Only HR Admin can view all leaves" });
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
      .populate({
        path: "user",
        select: "name email",
        populate: { path: "department", select: "name" },
      })
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
    const oldStatus = leave.status;

    const leaveDays = calcLeaveDays(
      leave.fromDate,
      leave.toDate,
      leave.isHalfDay,
    );

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
        console.error("Half-day attendance mark error:", e),
      );
    }

    notifyLeaveStatus(leave, status, approvedBy).catch((e) =>
      console.error("Notification error:", e),
    );
    
    // Emit real-time events
    emitEvent(SocketEvents.LEAVE_STATUS_CHANGED, { leave, oldStatus, newStatus: status }, leave.user._id.toString());
    emitEvent(SocketEvents.LEAVE_STATUS_CHANGED, { leave, oldStatus, newStatus: status });
    emitEvent(SocketEvents.LEAVE_UPDATED, { leave }, leave.user._id.toString());
    emitEvent(SocketEvents.LEAVE_UPDATED, { leave });

    res.json({ success: true, data: leave });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateLeaveStatus = async (req, res) => {
  const isHRAdmin =
    req.user.role.name === "ADMIN" && req.user.department?.name === "HR";
  if (!isHRAdmin) {
    return res
      .status(403)
      .json({ message: "Only HR Admin can approve/reject" });
  }
  return handleLeaveStatusUpdate(req, res, "HR Admin");
};

export const updateLeaveStatusBySuperAdmin = async (req, res) => {
  return handleLeaveStatusUpdate(req, res, "Super Admin");
};

// ─── User Leave Balance

export const getUserLeaveBalance = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      "leaveBalance joiningDate probationEndDate lastLeaveRefill lastCycleRefill",
    );
    if (!user) return res.status(404).json({ message: "User not found" });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [monthlyPlLeaves, monthlySlLeaves] = await Promise.all([
      Leave.find({
        user: req.user._id,
        leaveType: "PL",
        status: { $in: ["PENDING", "APPROVED"] },
        fromDate: { $gte: startOfMonth, $lte: endOfMonth },
      }),
      Leave.find({
        user: req.user._id,
        leaveType: "SL",
        status: { $in: ["PENDING", "APPROVED"] },
        fromDate: { $gte: startOfMonth, $lte: endOfMonth },
      }),
    ]);

    const plCount = monthlyPlLeaves.reduce(
      (acc, leave) =>
        acc + calcLeaveDays(leave.fromDate, leave.toDate, leave.isHalfDay),
      0,
    );
    const slCount = monthlySlLeaves.reduce(
      (acc, leave) =>
        acc + calcLeaveDays(leave.fromDate, leave.toDate, leave.isHalfDay),
      0,
    );

    // Calculate dynamic DL balance and get breakdown
    const { netDL, breakdown } = await calculateDynamicDL(req.user._id);

    // Preview: how much DL will be credited next month
    // = (1 - PL used this month) + (1 - SL used this month) capped by pool balance
    const unusedPLThisMonth = Math.max(0, 1 - plCount);
    const unusedSLThisMonth = Math.max(0, 1 - slCount);
    const nextMonthDLCredit =
      Math.min(unusedPLThisMonth, user.leaveBalance.PL || 0) +
      Math.min(unusedSLThisMonth, user.leaveBalance.SL || 0);

    // 6-month cycle info — fixed calendar windows: Jan–Jun and Jul–Dec
    const currentMonth = now.getMonth(); // 0-indexed
    const currentYear = now.getFullYear();

    // Cycle 1: Jan(0)–Jun(5)  → starts Jan 1,  ends Jun 30,  next starts Jul 1
    // Cycle 2: Jul(6)–Dec(11) → starts Jul 1,  ends Dec 31,  next starts Jan 1 (next year)
    const isFirstHalf = currentMonth < 6;
    const cycleStartMonth = isFirstHalf ? 0 : 6; // Jan or Jul
    const cycleEndMonth = isFirstHalf ? 5 : 11; // Jun or Dec
    const nextCycleMonth = isFirstHalf ? 6 : 0; // Jul or Jan
    const nextCycleYear = isFirstHalf ? currentYear : currentYear + 1;

    const cycleStart = new Date(currentYear, cycleStartMonth, 1);
    const cycleEnd = new Date(currentYear, cycleEndMonth + 1, 0); // last day of end month
    const nextCycleStart = new Date(nextCycleYear, nextCycleMonth, 1);

    const monthsIntoCycle = currentMonth - cycleStartMonth; // 0–5
    const monthsRemainingInCycle = cycleEndMonth - currentMonth; // 0–5

    const cycleLabel =
      `${cycleStart.toLocaleString("en-US", { month: "long" })}–` +
      `${cycleEnd.toLocaleString("en-US", { month: "long", year: "numeric" })}`;

    // Calculate allocated PL/SL for current cycle (pro-rated if joined mid-cycle)
    const joiningDate = user.joiningDate
      ? new Date(user.joiningDate)
      : new Date(user.createdAt);
    const joiningMonth = joiningDate.getMonth();
    const joiningYear = joiningDate.getFullYear();

    // Determine if user joined in current cycle
    const userJoinedInCurrentCycle =
      (joiningYear === currentYear &&
        joiningMonth >= cycleStartMonth &&
        joiningMonth <= cycleEndMonth) ||
      (joiningYear < currentYear && cycleStartMonth === 0) ||
      (joiningYear > currentYear && cycleStartMonth === 6);

    let allocatedPL = 6;
    let allocatedSL = 6;

    // If user joined in current cycle, pro-rate based on joining month
    if (userJoinedInCurrentCycle && joiningYear === currentYear) {
      const monthsRemaining = cycleEndMonth - joiningMonth + 1; // +1 to include joining month
      allocatedPL = monthsRemaining;
      allocatedSL = monthsRemaining;
    }

    // Calculate used PL/SL in current cycle
    const [cyclePlLeaves, cycleSlLeaves] = await Promise.all([
      Leave.find({
        user: user._id,
        leaveType: "PL",
        status: { $in: ["PENDING", "APPROVED"] },
        fromDate: { $gte: cycleStart, $lte: cycleEnd },
      }),
      Leave.find({
        user: user._id,
        leaveType: "SL",
        status: { $in: ["PENDING", "APPROVED"] },
        fromDate: { $gte: cycleStart, $lte: cycleEnd },
      }),
    ]);

    // Calculate used days using calcLeaveDays from leaveService
    const usedApprovedPL = cyclePlLeaves
      .filter((l) => l.status === "APPROVED")
      .reduce(
        (acc, l) => acc + calcLeaveDays(l.fromDate, l.toDate, l.isHalfDay),
        0,
      );
    const usedSL = cycleSlLeaves.reduce(
      (acc, leave) =>
        acc + calcLeaveDays(leave.fromDate, leave.toDate, leave.isHalfDay),
      0,
    );
    const remainingPL = Math.max(0, allocatedPL - usedApprovedPL);
    const remainingSL = user.leaveBalance.SL;
    const carriedForwardPL = remainingPL;
    res.json({
      success: true,
      data: {
        leaveBalance: {
          ...user.leaveBalance.toObject(),
          // Present CL as "Unlimited" label to the frontend
          CL: user.leaveBalance.CL >= 9999 ? "Unlimited" : user.leaveBalance.CL,
        },
        joiningDate: user.joiningDate,
        probationEndDate: user.probationEndDate,
        monthlyUsage: { PL: plCount, SL: slCount },
        dlInfo: {
          currentBalance: netDL,
          nextMonthCredit: nextMonthDLCredit,
          breakdown,
          description:
            `At the start of next month, you will earn ${nextMonthDLCredit} DL ` +
            `(from unused monthly PL and SL allowances).`,
        },
        cycleInfo: {
          cycleLabel,
          cycleStart,
          cycleEnd,
          nextCycleStart,
          monthsIntoCycle,
          monthsRemainingInCycle,
          allocatedPL,
          allocatedSL,
          usedPL: usedApprovedPL,
          usedSL,
          remainingPL,
          remainingSL,
          carriedForwardPL,
          nextCycleAllocation: {
            PL: 6 + carriedForwardPL, // Full 6 + carry forward
            SL: 6, // Full 6, no carry forward
          },
          description:
            monthsRemainingInCycle === 0
              ? `Your cycle (${cycleLabel}) ends this month. ${remainingPL} unused PL will carry forward to the next cycle starting ${nextCycleStart.toLocaleString("en-US", { month: "long", year: "numeric" })}.`
              : `${monthsRemainingInCycle} month(s) remaining in your current cycle (${cycleLabel}). ${remainingPL} unused PL will carry forward if unused at cycle end.`,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Check if User Can Check In
export const getCanUserCheckIn = async (req, res) => {
  try {
    const result = await canUserCheckIn(req.user._id);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Check Leave Availability

export const checkLeaveAvailability = async (req, res) => {
  try {
    const { year, month } = req.query;
    if (!year || !month)
      return res.status(400).json({ message: "Year and month are required" });

    const user = await User.findById(req.user._id);

    const targetYear = parseInt(year);
    const targetMonth = parseInt(month) - 1;
    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0);

    const [monthlyPlLeaves, monthlySlLeaves] = await Promise.all([
      Leave.find({
        user: req.user._id,
        leaveType: "PL",
        status: { $in: ["PENDING", "APPROVED"] },
        fromDate: { $gte: startOfMonth, $lte: endOfMonth },
      }),
      Leave.find({
        user: req.user._id,
        leaveType: "SL",
        status: { $in: ["PENDING", "APPROVED"] },
        fromDate: { $gte: startOfMonth, $lte: endOfMonth },
      }),
    ]);

    const plCount = monthlyPlLeaves.reduce(
      (acc, leave) =>
        acc + calcLeaveDays(leave.fromDate, leave.toDate, leave.isHalfDay),
      0,
    );
    const slCount = monthlySlLeaves.reduce(
      (acc, leave) =>
        acc + calcLeaveDays(leave.fromDate, leave.toDate, leave.isHalfDay),
      0,
    );

    const { netDL } = await calculateDynamicDL(req.user._id);
    const dlBalance = netDL;

    res.json({
      success: true,
      data: {
        year: targetYear,
        month: targetMonth + 1,
        monthName: new Date(targetYear, targetMonth).toLocaleDateString(
          "en-US",
          { month: "long", year: "numeric" },
        ),
        availability: {
          PL: {
            used: plCount,
            limit: 1,
            available: plCount < 1,
            balance: user.leaveBalance.PL,
          },
          CL: {
            used: "N/A",
            limit: "Unlimited",
            available: true,
            balance: "Unlimited",
          },
          SL: {
            used: slCount,
            limit: 1,
            available: slCount < 1,
            balance: user.leaveBalance.SL,
          },
          DL: {
            used: 0,
            limit: null,
            available: dlBalance > 0,
            balance: dlBalance,
            eligibilityReason:
              dlBalance > 0
                ? `You have ${dlBalance} DL available (credited from unused PL+SL of previous months)`
                : "No DL balance available. DL is credited from unused PL and SL at the start of each new month.",
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

    // if (leave.user.toString() !== req.user._id.toString()) {
    //   return res
    //     .status(403)
    //     .json({ message: "Not authorized to delete this leave" });
    // }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const leaveFrom = new Date(leave.fromDate);
    leaveFrom.setHours(0, 0, 0, 0);

    // if (leaveFrom < today) {
    //   return res.status(400).json({
    //     message: "Cannot delete leave after the leave date has passed",
    //   });
    // }

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
    const { leaveType, fromDate, toDate, reason, isHalfDay, halfDayPeriod } =
      req.body;
    const leave = await Leave.findById(req.params.id);

    if (!leave) return res.status(404).json({ message: "Leave not found" });

    if (leave.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this leave" });
    }

    if (leave.status !== "PENDING") {
      return res
        .status(400)
        .json({ message: "Only pending leaves can be edited" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const leaveFrom = new Date(leave.fromDate);
    leaveFrom.setHours(0, 0, 0, 0);
    if (leaveFrom < today) {
      return res
        .status(400)
        .json({ message: "Cannot edit leave after the leave date has passed" });
    }

    if (
      isHalfDay &&
      new Date(fromDate).toDateString() !== new Date(toDate).toDateString()
    ) {
      return res
        .status(400)
        .json({ message: "Half-day leave must be for a single day" });
    }

    const overlapping = await checkOverlap(
      req.user._id,
      fromDate,
      toDate,
      req.params.id,
    );
    if (overlapping.length > 0) {
      const ex = overlapping[0];
      return res.status(400).json({
        message: `You already have a ${ex.leaveType} leave from ${new Date(ex.fromDate).toLocaleDateString()} to ${new Date(ex.toDate).toLocaleDateString()}. Cannot apply for overlapping dates.`,
      });
    }

    const leaveDays = calcLeaveDays(fromDate, toDate, isHalfDay);
    const user = await User.findById(req.user._id);

    if (!user.leaveBalance || user.leaveBalance[leaveType] === undefined) {
      return res
        .status(400)
        .json({ message: `Invalid leave type: ${leaveType}` });
    }
    if (
      leaveType !== "CL" &&
      leaveType !== "DL" &&
      user.leaveBalance[leaveType] < leaveDays
    ) {
      return res.status(400).json({
        message: `Insufficient ${leaveType} balance. Available: ${user.leaveBalance[leaveType]}, Required: ${leaveDays}`,
      });
    }

    if (leaveType === "DL") {
      const dlError = await checkDLEligibility(
        req.user._id,
        fromDate,
        leaveDays,
      );
      if (dlError) return res.status(400).json({ message: dlError });
    }

    const limitError = await checkMonthlyLimit(
      req.user._id,
      leaveType,
      fromDate,
      leaveDays,
      req.params.id,
    );
    if (limitError) return res.status(400).json({ message: limitError });

    leave.leaveType = leaveType;
    leave.fromDate = fromDate;
    leave.toDate = toDate;
    leave.reason = reason;
    leave.isHalfDay = isHalfDay || false;
    leave.halfDayPeriod = isHalfDay ? halfDayPeriod : null;
    await leave.save();

    res.json({
      success: true,
      message: "Leave updated successfully",
      data: leave,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
