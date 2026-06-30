import User from "../models/User.models.js";
import Role from "../models/Roles.models.js";

export const createUser = async (
  name,
  email,
  password,
  roleName,
  department,
  createdBy,
  joiningDate,
  probationEndDate,
  leaveBalance,
  totalHour,
  workingHour,
) => {
  const role = await Role.findOne({ name: roleName });
  if (!role) {
    throw new Error(`${roleName} role not found`);
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("User already exists");
  }

  const user = await User.create({
    name,
    email,
    password: password || "123456",
    role: role._id,
    department,
    createdBy,
    joiningDate: joiningDate || new Date(),
    probationEndDate,
    leaveBalance,
    totalHour: totalHour || 0,
    workingHour: workingHour || 0,
  });

  return user;
};

export const deleteUserById = async (userId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { isActive: false },
    { new: true }
  );
  if (!user) {
    throw new Error("User not found");
  }
  return { message: "User deleted successfully", user };
};

export const getUserProfile = async (userId) => {
  const user = await User.findById(userId)
    .populate("role", "name")
    .populate("department", "name")
    .select("-password");
  if (!user) {
    throw new Error("User not found");
  }
  return user;
};

export const getUsersByDepartment = async (departmentId) => {
  const users = await User.find({ department: departmentId })
    .populate("role", "name")
    .populate("department", "name")
    .select("-password");
  return users;
};
