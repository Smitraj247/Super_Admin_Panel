import Attendance from "../../models/Attendance.js";
import Leave from "../../models/Leave.js";
import Holiday from "../../models/Holiday.js";
import User from "../../models/User.models.js";
import {
  getToday,
  monthFirstDay,
  monthLastDay,
  localDate,
  toDateStr,
  getUserEmploymentStartStr,
  emptySummary,
  getLastSaturday,
} from "../../utils/dateUtils.js";

/**
 * Builds the working-day list for [startDate, endDate], capped at today (IST).
 * Working days = Mon–Fri (excluding weekends) + the last Saturday of each month,
 * minus public holidays.
 */
const buildWorkingDays = (startDate, endDate, holidayDates) => {
  const workingDays = [];
  const todayStr = getToday();
  const cursor = localDate(startDate);
  const end = localDate(endDate > todayStr ? todayStr : endDate);

  const lastSaturdayCache = {};

  while (cursor <= end) {
    const ds = toDateStr(cursor);
    const dow = cursor.getDay(); // 0=Sun, 6=Sat

    if (dow === 0) {
      cursor.setDate(cursor.getDate() + 1);
      continue;
    }

    if (dow === 6) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth() + 1;
      const cacheKey = `${y}-${m}`;
      if (!lastSaturdayCache[cacheKey]) {
        lastSaturdayCache[cacheKey] = getLastSaturday(y, m);
      }
      if (ds !== lastSaturdayCache[cacheKey]) {
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
  const todayStr = getToday();
  const effectiveEnd = endDate > todayStr ? todayStr : endDate;

  const user = await User.findById(userId).select("joiningDate createdAt");
  const employmentStartStr = getUserEmploymentStartStr(user);
  const effectiveStart =
    employmentStartStr && employmentStartStr > startDate
      ? employmentStartStr
      : startDate;

  if (effectiveStart > effectiveEnd) {
    return emptySummary();
  }

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
    Holiday.find({
      date: {
        $gte: new Date(startDate + "T00:00:00.000Z"),
        $lte: new Date(effectiveEnd + "T23:59:59.999Z"),
      },
    }),
  ]);

  const holidayDates = new Set(
    holidays.map((h) => toDateStr(new Date(h.date))),
  );

  const workingDays = buildWorkingDays(
    effectiveStart,
    effectiveEnd,
    holidayDates,
  );

  const approvedHalfDayDates = new Set();
  const approvedFullDayDates = new Set();
  let plLeaveDays = 0;

  for (const leave of approvedLeaves) {
    const lc = localDate(toDateStr(new Date(leave.fromDate)));
    const le = localDate(toDateStr(new Date(leave.toDate)));

    while (lc <= le) {
      const ds = toDateStr(lc);
      if (workingDays.includes(ds)) {
        if (leave.isHalfDay) {
          approvedHalfDayDates.add(ds);
        } else {
          approvedFullDayDates.add(ds);
        }
        if (leave.leaveType === "PL") {
          if (leave.isHalfDay) {
            plLeaveDays += 0.5;
          } else {
            plLeaveDays += 1;
          }
        }
      }
      lc.setDate(lc.getDate() + 1);
    }
  }

  const attendanceByDate = new Map(records.map((r) => [r.date, r]));

  const HALF_DAY_HOURS = 4;
  let present = 0,
    pending = 0,
    halfDay = 0,
    totalWorkMinutes = 0;

  for (const ds of workingDays) {
    if (approvedHalfDayDates.has(ds)) {
      halfDay++;
      present++;
      continue;
    }

    if (approvedFullDayDates.has(ds)) {
      continue;
    }

    const r = attendanceByDate.get(ds);

    if (!r || !r.checkIn) {
      continue;
    }

    present++;
    if (r.checkOut) {
      let mins = (new Date(r.checkOut) - new Date(r.checkIn)) / 60000;
      r.breaks?.forEach((b) => {
        if (b.breakIn && b.breakOut)
          mins -= (new Date(b.breakOut) - new Date(b.breakIn)) / 60000;
      });
      totalWorkMinutes += mins;
      if (mins / 60 < HALF_DAY_HOURS) halfDay++;
    } else {
      pending++;
    }
  }

  const absent = Math.max(0, workingDays.length - present);

  const expectedWorkingDays = Math.max(
    0,
    workingDays.length - approvedFullDayDates.size,
  );

  const lateCount = records.filter(
    (r) => r.isLate && r.date >= effectiveStart,
  ).length;
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
    leaves: plLeaveDays,
    lateCount,
    attendanceRate,
    avgWorkHours,
    expectedWorkingDays,
  };
};

export const computeDashboardStats = async (userId) => {
  const today = getToday();

  const istParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const istYear = parseInt(istParts.find((p) => p.type === "year").value);
  const istMonth = parseInt(istParts.find((p) => p.type === "month").value);

  const monthStart = monthFirstDay(istYear, istMonth);

  const [ty, tm, td] = today.split("-").map(Number);
  const todayLocal = new Date(ty, tm - 1, td);
  const dow = todayLocal.getDay();
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  const weekStartDate = new Date(todayLocal);
  weekStartDate.setDate(todayLocal.getDate() - daysFromMon);
  const weekStartStr = toDateStr(weekStartDate);

  const [monthRecords, weekRecords, todayRecord] = await Promise.all([
    Attendance.find({ userId, date: { $gte: monthStart, $lte: today } }),
    Attendance.find({ userId, date: { $gte: weekStartStr, $lte: today } }),
    Attendance.findOne({ userId, date: today }),
  ]);

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
    if (dow === 0 || dow === 6) return;
    if (PRESENT_STATUSES.has(r.status) && r.checkIn) monthPresentDays++;
    if (r.isLate) totalLateDays++;
  });

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
    presentToday: monthPresentDays,
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

export const computeWeeklyStats = async () => {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
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

export const computeAllUsersSummary = async (year, month) => {
  const firstDay = monthFirstDay(year, month);
  const lastDay = monthLastDay(year, month);
  const todayStr = getToday();

  const holidays = await Holiday.find({
    date: {
      $gte: new Date(firstDay + "T00:00:00.000Z"),
      $lte: new Date(lastDay + "T23:59:59.999Z"),
    },
  });
  const holidayDates = new Set(
    holidays.map((h) => toDateStr(new Date(h.date))),
  );

  const effectiveEnd = lastDay > todayStr ? todayStr : lastDay;
  const workingDays = buildWorkingDays(firstDay, effectiveEnd, holidayDates);
  const workingDaysCount = workingDays.length;

  const activeUsers = await User.find({ isActive: true }).select(
    "_id joiningDate createdAt",
  );
  const activeUserIds = new Set(activeUsers.map((u) => u._id.toString()));
  const userEmploymentStart = new Map(
    activeUsers.map((u) => [u._id.toString(), getUserEmploymentStartStr(u)]),
  );

  const [allRecords, todayRecords, allApprovedLeaves] = await Promise.all([
    Attendance.find({ date: { $gte: firstDay, $lte: lastDay } }).populate({
      path: "userId",
      select: "name email _id department role",
      populate: { path: "role department", select: "name" },
    }),
    Attendance.find({ date: todayStr }),
    Leave.find({
      status: "APPROVED",
      fromDate: { $lte: new Date(effectiveEnd + "T23:59:59.999Z") },
      toDate: { $gte: new Date(firstDay + "T00:00:00.000Z") },
    }),
  ]);

  const userLeaveDays = new Map();
  for (const leave of allApprovedLeaves) {
    const uid = leave.user?.toString();
    if (!uid) continue;
    if (!userLeaveDays.has(uid)) {
      userLeaveDays.set(uid, {
        fullDay: new Set(),
        halfDay: new Set(),
        plDays: 0,
      });
    }
    const userLeaves = userLeaveDays.get(uid);
    const lc = localDate(toDateStr(new Date(leave.fromDate)));
    const le = localDate(toDateStr(new Date(leave.toDate)));
    while (lc <= le) {
      const ds = toDateStr(lc);
      if (workingDays.includes(ds)) {
        if (leave.isHalfDay) {
          userLeaves.halfDay.add(ds);
        } else {
          userLeaves.fullDay.add(ds);
        }
        if (leave.leaveType === "PL") {
          if (leave.isHalfDay) {
            userLeaves.plDays += 0.5;
          } else {
            userLeaves.plDays += 1;
          }
        }
      }
      lc.setDate(lc.getDate() + 1);
    }
  }

  const todayAttendanceMap = new Map();
  for (const r of todayRecords) {
    todayAttendanceMap.set(r.userId.toString(), r);
  }

  const userAttendance = new Map();
  for (const r of allRecords) {
    const uid = r.userId?._id?.toString();
    if (!uid) continue;
    if (!userAttendance.has(uid)) {
      userAttendance.set(uid, []);
    }
    userAttendance.get(uid).push(r);
  }

  const userMap = new Map();
  const PRESENT_STATUSES = new Set([
    "CHECKED_IN",
    "ON_BREAK",
    "BACK_TO_WORK",
    "CHECKED_OUT",
    "LATE",
  ]);

  for (const userId of activeUserIds) {
    const employmentStartStr = userEmploymentStart.get(userId);
    const userWorkingDays = employmentStartStr
      ? workingDays.filter((ds) => ds >= employmentStartStr)
      : workingDays;
    const userWorkingDaysCount = userWorkingDays.length;

    const userLeaves = userLeaveDays.get(userId) || {
      fullDay: new Set(),
      halfDay: new Set(),
      plDays: 0,
    };
    const userRecords = userAttendance.get(userId) || [];
    const attendanceByDate = new Map(userRecords.map((r) => [r.date, r]));

    let present = 0;
    let halfDay = 0;

    for (const ds of userWorkingDays) {
      if (userLeaves.halfDay.has(ds)) {
        halfDay++;
        present++;
        continue;
      }

      if (userLeaves.fullDay.has(ds)) {
        continue;
      }

      const r = attendanceByDate.get(ds);
      if (!r || !r.checkIn) {
        continue;
      }

      present++;
    }

    const absent = Math.max(0, userWorkingDaysCount - present);

    const expectedWorkingDays = Math.max(
      0,
      userWorkingDaysCount - userLeaves.fullDay.size,
    );

    const todayRecord = todayAttendanceMap.get(userId);
    let todayStatus = "Absent";
    if (todayRecord && PRESENT_STATUSES.has(todayRecord.status)) {
      todayStatus = "Present";
    } else if (
      userLeaves.fullDay.has(todayStr) ||
      userLeaves.halfDay.has(todayStr)
    ) {
      todayStatus = "On Leave";
    }

    userMap.set(userId, {
      totalDays: userWorkingDaysCount,
      present,
      absent,
      halfDay,
      lateCount: userRecords.filter(
        (r) =>
          r.isLate && (!employmentStartStr || r.date >= employmentStartStr),
      ).length,
      expectedWorkingDays,
      todayStatus,
    });
  }

  const presentToday = todayRecords.filter(
    (r) =>
      PRESENT_STATUSES.has(r.status) && activeUserIds.has(r.userId.toString()),
  ).length;
  const lateToday = todayRecords.filter(
    (r) =>
      (r.isLate || r.status === "LATE") &&
      activeUserIds.has(r.userId.toString()),
  ).length;
  const onBreakToday = todayRecords.filter(
    (r) => r.status === "ON_BREAK" && activeUserIds.has(r.userId.toString()),
  ).length;

  let totalWorkMinutes = 0;
  for (const r of allRecords) {
    const uid = r.userId?._id?.toString();
    if (!activeUserIds.has(uid)) continue;
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

export const computeUserSummary = async (userId, year, month) => {
  return computeSummary(
    userId,
    monthFirstDay(year, month),
    monthLastDay(year, month),
  );
};
