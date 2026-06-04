import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6 },
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      required: true,
      index: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    sidebarPermissions: {
      type: [String],
      default: [],
      description: "Array of sidebar menu item names user has access to",
    },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    joiningDate: { type: Date },
    probationEndDate: { type: Date },
    leaveBalance: {
      PL: { type: Number, default: 1 }, 
      CL: { type: Number },
      SL: { type: Number, default: 1 },
      DL: { type: Number, default: 0 }, 
    },
    lastLeaveRefill: { type: Date, default: Date.now }, // Track last monthly refill
    // Profile Information
    personalEmail: { type: String, trim: true, lowercase: true },
    companyEmail: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "Male",
    },
    birthday: { type: Date },
    maritalStatus: {
      type: String,
      enum: ["Single", "Married", "Unmarried"],
      default: "Unmarried",
    },
    marriageAnniversary: { type: Date },
    designation: { type: String, trim: true },
    batch: { type: String, trim: true },
    reportTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    profileImage: { type: String },
    // Address Information
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true },
      postalCode: { type: String, trim: true },
    },
  },
  { timestamps: true },
);

userSchema.pre("save", async function () {
  // Only hash password if modified
  if (!this.isModified("password")) {
    return;
  }

  // Skip if already hashed
  if (this.password && this.password.startsWith("$2")) {
    return;
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    console.error("Password hashing error:", error.message);
    throw error;
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
