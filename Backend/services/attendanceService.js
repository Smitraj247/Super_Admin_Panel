import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import Holiday from "../models/Holiday.js";

export const getToday = () => new Date().toISOString().split("T")[0];

// ─── Internal populate helpers ────────────────────────────────────────────────

const populateUser = (id) =>
  Attendance.findById(id).populate("userId", "email name _id");

const populateRecord = (id) =>
  Attendance.findById(id).populate({
    path: "userId", select: "name email _id",
    populate: { path: "role department", select: "name" },
  });

// ─── Employee actions ─────────────────────────────────────────────────────────

export const performCheckIn = async (userId) => {
  const today = getToday();
  if (await Attendance.findOne({ userId, date: today }))
    throw Object.assign(new Error("Already checked in"), { status: 400, code: 11000 });

  const now = new Date();
  const istParts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(now);

  const hour = Number(istParts.find((p) => p.type === "hour").value);
  const min  = Number(istParts.find((p) => p.type === "minute").value);
  const isLate = hour > 10 || (hour === 10 && min >= 15);

  const record = await Attendance.create({
    userId: new mongoose.Types.ObjectId(userId),
    date: today, checkIn: now,
    status: isLate ? "LATE" : "CHECKED_IN",
    isLate,
  });

  return { record: await populateUser(record._id), isLate };
};

export const performBreakIn = async (userId) => {
  const record = await Attendance.findOne({ userId, date: getToday() });
  if (!record) throw Object.assign(new Error("Please check in first"), { status: 400 });
  if (!["CHECKED_IN", "BACK_TO_WORK", "LATE"].includes(record.status))
    throw Object.assign(new Error(`Cannot start break. Current status: ${record.status}`), { status: 400 });

  record.breaks.push({ breakIn: new Date() });
  record.status = "ON_BREAK";
  await record.save();
  return populateUser(record._id);
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
  return populateUser(record._id);
};

export const performCheckOut = async (userId) => {
  const record = await Attendance.findOne({ userId, date: getToday() });
  if (!record || record.status === "CHECKED_OUT")
    throw Object.assign(new Error("Cannot check out"), { status: 400 });

  record.checkOut = new Date();
  record.status = "CHECKED_OUT";
  await record.save();
  return populateUser(record._id);
};

export const fetchTodayStatus = async (userId) => {
  const record = await Attendance.findOne({ userId, date: getToday() }).populate("userId", "email name _id");
  return record ? { status: record.status, record } : { status: "NOT_CHECKED_IN" };
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export const fetchByDateRange = async (userId, startDate, endDate, date) => {
  const filter = { userId };
  if (startDate && endDate) filter.date = { $gte: startDate, $lte: endDate };
  else if (date) filter.date = date;
  else throw Object.assign(new Error("Date or date range is required"), { status: 400 });

  return Attendance.find(filter).populate("userId", "email name _id").sort({ date: 1 });
};

export const fetchAllUsersAttendance = async ({ startDate, endDate, date, page = 1, limit = 50 }, departmentFilter) => {
  const filter = {};
  if (date) filter.date = date;
  else if (startDate && endDate) filter.date = { $gte: startDate, $lte: endDate };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  let attendance = await Attendance.find(filter)
    .populate({ path: "userId", select: "name email _id department role", populate: { path: "role department", select: "name" } })
    .sort({ date: -1, createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  if (departmentFilter?.department) {
    attendance = attendance.filter(
      (r) => r.userId?.department?._id?.toString() === departmentFilter.department.toString()
    );
  }

  return { data: attendance, total: attendance.length, page: parseInt(page), limit: parseInt(limit) };
};

// ─── Admin record update ──────────────────────────────────────────────────────

export const updateRecord = async (id, { checkIn, checkOut, breakIn, breakOut, breakIndex }) => {
  const record = await Attendance.findById(id);
  if (!record) throw Object.assign(new Error("Attendance record not found"), { status: 404 });

  if (checkIn !== undefined) record.checkIn = checkIn ? new Date(checkIn) : null;

  if (checkOut !== undefined) {
    if (checkOut === null) { record.checkOut = null; record.status = "CHECKED_IN"; }
    else { record.checkOut = new Date(checkOut); record.status = "CHECKED_OUT"; }
  }

  if (breakIndex !== undefined && (breakIn !== undefined || breakOut !== undefined)) {
    if (record.breaks[breakIndex]) {
      if (breakIn !== undefined) record.breaks[breakIndex].breakIn = breakIn ? new Date(breakIn) : record.breaks[breakIndex].breakIn;
      if (breakOut !== undefined) record.breaks[breakIndex].breakOut = breakOut ? new Date(breakOut) : null;
    }
  } else if (breakIn !== undefined || breakOut !== undefined) {
    if (breakIn && !breakOut) {
      record.breaks.push({ breakIn: new Date(breakIn) });
      record.status = "ON_BREAK";
    } else if (breakIn && breakOut) {
      record.breaks.push({ breakIn: new Date(breakIn), breakOut: new Date(breakOut) });
      if (!record.checkOut) record.status = "BACK_TO_WORK";
    }
  }

  await record.save();
  return populateRecord(record._id);
};

export const finishBreak = async (id, breakIndex, breakOut) => {
  const record = await Attendance.findById(id);
  if (!record) throw Object.assign(new Error("Attendance record not found"), { status: 404 });
  if (breakIndex === undefined || !record.breaks[breakIndex])
    throw Object.assign(new Error("Invalid break index"), { status: 400 });

  record.breaks[breakIndex].breakOut = new Date(breakOut);
  if (!record.checkOut) record.status = "BACK_TO_WORK";
  await record.save();
  return populateRecord(record._id);
};

// ─── Summary ──────────────────────────────────────────────────────────────────

export const computeSummary = async (userId, startDate, endDate) => {
  const [records, approvedHalfDayLeaves, holidays, approvedFullLeaves] = await Promise.all([
    Attendance.find({ userId, date: { $gte: startDate, $lte: endDate } }),
    Leave.find({ user: userId, isHalfDay: true, status: "APPROVED", fromDate: { $lte: new Date(endDate) }, toDate: { $gte: new Date(startDate) } }),
    Holiday.find({ date: { $gte: new Date(startDate), $lte: new Date(endDate) } }),
    Leave.find({ user: userId, isHalfDay: false, status: "APPROVED", fromDate: { $lte: new Date(endDate) }, toDate: { $gte: new Date(startDate) } }),
  ]);

  const holidayDates = new Set(holidays.map((h) => new Date(h.date).toISOString().split("T")[0]));

  const workingDays = [];
  const cursor = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date(); today.setHours(23, 59, 59, 999);
  while (cursor <= end && cursor <= today) {
    const ds = cursor.toISOString().split("T")[0];
    if (cursor.getDay() !== 0 && !holidayDates.has(ds)) workingDays.push(ds);
    cursor.setDate(cursor.getDate() + 1);
  }

  const attendanceByDate = new Map(records.map((r) => [r.date, r]));
  const alreadyMarked = new Set(records.filter((r) => r.status === "HALF_DAY_LEAVE").map((r) => r.date));
  const leaveHalfDayCount = approvedHalfDayLeaves.filter(
    (l) => !alreadyMarked.has(new Date(l.fromDate).toISOString().split("T")[0])
  ).length;

  const fullLeaveDates = new Set();
  approvedFullLeaves.forEach((l) => {
    const lc = new Date(l.fromDate), le = new Date(l.toDate);
    while (lc <= le) { fullLeaveDates.add(lc.toISOString().split("T")[0]); lc.setDate(lc.getDate() + 1); }
  });

  const REQUIRED_DAILY_HOURS = 8.5, HALF_DAY_HOURS = 4;
  let present = 0, absent = 0, halfDay = 0, totalWorkMinutes = 0, onLeave = 0;

  for (const ds of workingDays) {
    const r = attendanceByDate.get(ds);
    if (!r) { fullLeaveDates.has(ds) ? onLeave++ : absent++; continue; }
    if (r.status === "ON_LEAVE")       { onLeave++;                       continue; }
    if (r.status === "HALF_DAY_LEAVE") { halfDay++; present++; onLeave++; continue; }
    if (!r.checkIn)                    { absent++;                         continue; }

    present++;
    if (r.checkOut) {
      let mins = (new Date(r.checkOut) - new Date(r.checkIn)) / 60000;
      r.breaks?.forEach((b) => { if (b.breakIn && b.breakOut) mins -= (new Date(b.breakOut) - new Date(b.breakIn)) / 60000; });
      totalWorkMinutes += mins;
      if (mins / 60 < HALF_DAY_HOURS) halfDay++;
    }
  }

  halfDay += leaveHalfDayCount;
  present += leaveHalfDayCount;

  const totalWorkHours  = parseFloat((totalWorkMinutes / 60).toFixed(1));
  const totalOfficeHours = present * REQUIRED_DAILY_HOURS;
  const productivity    = totalOfficeHours ? parseInt(((totalWorkMinutes / 60 / totalOfficeHours) * 100).toFixed(0)) : 0;

  return { totalDays: workingDays.length, present, absent, halfDay, totalOffice: present, totalWorkHours, totalOfficeHours, productivity, leaves: onLeave };
};

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export const computeDashboardStats = async (userId) => {
  const today = getToday();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const [allRecords, weekRecords, todayRecord] = await Promise.all([
    Attendance.find({ userId }).sort({ date: -1 }),
    Attendance.find({ userId, date: { $gte: weekStartStr, $lte: today } }),
    Attendance.findOne({ userId, date: today }),
  ]);

  let totalPresentDays = 0, totalLateDays = 0;
  allRecords.forEach((r) => {
    if (["CHECKED_IN", "ON_BREAK", "BACK_TO_WORK", "CHECKED_OUT", "LATE"].includes(r.status)) totalPresentDays++;
    if (r.isLate) totalLateDays++;
  });

  let weekWorkMinutes = 0;
  weekRecords.forEach((r) => {
    if (r.checkIn && r.checkOut) {
      let m = (new Date(r.checkOut) - new Date(r.checkIn)) / 60000;
      r.breaks?.forEach((b) => { if (b.breakIn && b.breakOut) m -= (new Date(b.breakOut) - new Date(b.breakIn)) / 60000; });
      weekWorkMinutes += m;
    }
  });

  let totalWorkMinutes = 0, totalBreakMinutes = 0;
  let checkInTime = "---", checkOutTime = "---", breaks = [], isOnBreak = false;

  if (todayRecord) {
    if (todayRecord.checkIn) checkInTime = new Date(todayRecord.checkIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    if (todayRecord.checkOut) {
      checkOutTime = new Date(todayRecord.checkOut).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      totalWorkMinutes = (new Date(todayRecord.checkOut) - new Date(todayRecord.checkIn)) / 60000;
    } else if (todayRecord.checkIn) {
      totalWorkMinutes = (new Date() - new Date(todayRecord.checkIn)) / 60000;
    }

    isOnBreak = todayRecord.status === "ON_BREAK";

    todayRecord.breaks?.forEach((b, i) => {
      let dur = 0;
      if (b.breakIn && b.breakOut) { dur = (new Date(b.breakOut) - new Date(b.breakIn)) / 60000; totalBreakMinutes += dur; }
      else if (b.breakIn) { dur = (new Date() - new Date(b.breakIn)) / 60000; totalBreakMinutes += dur; }

      breaks.push({
        index: i + 1,
        breakStart: b.breakIn ? new Date(b.breakIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : null,
        breakEnd: b.breakOut ? new Date(b.breakOut).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "Ongoing",
        duration: dur > 0 ? `${Math.floor(dur / 60)}h ${Math.floor(dur % 60)}m` : "0m",
        isActive: !!(b.breakIn && !b.breakOut),
      });
    });

    totalWorkMinutes -= totalBreakMinutes;
  }

  return {
    presentToday: totalPresentDays,
    totalWorkHours: parseFloat((weekWorkMinutes / 60).toFixed(1)),
    lateCheckIns: totalLateDays,
    absentToday: 0,
    onBreak: isOnBreak ? 1 : 0,
    checkInTime, checkOutTime,
    totalBreakTime: totalBreakMinutes > 0
      ? `${Math.floor(totalBreakMinutes / 60)}:${String(Math.floor(totalBreakMinutes % 60)).padStart(2, "0")}`
      : "0:00",
    workingHours: totalWorkMinutes > 0
      ? `${Math.floor(totalWorkMinutes / 60)}h ${Math.floor(totalWorkMinutes % 60)}m`
      : "---",
    goalProgress: Math.min(100, Math.round((totalWorkMinutes / (8 * 60)) * 100)),
    userStatus: todayRecord?.status || "NOT_CHECKED_IN",
    breaks,
  };
};

export const computeWeeklyStats = async () => {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const results = await Promise.all(
    Array.from({ length: 7 }, async (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const recs = await Attendance.find({ date: dateStr });

      const present = recs.filter((r) =>
        ["CHECKED_IN", "ON_BREAK", "BACK_TO_WORK", "CHECKED_OUT", "LATE"].includes(r.status)
      ).length;

      let mins = 0;
      recs.forEach((r) => {
        if (r.checkIn && r.checkOut) {
          let m = (new Date(r.checkOut) - new Date(r.checkIn)) / 60000;
          r.breaks?.forEach((b) => { if (b.breakIn && b.breakOut) m -= (new Date(b.breakOut) - new Date(b.breakIn)) / 60000; });
          mins += m;
        }
      });

      return { day: DAYS[i], present, hours: parseFloat((mins / 60).toFixed(1)) };
    })
  );

  return {
    weeklyAttendance: results.map(({ day, present }) => ({ day, present })),
    weeklyWorkHours:  results.map(({ day, hours })   => ({ day, hours })),
  };
};
