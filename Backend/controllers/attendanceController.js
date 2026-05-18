import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";
const getToday = () => new Date().toISOString().split("T")[0];

export const checkIn = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized - user not authenticated" });
    }

    const userId = req.user._id;

    if (!userId || typeof userId !== "object") {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const today = getToday();

    // Check if already checked in today
    const existing = await Attendance.findOne({ userId, date: today });
    if (existing) {
      return res.status(400).json({ message: "Already checked in" });
    }

    const now = new Date();
    
    // Get current IST time using Asia/Kolkata timezone
    const istParts = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
    
    const checkInHour = Number(istParts.find((p) => p.type === "hour").value);
    const checkInMin = Number(istParts.find((p) => p.type === "minute").value);

    // Late threshold = 10:15 AM IST
    const LATE_THRESHOLD_HOUR = 10;
    const LATE_THRESHOLD_MIN = 15;
    const isLate = checkInHour > LATE_THRESHOLD_HOUR || 
                   (checkInHour === LATE_THRESHOLD_HOUR && checkInMin >= LATE_THRESHOLD_MIN);

    const record = await Attendance.create({
      userId: new mongoose.Types.ObjectId(userId),
      date: today,
      checkIn: now,
      status: isLate ? "LATE" : "CHECKED_IN",
      isLate: isLate,
    });

    const populatedRecord = await Attendance.findById(record._id).populate("userId", "email name _id");

    res.json({ 
      message: isLate ? "Checked in successfully (Late)" : "Checked in successfully", 
      record: populatedRecord,
      isLate: isLate
    });
  } catch (error) {
    console.error("Check In Error:", error.message);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Already checked in today" });
    }
    res.status(500).json({ message: error.message || "Error checking in" });
  }
};

export const breakIn = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = getToday();

    const record = await Attendance.findOne({ userId, date: today });

    if (!record) {
      console.log("Break In Error: No attendance record found for today");
      return res.status(400).json({ message: "Please check in first" });
    }

    if (!["CHECKED_IN", "BACK_TO_WORK", "LATE"].includes(record.status)) {
      console.log(`Break In Error: Invalid status - ${record.status}`);
      return res.status(400).json({ 
        message: `Cannot start break. Current status: ${record.status}` 
      });
    }

    record.breaks.push({ breakIn: new Date() });
    record.status = "ON_BREAK";

    await record.save();

    const populatedRecord = await Attendance.findById(record._id).populate(
      "userId",
      "email name _id",
    );

    res.json({ message: "Break started", record: populatedRecord });
  } catch (error) {
    console.error("Break In Error:", error.message);
    res.status(500).json({ message: error.message || "Error starting break" });
  }
};

export const breakOut = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = getToday();

    const record = await Attendance.findOne({ userId, date: today });
    if (!record || record.status !== "ON_BREAK") {
      return res.status(400).json({ message: "Cannot end break" });
    }

    const lastBreak = record.breaks[record.breaks.length - 1];
    if (!lastBreak || lastBreak.breakOut) {
      return res.status(400).json({ message: "No active break found" });
    }

    lastBreak.breakOut = new Date();
    record.status = "BACK_TO_WORK";

    await record.save();

    const populatedRecord = await Attendance.findById(record._id).populate(
      "userId",
      "email name _id",
    );

    res.json({ message: "Break ended", record: populatedRecord });
  } catch (error) {
    console.error("Break Out Error:", error.message);
    res.status(500).json({ message: error.message || "Error ending break" });
  }
};

export const checkOut = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = getToday();

    const record = await Attendance.findOne({ userId, date: today });
    if (!record || record.status === "CHECKED_OUT") {
      return res.status(400).json({ message: "Cannot check out" });
    }

    record.checkOut = new Date();
    record.status = "CHECKED_OUT";
    await record.save();

    const populatedRecord = await Attendance.findById(record._id).populate(
      "userId",
      "email name _id",
    );

    res.json({ message: "Checked out successfully", record: populatedRecord });
  } catch (error) {
    console.error("Check Out Error:", error.message);
    res.status(500).json({ message: error.message || "Error checking out" });
  }
};

export const getTodayStatus = async (req, res) => {
  try {
    const userId = req.user?._id;
    const today = getToday();

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const record = await Attendance.findOne({ userId, date: today }).populate(
      "userId",
      "email name _id",
    );

    if (!record) {
      return res.json({ status: "NOT_CHECKED_IN" });
    }
    res.json({ status: record.status, record });
  } catch (error) {
    res.status(500).json({ message: "Error fetching status", error });
  }
};

export const getAttendanceByDate = async (req, res) => {
  try {
    const { date, startDate, endDate } = req.query;
    const userId = req.user._id;

    const filter = { userId };

    // Date range query
    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    } else if (date) {
      filter.date = date;
    } else {
      return res.status(400).json({ message: "Date or date range is required" });
    }

    const records = await Attendance.find(filter)
      .populate("userId", "email name _id")
      .sort({ date: 1 });

    res.json(records);
  } catch (error) {
    console.error("Get Attendance Error:", error.message);
    res.status(500).json({ message: error.message || "Error fetching attendance" });
  }
};

export const getAttendanceByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user._id;

    const filter = { userId };

    if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const attendance = await Attendance.find(filter)
      .populate("userId", "email name _id")
      .sort({ date: 1 });

    res.json(attendance);
  } catch (error) {
    console.error("Get Attendance By Date Range Error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// HR Admin: Get all users' attendance
export const getAllUsersAttendance = async (req, res) => {
  try {
    const { startDate, endDate, date, page = 1, limit = 50 } = req.query;

    const filter = {};

    // Single date or date range filter
    if (date) {
      filter.date = date;
    } else if (startDate && endDate) {
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get attendance records
    let attendance = await Attendance.find(filter)
      .populate({
        path: "userId",
        select: "name email _id department role",
        populate: {
          path: "role department",
          select: "name",
        },
      })
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Filter by department if departmentFilter is set (for non-SUPER_ADMIN and non-HR)
    if (req.departmentFilter?.department) {
      attendance = attendance.filter(
        (record) =>
          record.userId?.department?._id?.toString() === req.departmentFilter.department.toString()
      );
    }

    const total = attendance.length;

    res.json({
      data: attendance,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get All Users Attendance Error:", error.message);
    res.status(500).json({ message: error.message || "Error fetching attendance" });
  }
};

// HR Admin: Update attendance record (complete missing actions)
export const updateAttendanceRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { checkIn, checkOut, breakIn, breakOut, breakIndex } = req.body;

    const record = await Attendance.findById(id);

    if (!record) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    // Update checkIn if provided
    if (checkIn !== undefined) {
      record.checkIn = checkIn ? new Date(checkIn) : null;
    }

    // Update checkOut if provided
    if (checkOut !== undefined) {
      if (checkOut === null) {
        record.checkOut = null;
        record.status = "CHECKED_IN";
      } else {
        record.checkOut = new Date(checkOut);
        record.status = "CHECKED_OUT";
      }
    }

    // Update existing break
    if (breakIndex !== undefined && (breakIn !== undefined || breakOut !== undefined)) {
      if (record.breaks[breakIndex]) {
        if (breakIn !== undefined) {
          record.breaks[breakIndex].breakIn = breakIn ? new Date(breakIn) : record.breaks[breakIndex].breakIn;
        }
        if (breakOut !== undefined) {
          record.breaks[breakIndex].breakOut = breakOut ? new Date(breakOut) : null;
        }
      }
    }
    // Add new break
    else if (breakIn !== undefined || breakOut !== undefined) {
      if (breakIn && !breakOut) {
        record.breaks.push({ breakIn: new Date(breakIn) });
        record.status = "ON_BREAK";
      } else if (breakIn && breakOut) {
        record.breaks.push({
          breakIn: new Date(breakIn),
          breakOut: new Date(breakOut),
        });
        if (!record.checkOut) {
          record.status = "BACK_TO_WORK";
        }
      }
    }

    await record.save();

    const updatedRecord = await Attendance.findById(record._id).populate({
      path: "userId",
      select: "name email _id",
      populate: {
        path: "role department",
        select: "name",
      },
    });

    res.json({
      message: "Attendance updated successfully",
      record: updatedRecord,
    });
  } catch (error) {
    console.error("Update Attendance Error:", error.message);
    res.status(500).json({ message: error.message || "Error updating attendance" });
  }
};

// HR Admin: Complete missing break-out
export const completeBreakOut = async (req, res) => {
  try {
    const { id } = req.params;
    const { breakIndex, breakOut } = req.body;

    const record = await Attendance.findById(id);

    if (!record) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    if (breakIndex === undefined || !record.breaks[breakIndex]) {
      return res.status(400).json({ message: "Invalid break index" });
    }

    // Update the specific break
    record.breaks[breakIndex].breakOut = new Date(breakOut);  

    // Update status if not checked out
    if (!record.checkOut) {
      record.status = "BACK_TO_WORK";
    }

    await record.save();

    const updatedRecord = await Attendance.findById(record._id).populate({
      path: "userId",
      select: "name email _id",
      populate: {
        path: "role department",
        select: "name",
      },
    });

    res.json({
      message: "Break completed successfully",
      record: updatedRecord,
    });
  } catch (error) {
    console.error("Complete Break Out Error:", error.message);
    res
      .status(500)
      .json({ message: error.message || "Error completing break" });
  }
};

export const getAttendanceSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const userId = req.user._id;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: "startDate and endDate are required" });
    }

    const records = await Attendance.find({
      userId,
      date: { $gte: startDate, $lte: endDate },
    });

    const REQUIRED_DAILY_HOURS = 8.5;
    const HALF_DAY_HOURS = 4;

    let totalDays = 0;
    let present = 0;
    let absent = 0;
    let halfDay = 0;
    let totalWorkMinutes = 0;
    let onLeave = 0;

    records.forEach((r) => {
      totalDays++;

      // Handle leave statuses - count as absent
      if (r.status === "ON_LEAVE") {
        absent++;
        onLeave++;
        return;
      }

      if (r.status === "HALF_DAY_LEAVE") {
        halfDay++;
        present++;
        onLeave++;
        return;
      }

      if (!r.checkIn) {
        absent++;
        return;
      }

      present++;

      // Calculate work hours
      if (r.checkOut) {
        const checkInTime = new Date(r.checkIn);
        const checkOutTime = new Date(r.checkOut);
        let workMinutes = (checkOutTime - checkInTime) / (1000 * 60);

        // Subtract break time
        r.breaks?.forEach((brk) => {
          if (brk.breakIn && brk.breakOut) {
            const breakMinutes = (new Date(brk.breakOut) - new Date(brk.breakIn)) / (1000 * 60);
            workMinutes -= breakMinutes;
          }
        });

        totalWorkMinutes += workMinutes;

        // Check if half day (only for actual work, not leave)
        if (workMinutes / 60 < HALF_DAY_HOURS) {
          halfDay++;
        }
      }
    });

    const totalWorkHours = (totalWorkMinutes / 60).toFixed(1);
    const totalOfficeHours = present * REQUIRED_DAILY_HOURS;
    const productivity = totalOfficeHours
      ? ((totalWorkMinutes / 60 / totalOfficeHours) * 100).toFixed(0)
      : 0;

    res.json({
      totalDays,
      present,
      absent,
      halfDay,
      totalOffice: present,
      totalWorkHours: parseFloat(totalWorkHours),
      totalOfficeHours,
      productivity: parseInt(productivity),
      leaves: onLeave,
    });
  } catch (err) {
    console.error("Get Attendance Summary Error:", err.message);
    res.status(500).json({ message: err.message });
  }
};
