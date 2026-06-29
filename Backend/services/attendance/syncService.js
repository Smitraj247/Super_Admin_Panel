import Attendance from "../../models/Attendance.js";
import Leave from "../../models/Leave.js";
import { getToday, localDate, toDateStr } from "../../utils/dateUtils.js";
import { recalculateRecordStatus } from "./attendanceHelper.js";

/**
 * Keeps leave-related attendance rows aligned with approved leaves:
 * - removes orphaned HALF_DAY_LEAVE / ON_LEAVE rows (no matching approved leave)
 * - creates missing markers for approved leaves without attendance rows
 */
export const syncLeaveAttendanceForRange = async (
  userId,
  startDate,
  endDate,
) => {
  const todayStr = getToday();
  const effectiveEnd = endDate > todayStr ? todayStr : endDate;

  const approvedLeaves = await Leave.find({
    user: userId,
    status: "APPROVED",
    fromDate: { $lte: new Date(`${effectiveEnd}T23:59:59.999Z`) },
    toDate: { $gte: new Date(`${startDate}T00:00:00.000Z`) },
  });

  const validLeaveByDate = new Map();
  for (const leave of approvedLeaves) {
    const lc = localDate(toDateStr(new Date(leave.fromDate)));
    const le = localDate(toDateStr(new Date(leave.toDate)));
    while (lc <= le) {
      const ds = toDateStr(lc);
      if (ds >= startDate && ds <= effectiveEnd) {
        validLeaveByDate.set(ds, leave.isHalfDay);
      }
      lc.setDate(lc.getDate() + 1);
    }
  }

  const leaveRecords = await Attendance.find({
    userId,
    date: { $gte: startDate, $lte: effectiveEnd },
    status: { $in: ["HALF_DAY_LEAVE", "ON_LEAVE"] },
  });

  for (const record of leaveRecords) {
    if (!validLeaveByDate.has(record.date)) {
      if (!record.checkIn) {
        await Attendance.deleteOne({ _id: record._id });
      } else {
        recalculateRecordStatus(record);
        await record.save();
      }
    }
  }

  for (const [dateStr, isHalfDay] of validLeaveByDate) {
    const existing = await Attendance.findOne({ userId, date: dateStr });
    if (!existing) {
      await Attendance.create({
        userId,
        date: dateStr,
        checkIn: null,
        checkOut: null,
        breaks: [],
        status: isHalfDay ? "HALF_DAY_LEAVE" : "ON_LEAVE",
      });
    }
  }
};
