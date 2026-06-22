
import mongoose from "mongoose";
import User from "./models/User.models.js";
import Leave from "./models/Leave.js";
import dotenv from "dotenv";

dotenv.config();

// Connect to DB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("✅ Connected to MongoDB successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
}

async function checkUserLeaves() {
  await connectDB();
  // Find user with joining date March 1, 2026
  const users = await User.find();
  
  console.log("\n📊 Found", users.length, "users total:\n");
  
  for (const user of users) {
    console.log("---------------------------------------");
    console.log("User:", user.name, user.email);
    console.log("Joining Date:", user.joiningDate?.toDateString());
    console.log("leaveBalance:", user.leaveBalance);
    console.log("lastCycleRefill:", user.lastCycleRefill?.toDateString());
    console.log("lastLeaveRefill:", user.lastLeaveRefill?.toDateString());
    
    const leaves = await Leave.find({ user: user._id });
    console.log("Leaves taken:", leaves.length);
    leaves.forEach(l => {
      console.log(`  - ${l.leaveType} ${l.fromDate?.toDateString()} - ${l.toDate?.toDateString()} ${l.isHalfDay ? '(half-day)' : ''} ${l.status}`);
    });
  }
  
  process.exit(0);
}

checkUserLeaves();
