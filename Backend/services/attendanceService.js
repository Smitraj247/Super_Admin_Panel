import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import Holiday from "../models/Holiday.js";
import { canUserCheckIn } from "./leaveService.js";
import { emitEvent, SocketEvents } from "../utils/socketEmitter.js";

// ─── Timezone helpers (IST = UTC+5:30) ───────────────────────────────────────

/**
 * Returns today's date string in YYYY-MM-DD format using IST timezone.
 * Prevents the UTC midnight shift that would return yesterday for IST users.
 */
export const getToday = () => {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date(),
  );
};

/**
 * Builds a YYYY-MM-DD string for the 1st of a given month.
 * Pure string construction — no Date conversion, no timezone risk.
 */
const monthFirstDay = (year, month) =>
  `${year}-${String(month).padStart(2, "0")}-01`;

/**
 * Builds a YYYY-MM-DD string for the last day of a given month.
 * Uses new Date(year, month, 0) which gives local last-day — safe since we only
 * read .getDate() and never call .toISOString().
 * Handles leap years automatically (Feb 28/29).
 */
const monthLastDay = (year, month) => {
  const d = new Date(year, month, 0); // day 0 of next month = last day of `month`
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Converts a YYYY-MM-DD string to a local midnight Date without any UTC shift.
 * new Date("2025-06-01") parses as UTC midnight which shifts in non-UTC zones.
 * new Date(2025, 5, 1) parses as local midnight — correct for iteration.
 */
const localDate = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/**
 * Returns the YYYY-MM-DD string for a local Date without UTC conversion.
 */
const toDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Returns the date string (YYYY-MM-DD) of the last Saturday in a given month and year.
 * Saturdays are day-of-week 6. We start from the last day of the month and walk backwards
 * until we find a Saturday.
 */
const getLastSaturday = (year, month) => {
  // month is 1-based here (consistent with monthLastDay / monthFirstDay)
  const lastDay = new Date(year, month, 0); // day 0 of next month = last day of `month`
  while (lastDay.getDay() !== 6) {
    lastDay.setDate(lastDay.getDate() - 1);
  }
  return toDateStr(lastDay);
};

// ─── Internal populate helpers ────────────────────────────────────────────────

const populateUser = (id) =>
  Attendance.findById(id).populate("userId", "email name _id");

const populateRecord = (id) =>
  Attendance.findById(id).populate({
    path: "userId",
    select: "name email _id",
    populate: { path: "role department", select: "name" },
  });

// ─── Employee actions ─────────────────────────────────────────────────────────

export const performCheckIn = async (userId) => {
  const today = getToday();
  if (await Attendance.findOne({ userId, date: today }))
    throw Object.assign(new Error("Already checked in"), {
      status: 400,
      code: 11000,
    });

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

  const record = await Attendance.create({
    userId: new mongoose.Types.ObjectId(userId),
    date: today,
    checkIn: now,
    status: isLate ? "LATE" : "CHECKED_IN",
    isLate,
  });
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

export const performBreakIn = async (userId) => {
  const record = await Attendance.findOne({ userId, date: getToday() });
  if (!record)
    throw Object.assign(new Error("Please check in first"), { status: 400 });
  if (!["CHECKED_IN", "BACK_TO_WORK", "LATE"].includes(record.status))
    throw Object.assign(
      new Error(`Cannot start break. Current status: ${record.status}`),
      { status: 400 },
    );

  record.breaks.push({ breakIn: new Date() });
  record.status = "ON_BREAK";
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

export const performBreakOut = async (userId) => {
  const record = await Attendance.findOne({ userId, date: getToday() });
  if (!record || record.status !== "ON_BREAK")
    throw Object.assign(new Error("Cannot end break"), { status: 400 });

  const lastBreak = record.breaks[record.breaks.length - 1];
  if (!lastBreak || lastBreak.breakOut)
    throw Object.assign(new Error("No active break found"), { status: 400 });

  lastBreak.breakOut = new Date();
  record.status = "BACK_TO_WORK";
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

// ─── Queries ──────────────────────────────────────────────────────────────────

export const fetchByDateRange = async (userId, startDate, endDate, date) => {
  const filter = { userId };
  const todayStr = getToday();

  if (startDate && endDate) {
    const effectiveEnd = endDate > todayStr ? todayStr : endDate;
    filter.date = { $gte: startDate, $lte: effectiveEnd };
  } else if (date) {
    if (date > todayStr) {
      return [];
    }
    filter.date = date;
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

// ─── Admin record update

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
    // Frontend sends breaks as an array of { breakIn, breakOut } objects
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

  // Recalculate status based on updated breaks and checkIn/checkOut
  recalculateRecordStatus(record);

  await record.save();
  return populateRecord(record._id);
};

/**
 * Determines and assigns the correct status for an attendance record
 * based on checks for checkIn, checkOut, and active breaks.
 */
const recalculateRecordStatus = (record) => {
  if (!record.checkIn) {
    record.status = null;
    record.isLate = false;
    return;
  }
  if (record.checkOut) {
    record.status = "CHECKED_OUT";
    return;
  }
  // Check if there's an active break (breakIn without breakOut)
  const hasActiveBreak = (record.breaks || []).some(
    (b) => b.breakIn && !b.breakOut,
  );
  if (hasActiveBreak) {
    record.status = "ON_BREAK";
    return;
  }
  if ((record.breaks || []).length > 0) {
    record.status = "BACK_TO_WORK";
    return;
  }
  record.status = record.isLate ? "LATE" : "CHECKED_IN";
};

export const finishBreak = async (id, breakIndex, breakOut) => {
  const record = await Attendance.findById(id);
  if (!record)
    throw Object.assign(new Error("Attendance record not found"), {
      status: 404,
    });
  if (breakIndex === undefined || !record.breaks[breakIndex])
    throw Object.assign(new Error("Invalid break index"), { status: 400 });

  record.breaks[breakIndex].breakOut = new Date(breakOut);
  if (!record.checkOut) record.status = "BACK_TO_WORK";
  await record.save();
  return populateRecord(record._id);
};

/**
 * Admin/Super Admin: Add one or more break entries to an existing attendance record.
 * Breaks can be pushed as complete { breakIn, breakOut } pairs or just a breakIn for an ongoing break.
 */
export const adminAddBreaks = async (recordId, breaksToAdd) => {
  const record = await Attendance.findById(recordId);
  if (!record)
    throw Object.assign(new Error("Attendance record not found"), {
      status: 404,
    });
  if (!Array.isArray(breaksToAdd) || breaksToAdd.length === 0)
    throw Object.assign(new Error("breaksToAdd must be a non-empty array"), {
      status: 400,
    });

  for (const b of breaksToAdd) {
    if (!b.breakIn) {
      throw Object.assign(
        new Error("Each break entry must have a breakIn timestamp"),
        { status: 400 },
      );
    }
    const breakInDate = new Date(b.breakIn);
    if (isNaN(breakInDate.getTime())) {
      throw Object.assign(new Error("Invalid breakIn timestamp provided"), {
        status: 400,
      });
    }
    const breakEntry = { breakIn: breakInDate };
    if (b.breakOut) {
      const breakOutDate = new Date(b.breakOut);
      if (isNaN(breakOutDate.getTime())) {
        throw Object.assign(new Error("Invalid breakOut timestamp provided"), {
          status: 400,
        });
      }
      if (breakOutDate <= breakInDate) {
        throw Object.assign(new Error("breakOut must be after breakIn"), {
          status: 400,
        });
      }
      breakEntry.breakOut = breakOutDate;
    }
    record.breaks.push(breakEntry);
  }

  recalculateRecordStatus(record);
  await record.save();
  return populateRecord(record._id);
};

/**
 * Admin/Super Admin: Create a break record for a user on a specific date.
 * If no attendance record exists for that date, it will create one with just breaks.
 * If a record exists, it will append the breaks.
 */
export const adminCreateBreak = async (
  userId,
  date,
  breaksToAdd,
  adminUser,
) => {
  // Validate inputs
  if (!mongoose.Types.ObjectId.isValid(userId))
    throw Object.assign(new Error("Invalid user ID"), { status: 400 });

  if (!date || typeof date !== "string")
    throw Object.assign(new Error("Date string (YYYY-MM-DD) is required"), {
      status: 400,
    });

  if (!Array.isArray(breaksToAdd) || breaksToAdd.length === 0)
    throw Object.assign(new Error("breaksToAdd must be a non-empty array"), {
      status: 400,
    });

  // Validate each break entry
  const validatedBreaks = [];
  for (const b of breaksToAdd) {
    if (!b.breakIn) {
      throw Object.assign(
        new Error("Each break entry must have a breakIn timestamp"),
        { status: 400 },
      );
    }
    const breakInDate = new Date(b.breakIn);
    if (isNaN(breakInDate.getTime())) {
      throw Object.assign(new Error("Invalid breakIn timestamp provided"), {
        status: 400,
      });
    }
    const breakEntry = { breakIn: breakInDate };
    if (b.breakOut) {
      const breakOutDate = new Date(b.breakOut);
      if (isNaN(breakOutDate.getTime())) {
        throw Object.assign(new Error("Invalid breakOut timestamp provided"), {
          status: 400,
        });
      }
      if (breakOutDate <= breakInDate) {
        throw Object.assign(new Error("breakOut must be after breakIn"), {
          status: 400,
        });
      }
      breakEntry.breakOut = breakOutDate;
    }
    validatedBreaks.push(breakEntry);
  }

  // Try to find existing attendance record for the user on that date
  let record = await Attendance.findOne({ userId, date });
  let isNewRecord = false;

  if (!record) {
    // Create a minimal attendance record with just breaks
    record = new Attendance({
      userId: new mongoose.Types.ObjectId(userId),
      date,
      checkIn: null,
      checkOut: null,
      breaks: [],
      status: null,
    });
    isNewRecord = true;
  }

  // Append the validated breaks
  for (const be of validatedBreaks) {
    record.breaks.push(be);
  }

  recalculateRecordStatus(record);
  await record.save();

  const populated = await populateRecord(record._id);
  return { record: populated, isNewRecord };
};

// ─── Summary
/**
 * Builds the working-day list for [startDate, endDate], capped at today (IST).
 * Working days = Mon–Fri (excluding weekends) + the last Saturday of each month,
 * minus public holidays.
 *
 * Rules:
 * - All Sundays (dow=0) are non-working.
 * - All Saturdays (dow=6) are non-working EXCEPT the last Saturday of each month.
 * - Public holidays are deducted regardless of day-of-week.
 *
 * Uses localDate() for iteration so no UTC-offset shift occurs.
 * Holiday dates stored as UTC midnight in Mongo are converted via toDateStr()
 * using local time, matching the date strings used for attendance records.
 */
const buildWorkingDays = (startDate, endDate, holidayDates) => {
  const workingDays = [];
  const todayStr = getToday();
  const cursor = localDate(startDate);
  const end = localDate(endDate > todayStr ? todayStr : endDate);

  // Cache last-Saturday lookups per month to avoid recomputing for every Saturday
  const lastSaturdayCache = {};

  while (cursor <= end) {
    const ds = toDateStr(cursor);
    const dow = cursor.getDay(); // 0=Sun, 6=Sat

    if (dow === 0) {
      // Sunday — never a working day
      cursor.setDate(cursor.getDate() + 1);
      continue;
    }

    if (dow === 6) {
      // Saturday — only working if it's the LAST Saturday of its month
      const y = cursor.getFullYear();
      const m = cursor.getMonth() + 1; // 1-based
      const cacheKey = `${y}-${m}`;
      if (!lastSaturdayCache[cacheKey]) {
        lastSaturdayCache[cacheKey] = getLastSaturday(y, m);
      }
      if (ds !== lastSaturdayCache[cacheKey]) {
        // Not the last Saturday — skip it
        cursor.setDate(cursor.getDate() + 1);
        continue;
      }
    }

    if (!holidayDates.has(ds)) workingDays.push(ds);
    cursor.setDate(cursor.getDate() + 1);
  }
  return workingDays;
};

export const computeSummary = async (userId, startDate, endDate) => {
  // Cap endDate to today so we never count future days
  const todayStr = getToday();
  const effectiveEnd = endDate > todayStr ? todayStr : endDate;

  const [records, approvedLeaves, holidays] = await Promise.all([
    Attendance.find({
      userId,
      date: { $gte: startDate, $lte: effectiveEnd },
    }),
    Leave.find({
      user: userId,
      status: "APPROVED",
      fromDate: { $lte: new Date(effectiveEnd + "T23:59:59.999Z") },
      toDate: { $gte: new Date(startDate + "T00:00:00.000Z") },
    }),
    // Add 1 day buffer on both sides to account for UTC storage of holiday dates
    Holiday.find({
      date: {
        $gte: new Date(startDate + "T00:00:00.000Z"),
        $lte: new Date(effectiveEnd + "T23:59:59.999Z"),
      },
    }),
  ]);

  // Convert holiday Dates to local YYYY-MM-DD strings (avoids UTC shift)
  const holidayDates = new Set(
    holidays.map((h) => toDateStr(new Date(h.date))),
  );

  const workingDays = buildWorkingDays(startDate, effectiveEnd, holidayDates);

  // Build sets of approved leave dates
  const approvedHalfDayDates = new Set();
  const approvedFullDayDates = new Set();

  for (const leave of approvedLeaves) {
    const lc = localDate(toDateStr(new Date(leave.fromDate)));
    const le = localDate(toDateStr(new Date(leave.toDate)));

    while (lc <= le) {
      const ds = toDateStr(lc);
      if (leave.isHalfDay) {
        approvedHalfDayDates.add(ds);
      } else {
        approvedFullDayDates.add(ds);
      }
      lc.setDate(lc.getDate() + 1);
    }
  }

  const attendanceByDate = new Map(records.map((r) => [r.date, r]));

  const HALF_DAY_HOURS = 4;
  let present = 0,
    pending = 0,
    halfDay = 0,
    totalWorkMinutes = 0,
    onLeave = 0;

  for (const ds of workingDays) {
    // First check if date is an approved leave
    if (approvedFullDayDates.has(ds)) {
      onLeave++;
      continue;
    }

    if (approvedHalfDayDates.has(ds)) {
      halfDay++;
      present++;
      onLeave++;
      continue;
    }

    const r = attendanceByDate.get(ds);

    if (!r) {
      // Not a leave, no attendance record = absent
      continue;
    }

    if (!r.checkIn) {
      // Has attendance record but no check in = absent
      continue;
    }

    // Has checkIn — employee was present this day
    if (r.checkOut) {
      // Fully checked out = confirmed present
      present++;
      let mins = (new Date(r.checkOut) - new Date(r.checkIn)) / 60000;
      r.breaks?.forEach((b) => {
        if (b.breakIn && b.breakOut)
          mins -= (new Date(b.breakOut) - new Date(b.breakIn)) / 60000;
      });
      totalWorkMinutes += mins;
      if (mins / 60 < HALF_DAY_HOURS) halfDay++;
    } else {
      // Still checked in (today / forgot to check out) — count as present too
      present++;
      pending++;
    }
  }

  // Absent = Total Working Days − Present − Approved Leave Days
  const absent = Math.max(0, workingDays.length - present - onLeave);

  // Expected working days = total working days minus approved leave days on working days.
  // This represents the number of days the user was expected to work (excluding planned leaves).
  const expectedWorkingDays = Math.max(0, workingDays.length - onLeave);

  const lateCount = records.filter((r) => r.isLate).length;
  const totalWorkHours = parseFloat((totalWorkMinutes / 60).toFixed(1));
  const REQUIRED_DAILY_HOURS = 8.5;
  const totalOfficeHours = present * REQUIRED_DAILY_HOURS;
  const productivity = totalOfficeHours
    ? parseInt(((totalWorkMinutes / 60 / totalOfficeHours) * 100).toFixed(0))
    : 0;
  const attendanceRate = workingDays.length
    ? Math.round((present / workingDays.length) * 100)
    : 0;
  const avgWorkHours = present
    ? parseFloat((totalWorkMinutes / 60 / present).toFixed(1))
    : 0;

  return {
    totalDays: workingDays.length,
    present,
    pending,
    absent,
    halfDay,
    totalOffice: present,
    totalWorkHours,
    totalOfficeHours,
    productivity,
    leaves: onLeave,
    lateCount,
    attendanceRate,
    avgWorkHours,
    expectedWorkingDays,
  };
};

// ─── Dashboard status

export const computeDashboardStats = async (userId) => {
  const today = getToday();

  // Use IST to get current year/month (avoids UTC offset giving wrong month near midnight)
  const istParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const istYear = parseInt(istParts.find((p) => p.type === "year").value);
  const istMonth = parseInt(istParts.find((p) => p.type === "month").value);

  const monthStart = monthFirstDay(istYear, istMonth);

  // Week boundaries (Mon–Sun using IST today)
  const [ty, tm, td] = today.split("-").map(Number);
  const todayLocal = new Date(ty, tm - 1, td);
  // Start from Monday of current week
  const dow = todayLocal.getDay(); // 0=Sun
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  const weekStartDate = new Date(todayLocal);
  weekStartDate.setDate(todayLocal.getDate() - daysFromMon);
  const weekStartStr = toDateStr(weekStartDate);

  const [monthRecords, weekRecords, todayRecord] = await Promise.all([
    Attendance.find({ userId, date: { $gte: monthStart, $lte: today } }),
    Attendance.find({ userId, date: { $gte: weekStartStr, $lte: today } }),
    Attendance.findOne({ userId, date: today }),
  ]);

  // Present days = working days (Mon–Fri) where employee actually checked in
  const PRESENT_STATUSES = new Set([
    "CHECKED_IN",
    "ON_BREAK",
    "BACK_TO_WORK",
    "CHECKED_OUT",
    "LATE",
  ]);
  let monthPresentDays = 0,
    totalLateDays = 0;
  monthRecords.forEach((r) => {
    const [y, m, d] = r.date.split("-").map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    // Skip weekends (Sat=6, Sun=0) — those don't count as present working days
    if (dow === 0 || dow === 6) return;
    if (PRESENT_STATUSES.has(r.status) && r.checkIn) monthPresentDays++;
    if (r.isLate) totalLateDays++;
  });

  // Weekly work hours
  let weekWorkMinutes = 0;
  weekRecords.forEach((r) => {
    if (r.checkIn && r.checkOut) {
      let m = (new Date(r.checkOut) - new Date(r.checkIn)) / 60000;
      r.breaks?.forEach((b) => {
        if (b.breakIn && b.breakOut)
          m -= (new Date(b.breakOut) - new Date(b.breakIn)) / 60000;
      });
      weekWorkMinutes += m;
    }
  });

  // Today's detail
  let totalWorkMinutes = 0,
    totalBreakMinutes = 0;
  let checkInTime = "---",
    checkOutTime = "---",
    breaks = [],
    isOnBreak = false;

  if (todayRecord) {
    if (todayRecord.checkIn)
      checkInTime = new Date(todayRecord.checkIn).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    if (todayRecord.checkOut) {
      checkOutTime = new Date(todayRecord.checkOut).toLocaleTimeString(
        "en-US",
        { hour: "2-digit", minute: "2-digit" },
      );
      totalWorkMinutes =
        (new Date(todayRecord.checkOut) - new Date(todayRecord.checkIn)) /
        60000;
    } else if (todayRecord.checkIn) {
      totalWorkMinutes = (new Date() - new Date(todayRecord.checkIn)) / 60000;
    }

    isOnBreak = todayRecord.status === "ON_BREAK";

    todayRecord.breaks?.forEach((b, i) => {
      let dur = 0;
      if (b.breakIn && b.breakOut) {
        dur = (new Date(b.breakOut) - new Date(b.breakIn)) / 60000;
        totalBreakMinutes += dur;
      } else if (b.breakIn) {
        dur = (new Date() - new Date(b.breakIn)) / 60000;
        totalBreakMinutes += dur;
      }

      breaks.push({
        index: i + 1,
        breakStart: b.breakIn
          ? new Date(b.breakIn).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : null,
        breakEnd: b.breakOut
          ? new Date(b.breakOut).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Ongoing",
        duration:
          dur > 0 ? `${Math.floor(dur / 60)}h ${Math.floor(dur % 60)}m` : "0m",
        isActive: !!(b.breakIn && !b.breakOut),
      });
    });

    totalWorkMinutes -= totalBreakMinutes;
  }

  return {
    presentToday: monthPresentDays, // present days this month (up to today)
    totalWorkHours: parseFloat((weekWorkMinutes / 60).toFixed(1)),
    lateCheckIns: totalLateDays,
    absentToday: 0,
    onBreak: isOnBreak ? 1 : 0,
    checkInTime,
    checkOutTime,
    totalBreakTime:
      totalBreakMinutes > 0
        ? `${Math.floor(totalBreakMinutes / 60)}:${String(Math.floor(totalBreakMinutes % 60)).padStart(2, "0")}`
        : "0:00",
    workingHours:
      totalWorkMinutes > 0
        ? `${Math.floor(totalWorkMinutes / 60)}h ${Math.floor(totalWorkMinutes % 60)}m`
        : "---",
    goalProgress: Math.min(
      100,
      Math.round((totalWorkMinutes / (8 * 60)) * 100),
    ),
    userStatus: todayRecord?.status || "NOT_CHECKED_IN",
    breaks,
  };
};

// ─── Weekly stats (all users, current week)

export const computeWeeklyStats = async () => {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay()); // Sunday
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const results = await Promise.all(
    Array.from({ length: 7 }, async (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dateStr = toDateStr(d);
      const recs = await Attendance.find({ date: dateStr });

      const present = recs.filter((r) =>
        [
          "CHECKED_IN",
          "ON_BREAK",
          "BACK_TO_WORK",
          "CHECKED_OUT",
          "LATE",
        ].includes(r.status),
      ).length;

      let mins = 0;
      recs.forEach((r) => {
        if (r.checkIn && r.checkOut) {
          let m = (new Date(r.checkOut) - new Date(r.checkIn)) / 60000;
          r.breaks?.forEach((b) => {
            if (b.breakIn && b.breakOut)
              m -= (new Date(b.breakOut) - new Date(b.breakIn)) / 60000;
          });
          mins += m;
        }
      });

      return {
        day: DAYS[i],
        present,
        hours: parseFloat((mins / 60).toFixed(1)),
      };
    }),
  );

  return {
    weeklyAttendance: results.map(({ day, present }) => ({ day, present })),
    weeklyWorkHours: results.map(({ day, hours }) => ({ day, hours })),
  };
};

// ─── All-users monthly summary (admin list page)

export const computeAllUsersSummary = async (year, month) => {
  const firstDay = monthFirstDay(year, month);
  const lastDay = monthLastDay(year, month);
  const todayStr = getToday();

  // Fetch holidays for the month to exclude them from working days
  const holidays = await Holiday.find({
    date: {
      $gte: new Date(firstDay + "T00:00:00.000Z"),
      $lte: new Date(lastDay + "T23:59:59.999Z"),
    },
  });
  const holidayDates = new Set(
    holidays.map((h) => toDateStr(new Date(h.date))),
  );

  // Working days = non-weekend, non-holiday days from 1st up to min(lastDay, today)
  const effectiveEnd = lastDay > todayStr ? todayStr : lastDay;
  const workingDays = buildWorkingDays(firstDay, effectiveEnd, holidayDates);
  const workingDaysCount = workingDays.length;

  // Fetch all records for the month in one query
  const [allRecords, todayRecords] = await Promise.all([
    Attendance.find({ date: { $gte: firstDay, $lte: lastDay } }).populate({
      path: "userId",
      select: "name email _id department role",
      populate: { path: "role department", select: "name" },
    }),
    Attendance.find({ date: todayStr }),
  ]);

  // Fetch all approved leaves for the month to calculate expected working days per user
  const allApprovedLeaves = await Leave.find({
    status: "APPROVED",
    fromDate: { $lte: new Date(effectiveEnd + "T23:59:59.999Z") },
    toDate: { $gte: new Date(firstDay + "T00:00:00.000Z") },
  });

  // Build per-user leave-day sets (only leave days that fall on working days)
  const userLeaveDays = new Map(); // userId -> Set of date strings
  for (const leave of allApprovedLeaves) {
    const uid = leave.user?.toString();
    if (!uid) continue;
    if (!userLeaveDays.has(uid)) userLeaveDays.set(uid, new Set());
    const leaveDays = userLeaveDays.get(uid);
    const lc = localDate(toDateStr(new Date(leave.fromDate)));
    const le = localDate(toDateStr(new Date(leave.toDate)));
    while (lc <= le) {
      const ds = toDateStr(lc);
      // Only count leave days that are in the workingDays list
      if (workingDays.includes(ds)) leaveDays.add(ds);
      lc.setDate(lc.getDate() + 1);
    }
  }

  // Per-user stats
  const userMap = new Map();
  const PRESENT_STATUSES = new Set([
    "CHECKED_IN",
    "ON_BREAK",
    "BACK_TO_WORK",
    "CHECKED_OUT",
    "LATE",
  ]);

  for (const r of allRecords) {
    const uid = r.userId?._id?.toString();
    if (!uid) continue;
    if (!userMap.has(uid)) {
      const leaveDays = userLeaveDays.get(uid) || new Set();
      userMap.set(uid, {
        totalDays: workingDaysCount,
        present: 0,
        pending: 0,
        lateCount: 0,
        expectedWorkingDays: Math.max(0, workingDaysCount - leaveDays.size),
      });
    }
    const s = userMap.get(uid);
    if (PRESENT_STATUSES.has(r.status)) {
      if (r.status === "CHECKED_OUT") s.present++;
      else s.pending++;
    }
    if (r.isLate) s.lateCount++;
  }

  // Today's dashboard totals
  const presentToday = todayRecords.filter((r) =>
    PRESENT_STATUSES.has(r.status),
  ).length;
  const lateToday = todayRecords.filter(
    (r) => r.isLate || r.status === "LATE",
  ).length;
  const onBreakToday = todayRecords.filter(
    (r) => r.status === "ON_BREAK",
  ).length;

  // Total work hours for the month across all users
  let totalWorkMinutes = 0;
  for (const r of allRecords) {
    if (r.checkIn && r.checkOut) {
      let m = (new Date(r.checkOut) - new Date(r.checkIn)) / 60000;
      (r.breaks || []).forEach((b) => {
        if (b.breakIn && b.breakOut)
          m -= (new Date(b.breakOut) - new Date(b.breakIn)) / 60000;
      });
      totalWorkMinutes += m;
    }
  }

  return {
    period: { firstDay, lastDay, workingDays: workingDaysCount },
    todayStats: {
      presentToday,
      lateToday,
      onBreakToday,
      totalWorkHours: parseFloat((totalWorkMinutes / 60).toFixed(1)),
    },
    userStats: Object.fromEntries(userMap),
  };
};

// ─── Per-user summary for admin (by userId)

export const computeUserSummary = async (userId, year, month) => {
  return computeSummary(
    userId,
    monthFirstDay(year, month),
    monthLastDay(year, month),
  );
};

// ─── User attendance by ID (admin)

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
  } else if (startDate && endDate) {
    const effectiveEnd = endDate > todayStr ? todayStr : endDate;
    filter.date = { $gte: startDate, $lte: effectiveEnd };
  } else {
    filter.date = todayStr;
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
