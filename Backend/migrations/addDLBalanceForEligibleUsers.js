import mongoose from "mongoose";
import User from "../models/User.models.js";
import Leave from "../models/Leave.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Migration Script: Add DL Balance for Eligible Users
 * 
 * This script checks all users and adds 1 DL to their balance if they:
 * - Did not take any PL or CL in the previous month (April 2026)
 * - Currently have 0 DL balance
 * 
 * Run this script once to fix existing users.
 */

const addDLBalanceForEligibleUsers = async () => {
  try {
    console.log(" Starting DL balance migration...");
    
    // Connect to MongoDB (use MONGO_URL from .env)
    const mongoUrl = process.env.MONGO_URL || process.env.MONGO_URI;
    
    if (!mongoUrl) {
      throw new Error("MONGO_URL or MONGO_URI not found in environment variables");
    }
    
    await mongoose.connect(mongoUrl);
    console.log(" Connected to MongoDB");

    // Get all users
    const users = await User.find({});
    console.log(` Found ${users.length} users to check`);

    let updatedCount = 0;
    let skippedCount = 0;

    // Define previous month (April 2026)
    const now = new Date(); // May 2026
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1); // April 1, 2026
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0); // April 30, 2026

    console.log(`📅 Checking leaves from ${previousMonthStart.toLocaleDateString()} to ${previousMonthEnd.toLocaleDateString()}`);

    for (const user of users) {
      // Check if user took any PL or CL in previous month
      const previousMonthLeaves = await Leave.countDocuments({
        user: user._id,
        leaveType: { $in: ["PL", "CL"] },
        status: { $in: ["PENDING", "APPROVED"] },
        fromDate: { $gte: previousMonthStart, $lte: previousMonthEnd },
      });

      // If no PL/CL taken in previous month, add 1 DL
      if (previousMonthLeaves === 0) {
        const currentDL = user.leaveBalance.DL || 0;
        user.leaveBalance.DL = currentDL + 1;
        await user.save();
        
        console.log(` ${user.name} (${user.email}): Added 1 DL. New balance: ${user.leaveBalance.DL}`);
        updatedCount++;
      } else {
        console.log(`  ${user.name} (${user.email}): Skipped (${previousMonthLeaves} PL/CL taken in April)`);
        skippedCount++;
      }
    }

    console.log("\n Migration Summary:");
    console.log(`   Total users: ${users.length}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`     Skipped: ${skippedCount}`);
    console.log("\n Migration completed successfully!");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(" Migration failed:", error);
    process.exit(1);
  }
};

// Run the migration
addDLBalanceForEligibleUsers();