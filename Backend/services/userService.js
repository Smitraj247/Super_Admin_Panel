import User from "../models/User.models.js";
import Role from "../models/Roles.models.js";
import Department from "../models/Department.models.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";
import Notification from "../models/Notification.js";
import Chat from "../models/Chat.js";
import AuditLogs from "../models/AuditLogs.models.js";
import { emitEvent, SocketEvents } from "../utils/socketEmitter.js";

// Helper to calculate pro-rated PL/SL for a cycle based on joining month
const getCurrentCycleStart = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  return month < 6
    ? new Date(year, 0, 1) // January 1
    : new Date(year, 6, 1); // July 1
};

const getProRatedLeave = (joiningMonth, cycleStartMonth) => {
  // joiningMonth and cycleStartMonth are 0-indexed (0 = Jan, 6 = July)
  // Calculate how many months are left in the cycle after (and including) joining month
  let remainingMonths;
  if (cycleStartMonth === 0) {
    // Jan-Jun cycle
    if (joiningMonth < 0 || joiningMonth > 5) return 0;
    remainingMonths = 6 - joiningMonth;
  } else {
    // July-Dec cycle (cycleStartMonth = 6)
    if (joiningMonth < 6 || joiningMonth > 11) return 0;
    remainingMonths = 12 - joiningMonth;
  }
  // 6 days per cycle → 1 day per month
  return remainingMonths;
};

export const createUser = async (
  name,
  email,
  password,
  roleName,
  departmentId,
  createdBy,
  joiningDate,
  probationEndDate,
  leaveBalance,
  totalHour,
  workingHour,
) => {
  const userExists = await User.findOne({ email });

  if (userExists) {
    throw new Error("User already exists");
  }

  const role = await Role.findOne({ name: roleName });

  if (!role) {
    throw new Error("Role not found");
  }

  // Ensure password is provided and valid
  const finalPassword = password || "123456";
  if (!finalPassword || finalPassword.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const finalJoiningDate = joiningDate ? new Date(joiningDate) : new Date();
  const cycleStart = getCurrentCycleStart(finalJoiningDate);
  const proRated = getProRatedLeave(
    finalJoiningDate.getMonth(),
    cycleStart.getMonth(),
  );

  const user = await User.create({
    name,
    email,
    password: finalPassword, // This will be hashed by pre-save hook
    role: role._id,
    department: departmentId,
    createdBy,
    joiningDate: finalJoiningDate,
    probationEndDate: probationEndDate,
    totalHour: totalHour || 0,
    workingHour: workingHour || 0,
    leaveBalance: leaveBalance || {
      PL: proRated,
      CL: 9999,
      SL: proRated,
      DL: 0,
    },
    lastCycleRefill: cycleStart, // Set initial lastCycleRefill to current cycle start
  });

  // Return user with populated fields and password excluded
  const populatedUser = await User.findById(user._id)
    .populate("role", "name")
    .populate("department", "name")
    .select("-password");

  // Emit event
  emitEvent(SocketEvents.USER_CREATED, populatedUser);

  return populatedUser;
};

export const getUsersByDepartment = async (departmentId) => {
  return await User.find({ department: departmentId, isActive: true }).populate(
    "role",
  );
};

export const deleteUserById = async (id) => {
  const user = await User.findById(id);

  if (!user) {
    throw new Error("User not found");
  }

  // Delete all related records
  await Promise.all([
    // Delete attendance records
    Attendance.deleteMany({ userId: id }),
    // Delete leave records
    Leave.deleteMany({ user: id }),
    // Delete notifications
    Notification.deleteMany({ userId: id }),
    // Delete audit logs where user is performer or target
    AuditLogs.deleteMany({
      $or: [{ performedBy: id }, { targetUser: id }],
    }),
    // Update or delete chats: pull user from participants first
    Chat.updateMany({ participants: id }, { $pull: { participants: id } }),
    // Remove user from groupAdmin if applicable
    Chat.updateMany({ groupAdmin: id }, { $unset: { groupAdmin: "" } }),
    // Remove user from readBy arrays in messages
    Chat.updateMany({}, { $pull: { "messages.$[].readBy": id } }),
    // Set messages.sender to null if sender is the deleted user
    Chat.updateMany(
      { "messages.sender": id },
      { $set: { "messages.$[elem].sender": null } },
      { arrayFilters: [{ "elem.sender": id }] },
    ),
    // Update reportTo field for other users that report to this user
    User.updateMany({ reportTo: id }, { $unset: { reportTo: "" } }),
    // Update createdBy field for users created by this user
    User.updateMany({ createdBy: id }, { $unset: { createdBy: "" } }),
    // Update departments created by this user
    Department.updateMany({ createdBy: id }, { $unset: { createdBy: "" } }),
  ]);

  // Find all direct chats that now have only one participant left and mark as inactive
  const directChatsToDeactivate = await Chat.find({
    isGroupChat: false,
    $expr: { $eq: [{ $size: "$participants" }, 1] },
  });

  if (directChatsToDeactivate.length > 0) {
    await Chat.updateMany(
      { _id: { $in: directChatsToDeactivate.map((c) => c._id) } },
      { isActive: false },
    );
  }

  // Soft delete: mark user as inactive
  user.isActive = false;
  await user.save();

  // Emit event
  emitEvent(SocketEvents.USER_DELETED, { userId: id });

  return { message: "User deleted successfully" };
};

export const getUserProfile = async (user) => {
  return user;
};
