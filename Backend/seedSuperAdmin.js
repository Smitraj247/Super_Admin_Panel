import dotenv from "dotenv";
import connectDB from "./config/db.js";
import bcrypt from "bcrypt";
import User from "./models/User.models.js";
import Role from "./models/Roles.models.js";
import Department from "./models/Department.models.js"; // Update path if needed

dotenv.config();
await connectDB();

const createHRAdmin = async () => {
  try {
    // Find HR_ADMIN role
    const role = await Role.findOne({ name: "ADMIN" });

    if (!role) {
      console.log(" HR_ADMIN role not found.");
      process.exit(1);
    }

    // Find HR department (change name if yours is different)
    const department = await Department.findOne({ name: "HR" });

    if (!department) {
      console.log(" HR department not found.");
      process.exit(1);
    }

    // Check if HR Admin already exists
    const existing = await User.findOne({
      email: "hradmin@gmail.com",
    });

    if (existing) {
      console.log("HR Admin already exists.");
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash("hradmin", 10);

    // Create HR Admin
    await User.create({
      name: "HR Admin",
      email: "hradmin@gmail.com",
      password: hashedPassword,
      role: role._id,
      department: department._id,
      companyEmail: "hradmin@gmail.com",
      personalEmail: "hradmin@gmail.com",
      designation: "HR Admin",
      phone: "9999999999",
      gender: "Male",
      maritalStatus: "Unmarried",
      joiningDate: new Date(),
      isActive: true,
      leaveBalance: {
        PL: 12,
        CL: 9999,
        SL: 12,
        DL: 0,
      },
    });

    console.log(" HR Admin created successfully.");
  } catch (error) {
    console.error(" Error creating HR Admin:", error);
  } finally {
    process.exit();
  }
};

createHRAdmin();
