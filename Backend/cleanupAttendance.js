import mongoose from "mongoose";
import User from "./models/User.models.js"; // Need to import User to register it
import Leave from "./models/Leave.js";
import Attendance from "./models/Attendance.js";
import dotenv from "dotenv";

dotenv.config();

const getToday = () => {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date(),
  );
};

const toDateStr = (d) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const localDate = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
};

async function cleanUpAttendance() {
  try {
    console.log("🚀 Starting Attendance Cleanup\n");

    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ Connected to MongoDB\n");

    const todayStr = getToday();
    console.log("📅 Today is:", todayStr);

    // 1. Delete future attendance records
    console.log("📌 Step 1: Finding future attendance records...");
    const futureRecords = await Attendance.find({
      date: { $gt: todayStr },
    });
    console.log(`  Found ${futureRecords.length} future records to delete`);

    if (futureRecords.length > 0) {
      await Attendance.deleteMany({ date: { $gt: todayStr } });
      console.log("✅ Deleted future records\n");
    }

    // 2. Find all attendance records marked as HALF_DAY_LEAVE or ON_LEAVE
    console.log("📌 Step 2: Finding leave attendance records...");
    const leaveAttendanceRecords = await Attendance.find({
      status: { $in: ["HALF_DAY_LEAVE", "ON_LEAVE"] },
    });
    console.log(`  Found ${leaveAttendanceRecords.length} leave records\n`);

    // 3. Get all approved leaves
    console.log("📌 Step 3: Fetching approved leaves...");
    const approvedLeaves = await Leave.find({ status: "APPROVED" });
    console.log(`  Found ${approvedLeaves.length} approved leaves\n`);

    // 4. Build map of valid leave dates per user
    const validLeaveDatesPerUser = new Map();
    for (const leave of approvedLeaves) {
      const userId = leave.user?.toString();
      if (!userId) continue;
      if (!validLeaveDatesPerUser.has(userId)) {
        validLeaveDatesPerUser.set(userId, new Set());
      }
      const dateSet = validLeaveDatesPerUser.get(userId);

      const lc = localDate(toDateStr(new Date(leave.fromDate)));
      const le = localDate(toDateStr(new Date(leave.toDate)));

      while (lc <= le) {
        dateSet.add(toDateStr(lc));
        lc.setDate(lc.getDate() + 1);
      }
    }

    // 5. Find invalid leave attendance records to delete
    console.log("📌 Step 4: Checking validity of leave records...");
    let invalidRecords = [];

    for (const record of leaveAttendanceRecords) {
      const userId =
        record.userId?._id?.toString() || record.userId?.toString();
      if (!userId) {
        invalidRecords.push(record);
        continue;
      }

      const validDates = validLeaveDatesPerUser.get(userId);
      if (!validDates || !validDates.has(record.date)) {
        console.log(`  ❌ Invalid record: ${record.date} for user ${userId}`);
        invalidRecords.push(record);
      }
    }

    console.log(`  Found ${invalidRecords.length} invalid leave records\n`);

    if (invalidRecords.length > 0) {
      await Attendance.deleteMany({
        _id: { $in: invalidRecords.map((r) => r._id) },
      });
      console.log("✅ Deleted invalid leave records\n");
    }

    console.log("✨ Cleanup complete!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Cleanup failed:", error);
    process.exit(1);
  }
}

cleanUpAttendance();
