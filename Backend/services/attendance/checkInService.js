import mongoose from "mongoose";
import Attendance from "../../models/Attendance.js";
import { canUserCheckIn } from "../leaveService.js";
import { emitEvent, SocketEvents } from "../../utils/socketEmitter.js";
import { getToday } from "../../utils/dateUtils.js";
import {
  populateUser,
  populateRecord,
  recalculateRecordStatus,
} from "./attendanceHelper.js";
import { syncLeaveAttendanceForRange } from "./syncService.js";

export const performCheckIn = async (userId) => {
  const today = getToday();
  const existingRecord = await Attendance.findOne({ userId, date: today });
  if (
    existingRecord &&
    !["ON_LEAVE", "HALF_DAY_LEAVE"].includes(existingRecord.status)
  ) {
    throw Object.assign(new Error("Already checked in"), {
      status: 400,
      code: 11000,
    });
  }

  // Check if user can check in (not on full leave or half-day leave for current period)
  const checkInPermission = await canUserCheckIn(userId);
  if (!checkInPermission.canCheckIn) {
    throw Object.assign(new Error(checkInPermission.reason), { status: 400 });
  }

  const now = new Date();
  const istParts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const hour = Number(istParts.find((p) => p.type === "hour").value);
  const min = Number(istParts.find((p) => p.type === "minute").value);
  const isLate = hour > 10 || (hour === 10 && min >= 15);

  let record;
  if (existingRecord) {
    // Update existing leave record to checked in
    existingRecord.checkIn = now;
    existingRecord.status = isLate ? "LATE" : "CHECKED_IN";
    existingRecord.isLate = isLate;
    await existingRecord.save();
    record = existingRecord;
  } else {
    record = await Attendance.create({
      userId: new mongoose.Types.ObjectId(userId),
      date: today,
      checkIn: now,
      status: isLate ? "LATE" : "CHECKED_IN",
      isLate,
    });
  }
  const populatedRecord = await populateUser(record._id);
  emitEvent(
    SocketEvents.ATTENDANCE_UPDATED,
    { userId, record: populatedRecord },
    userId,
  );
  emitEvent(SocketEvents.ATTENDANCE_UPDATED, {
    userId,
    record: populatedRecord,
  });

  return { record: populatedRecord, isLate };
};

export const performCheckOut = async (userId) => {
  const record = await Attendance.findOne({ userId, date: getToday() });
  if (!record || record.status === "CHECKED_OUT")
    throw Object.assign(new Error("Cannot check out"), { status: 400 });

  record.checkOut = new Date();
  record.status = "CHECKED_OUT";
  await record.save();
  const populatedRecord = await populateUser(record._id);
  emitEvent(
    SocketEvents.ATTENDANCE_UPDATED,
    { userId, record: populatedRecord },
    userId,
  );
  emitEvent(SocketEvents.ATTENDANCE_UPDATED, {
    userId,
    record: populatedRecord,
  });

  return populatedRecord;
};

export const fetchTodayStatus = async (userId) => {
  const record = await Attendance.findOne({
    userId,
    date: getToday(),
  }).populate("userId", "email name _id");
  return record
    ? { status: record.status, record }
    : { status: "NOT_CHECKED_IN" };
};

export const adminCreateOrUpdateAttendance = async (
  userId,
  date,
  { checkIn, checkOut, breaks },
) => {
  if (!mongoose.Types.ObjectId.isValid(userId))
    throw Object.assign(new Error("Invalid user ID"), { status: 400 });

  if (!date || typeof date !== "string")
    throw Object.assign(new Error("Date string (YYYY-MM-DD) is required"), {
      status: 400,
    });

  if (!checkIn)
    throw Object.assign(new Error("Check-in time is required"), {
      status: 400,
    });

  const checkInDate = new Date(checkIn);
  if (isNaN(checkInDate.getTime()))
    throw Object.assign(new Error("Invalid check-in timestamp"), {
      status: 400,
    });

  let checkOutDate = null;
  if (checkOut) {
    checkOutDate = new Date(checkOut);
    if (isNaN(checkOutDate.getTime()))
      throw Object.assign(new Error("Invalid check-out timestamp"), {
        status: 400,
      });
    if (checkOutDate <= checkInDate)
      throw Object.assign(new Error("Check-out must be after check-in"), {
        status: 400,
      });
  }

  let record = await Attendance.findOne({ userId, date });
  const isNewRecord = !record;

  if (!record) {
    record = new Attendance({
      userId: new mongoose.Types.ObjectId(userId),
      date,
      breaks: [],
    });
  }

  record.checkIn = checkInDate;
  record.checkOut = checkOutDate;

  if (breaks !== undefined && Array.isArray(breaks)) {
    record.breaks = breaks.map((b) => ({
      breakIn: b.breakIn ? new Date(b.breakIn) : null,
      breakOut: b.breakOut ? new Date(b.breakOut) : null,
    }));
  }

  recalculateRecordStatus(record);
  await record.save();

  return { record: await populateRecord(record._id), isNewRecord };
};

export const updateRecord = async (
  id,
  { checkIn, checkOut, breakIn, breakOut, breakIndex, breaks },
) => {
  const record = await Attendance.findById(id);
  if (!record)
    throw Object.assign(new Error("Attendance record not found"), {
      status: 404,
    });

  if (checkIn !== undefined)
    record.checkIn = checkIn ? new Date(checkIn) : null;

  if (checkOut !== undefined) {
    if (checkOut === null) {
      record.checkOut = null;
      record.status = "CHECKED_IN";
    } else {
      record.checkOut = new Date(checkOut);
      record.status = "CHECKED_OUT";
    }
  }

  if (breaks !== undefined && Array.isArray(breaks)) {
    record.breaks = breaks.map((b) => ({
      breakIn: b.breakIn ? new Date(b.breakIn) : null,
      breakOut: b.breakOut ? new Date(b.breakOut) : null,
    }));
  } else if (
    breakIndex !== undefined &&
    (breakIn !== undefined || breakOut !== undefined)
  ) {
    if (record.breaks[breakIndex]) {
      if (breakIn !== undefined)
        record.breaks[breakIndex].breakIn = breakIn
          ? new Date(breakIn)
          : record.breaks[breakIndex].breakIn;
      if (breakOut !== undefined)
        record.breaks[breakIndex].breakOut = breakOut
          ? new Date(breakOut)
          : null;
    }
  } else if (breakIn !== undefined || breakOut !== undefined) {
    if (breakIn && !breakOut) {
      record.breaks.push({ breakIn: new Date(breakIn) });
      record.status = "ON_BREAK";
    } else if (breakIn && breakOut) {
      record.breaks.push({
        breakIn: new Date(breakIn),
        breakOut: new Date(breakOut),
      });
      if (!record.checkOut) record.status = "BACK_TO_WORK";
    }
  }

  recalculateRecordStatus(record);
  await record.save();
  return populateRecord(record._id);
};

export const fetchUserAttendanceById = async (
  userId,
  { date, startDate, endDate } = {},
) => {
  if (!mongoose.Types.ObjectId.isValid(userId))
    throw Object.assign(new Error("Invalid user ID"), { status: 400 });

  const filter = { userId: new mongoose.Types.ObjectId(userId) };
  const todayStr = getToday();

  if (date) {
    if (date > todayStr) {
      return { data: [], total: 0 };
    }
    filter.date = date;
    await syncLeaveAttendanceForRange(userId, date, date);
  } else if (startDate && endDate) {
    const effectiveEnd = endDate > todayStr ? todayStr : endDate;
    filter.date = { $gte: startDate, $lte: effectiveEnd };
    await syncLeaveAttendanceForRange(userId, startDate, effectiveEnd);
  } else {
    filter.date = todayStr;
    await syncLeaveAttendanceForRange(userId, todayStr, todayStr);
  }

  const records = await Attendance.find(filter)
    .populate({
      path: "userId",
      select: "name email _id department role",
      populate: { path: "role department", select: "name" },
    })
    .sort({ date: -1, createdAt: -1 });

  return { data: records, total: records.length };
};

export const fetchByDateRange = async (userId, startDate, endDate, date) => {
  const filter = { userId };
  const todayStr = getToday();

  if (startDate && endDate) {
    const effectiveEnd = endDate > todayStr ? todayStr : endDate;
    filter.date = { $gte: startDate, $lte: effectiveEnd };
    await syncLeaveAttendanceForRange(userId, startDate, effectiveEnd);
  } else if (date) {
    if (date > todayStr) {
      return [];
    }
    filter.date = date;
    await syncLeaveAttendanceForRange(userId, date, date);
  } else {
    throw Object.assign(new Error("Date or date range is required"), {
      status: 400,
    });
  }

  return Attendance.find(filter)
    .populate("userId", "email name _id")
    .sort({ date: 1 });
};

export const fetchAllUsersAttendance = async (
  { startDate, endDate, date, page = 1, limit = 50 },
  departmentFilter,
) => {
  const filter = {};
  const todayStr = getToday();

  if (date) {
    if (date > todayStr) {
      return {
        data: [],
        total: 0,
        page: parseInt(page),
        limit: parseInt(limit),
      };
    }
    filter.date = date;
  } else if (startDate && endDate) {
    const effectiveEnd = endDate > todayStr ? todayStr : endDate;
    filter.date = { $gte: startDate, $lte: effectiveEnd };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  let attendance = await Attendance.find(filter)
    .populate({
      path: "userId",
      select: "name email _id department role",
      populate: { path: "role department", select: "name" },
    })
    .sort({ date: -1, createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  if (departmentFilter?.department) {
    attendance = attendance.filter(
      (r) =>
        r.userId?.department?._id?.toString() ===
        departmentFilter.department.toString(),
    );
  }

  return {
    data: attendance,
    total: attendance.length,
    page: parseInt(page),
    limit: parseInt(limit),
  };
};
