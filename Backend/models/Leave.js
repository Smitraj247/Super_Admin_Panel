import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    leaveType: String,
    fromDate: Date,
    toDate: Date,
    isHalfDay: {
      type: Boolean,
      default: false,
    },
    halfDayPeriod: {
      type: String,
      enum: ["FIRST_HALF", "SECOND_HALF"],
      default: null,
    },
    reason: String,
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    usesCarriedPL: {
      type: Boolean,
      default: false,
      description: "Indicates if this CL leave uses carried forward PL",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Leave", leaveSchema);
