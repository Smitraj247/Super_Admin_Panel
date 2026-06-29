import Attendance from "../../models/Attendance.js";

export const populateUser = (id) =>
  Attendance.findById(id).populate("userId", "email name _id");

export const populateRecord = (id) =>
  Attendance.findById(id).populate({
    path: "userId",
    select: "name email _id",
    populate: { path: "role department", select: "name" },
  });

/**
 * Determines and assigns the correct status for an attendance record
 * based on checks for checkIn, checkOut, and active breaks.
 */
export const recalculateRecordStatus = (record, forceStatus = null) => {
  if (forceStatus) {
    record.status = forceStatus;
    return;
  }
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
