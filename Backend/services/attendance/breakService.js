import mongoose from "mongoose";
import Attendance from "../../models/Attendance.js";
import { emitEvent, SocketEvents } from "../../utils/socketEmitter.js";
import { getToday } from "../../utils/dateUtils.js";
import {
  populateUser,
  populateRecord,
  recalculateRecordStatus,
} from "./attendanceHelper.js";

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
