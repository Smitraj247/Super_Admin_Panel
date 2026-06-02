// migrations/cleanupDepartments.js
// One‑time script to delete obsolete departments (IT, CE) and reassign their users to EMPLOYEE
// Run with: `node migrations/cleanupDepartments.js`

import mongoose from "mongoose";
import dotenv from "dotenv";
import Department from "../models/Department.models.js";
import User from "../models/User.models.js";

dotenv.config();

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/superadmin";

(async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to DB");

    // Find the IT and CE departments (case‑insensitive)
    const obsolete = await Department.find({ name: { $in: [/^IT$/i, /^CE$/i] } });
    if (obsolete.length === 0) {
      console.log("No IT or CE departments found – nothing to do.");
      process.exit(0);
    }

    // Ensure EMPLOYEE department exists (create if missing)
    let employeeDept = await Department.findOne({ name: /^(EMPLOYEE|Employee)$/i });
    if (!employeeDept) {
      employeeDept = await Department.create({ name: "EMPLOYEE", description: "Employee Department" });
      console.log("Created missing EMPLOYEE department");
    }

    const obsoleteIds = obsolete.map((d) => d._id);
    // Reassign users belonging to obsolete departments to EMPLOYEE
    const result = await User.updateMany({ department: { $in: obsoleteIds } }, { department: employeeDept._id });
    console.log(`Reassigned ${result.modifiedCount} users to EMPLOYEE department`);

    // Delete the obsolete departments
    const delResult = await Department.deleteMany({ _id: { $in: obsoleteIds } });
    console.log(`Deleted ${delResult.deletedCount} obsolete departments (IT, CE)`);

    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
})();
