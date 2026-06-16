import {
  performCheckIn,
  performBreakIn,
  performBreakOut,
  performCheckOut,
  fetchTodayStatus,
  fetchByDateRange,
  fetchAllUsersAttendance,
  updateRecord,
  finishBreak,
  computeSummary,
  computeAllUsersSummary,
  computeUserSummary,
  computeDashboardStats,
  computeWeeklyStats,
  fetchUserAttendanceById,
  adminAddBreaks,
  adminCreateBreak,
} from "../services/attendanceService.js";
import AuditLog from "../models/AuditLogs.models.js";

// ─── Employee actions

export const checkIn = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    const { record, isLate } = await performCheckIn(req.user._id);
    res.json({
      message: isLate
        ? "Checked in successfully (Late)"
        : "Checked in successfully",
      record,
      isLate,
    });
  } catch (err) {
    const status = err.status || (err.code === 11000 ? 400 : 500);
    res.status(status).json({ message: err.message || "Error checking in" });
  }
};

export const breakIn = async (req, res) => {
  try {
    const record = await performBreakIn(req.user._id);
    res.json({ message: "Break started", record });
  } catch (err) {
    res
      .status(err.status || 500)
      .json({ message: err.message || "Error starting break" });
  }
};

export const breakOut = async (req, res) => {
  try {
    const record = await performBreakOut(req.user._id);
    res.json({ message: "Break ended", record });
  } catch (err) {
    res
      .status(err.status || 500)
      .json({ message: err.message || "Error ending break" });
  }
};

export const checkOut = async (req, res) => {
  try {
    const record = await performCheckOut(req.user._id);
    res.json({ message: "Checked out successfully", record });
  } catch (err) {
    res
      .status(err.status || 500)
      .json({ message: err.message || "Error checking out" });
  }
};

export const getTodayStatus = async (req, res) => {
  try {
    if (!req.user?._id)
      return res.status(400).json({ message: "User ID is required" });
    res.json(await fetchTodayStatus(req.user._id));
  } catch (err) {
    res.status(500).json({ message: "Error fetching status" });
  }
};

// ─── Queries

export const getAttendanceByDate = async (req, res) => {
  try {
    const { date, startDate, endDate } = req.query;
    const records = await fetchByDateRange(
      req.user._id,
      startDate,
      endDate,
      date,
    );
    res.json(records);
  } catch (err) {
    res
      .status(err.status || 500)
      .json({ message: err.message || "Error fetching attendance" });
  }
};

// Kept for backward-compat with /monthly route — delegates to same service fn
export const getAttendanceByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const records = await fetchByDateRange(req.user._id, startDate, endDate);
    res.json(records);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// ─── HR Admin

export const getAllUsersAttendance = async (req, res) => {
  try {
    const result = await fetchAllUsersAttendance(
      req.query,
      req.departmentFilter,
    );
    res.json({
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        pages: Math.ceil(result.total / result.limit),
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: err.message || "Error fetching attendance" });
  }
};

export const updateAttendanceRecord = async (req, res) => {
  try {
    const record = await updateRecord(req.params.id, req.body);
    res.json({ message: "Attendance updated successfully", record });
  } catch (err) {
    res
      .status(err.status || 500)
      .json({ message: err.message || "Error updating attendance" });
  }
};

export const completeBreakOut = async (req, res) => {
  try {
    const { breakIndex, breakOut } = req.body;
    const record = await finishBreak(req.params.id, breakIndex, breakOut);
    res.json({ message: "Break completed successfully", record });
  } catch (err) {
    res
      .status(err.status || 500)
      .json({ message: err.message || "Error completing break" });
  }
};

// ─── Summary & Stats

export const getAttendanceSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate)
      return res
        .status(400)
        .json({ message: "startDate and endDate are required" });
    res.json(await computeSummary(req.user._id, startDate, endDate));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    res.json(await computeDashboardStats(req.user._id));
  } catch (err) {
    res
      .status(500)
      .json({ message: err.message || "Error fetching dashboard stats" });
  }
};

export const getWeeklyStats = async (req, res) => {
  try {
    res.json(await computeWeeklyStats());
  } catch (err) {
    res
      .status(500)
      .json({ message: err.message || "Error fetching weekly stats" });
  }
};

export const getAllUsersSummary = async (req, res) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year || now.getFullYear());
    const month = parseInt(req.query.month || now.getMonth() + 1);
    if (month < 1 || month > 12)
      return res.status(400).json({ message: "Invalid month" });
    res.json(await computeAllUsersSummary(year, month));
  } catch (err) {
    res
      .status(500)
      .json({ message: err.message || "Error fetching users summary" });
  }
};

export const getUserSummaryById = async (req, res) => {
  try {
    const { userId } = req.params;
    const now = new Date();
    const year = parseInt(req.query.year || now.getFullYear());
    const month = parseInt(req.query.month || now.getMonth() + 1);
    if (month < 1 || month > 12)
      return res.status(400).json({ message: "Invalid month" });
    res.json(await computeUserSummary(userId, year, month));
  } catch (err) {
    res
      .status(500)
      .json({ message: err.message || "Error fetching user summary" });
  }
};

export const getUserAttendanceById = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date, startDate, endDate } = req.query;
    const result = await fetchUserAttendanceById(userId, {
      date,
      startDate,
      endDate,
    });
    res.json(result);
  } catch (err) {
    res
      .status(err.status || 500)
      .json({ message: err.message || "Error fetching user attendance" });
  }
};

// ─── Admin Break Management ─────────────────────────────────────────────────

/**
 * POST /attendance/:id/breaks
 * Super Admin / HR Admin: Add break entries to an existing attendance record
 */
export const addBreaksToRecord = async (req, res) => {
  try {
    const { breaks: breaksToAdd } = req.body;
    const record = await adminAddBreaks(req.params.id, breaksToAdd);
    await createAuditLog(req, "ADD_BREAKS_TO_RECORD", {
      targetAttendanceId: req.params.id,
      breaksAdded: breaksToAdd,
    });
    res.json({ message: "Breaks added successfully", record });
  } catch (err) {
    res
      .status(err.status || 500)
      .json({ message: err.message || "Error adding breaks" });
  }
};

/**
 * POST /attendance/user/:userId/create-break
 * Super Admin / HR Admin: Create a new break entry for any user on a specific date.
 * If no attendance record exists for that date, one will be created automatically.
 */
export const adminCreateBreakEntry = async (req, res) => {
  try {
    const { userId } = req.params;
    const { date, breaks } = req.body;
    const result = await adminCreateBreak(userId, date, breaks, req.user);
    await createAuditLog(req, "CREATE_BREAK_ENTRY", {
      targetUserId: userId,
      date,
      breaksCreated: breaks,
      isNewRecord: result.isNewRecord,
    });
    res.json({
      message: result.isNewRecord
        ? "Attendance record created with break entries"
        : "Break entries added successfully",
      record: result.record,
      isNewRecord: result.isNewRecord,
    });
  } catch (err) {
    res
      .status(err.status || 500)
      .json({ message: err.message || "Error creating break entry" });
  }
};

// ─── Audit Log Helper
const createAuditLog = async (req, action, metadata = {}) => {
  try {
    const logData = {
      action,
      performedBy: req.user._id,
      metadata: {
        ...metadata,
        ipAddress: req.ip || req.connection?.remoteAddress,
      },
    };
    if (metadata.targetUserId) {
      logData.targetUser = metadata.targetUserId;
    }
    await AuditLog.create(logData);
  } catch (err) {
    console.error("Failed to create audit log:", err.message);
  }
};
