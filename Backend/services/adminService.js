import User from "../models/User.models.js";
import Department from "../models/Department.models.js";
import Role from "../models/Roles.models.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";

// ─── Departments
export const listDepartments = async () => {
  return await Department.find().select("_id name");
};

export const addDepartment = async (name) => {
  const dept = new Department({ name });
  await dept.save();
  return dept;
};

export const removeDepartment = async (id) => {
  const dept = await Department.findByIdAndDelete(id);
  if (!dept) throw new Error("Department not found");
  return dept;
};

export const editDepartment = async (id, name) => {
  const dept = await Department.findByIdAndUpdate(id, { name }, { new: true });
  if (!dept) throw new Error("Department not found");
  return dept;
};

// ─── Roles
export const listRoles = async () => {
  return await Role.find().select("_id name permissions");
};

export const addRole = async (name, permissions) => {
  const role = new Role({ name, permissions });
  await role.save();
  return role;
};

export const editRole = async (id, name, permissions) => {
  const role = await Role.findByIdAndUpdate(id, { name, permissions }, { new: true });
  if (!role) throw new Error("Role not found");
  return role;
};

export const removeRole = async (id) => {
  const role = await Role.findByIdAndDelete(id);
  if (!role) throw new Error("Role not found");
  return role;
};

// ─── Users
export const listUsers = async (user, departmentFilter) => {
  const query = { role: { $ne: null } };
  
  // If admin (not super admin), filter by department
  if (user && user.role && departmentFilter) {
    query.department = departmentFilter;
  }

  const users = await User.find(query)
    .select("-password")
    .populate("role", "name")
    .populate("department", "name")
    .lean();

  return { data: users };
};

export const addUser = async (userData, createdBy) => {
  const user = new User({
    ...userData,
    createdBy,
  });
  await user.save();
  await user.populate("role", "name");
  await user.populate("department", "name");
  return user;
};

export const editUser = async (id, userData, createdBy, departmentFilter) => {
  const user = await User.findByIdAndUpdate(id, userData, { new: true })
    .populate("role", "name")
    .populate("department", "name");

  if (!user) throw new Error("User not found");
  return user;
};

export const removeUser = async (id, user) => {
  const removedUser = await User.findByIdAndDelete(id);
  if (!removedUser) throw new Error("User not found");
  return removedUser;
};

// ─── Admins (Users with ADMIN or SUPER_ADMIN role)
export const listAdmins = async (user) => {
  const adminRole = await Role.findOne({ name: "ADMIN" }).select("_id");
  const superAdminRole = await Role.findOne({ name: "SUPER_ADMIN" }).select("_id");

  const roleIds = [];
  if (adminRole) roleIds.push(adminRole._id);
  if (superAdminRole) roleIds.push(superAdminRole._id);

  const admins = await User.find({ role: { $in: roleIds } })
    .select("-password")
    .populate("role", "name")
    .populate("department", "name")
    .lean();

  return { data: admins };
};

export const addAdmin = async (adminData, createdBy) => {
  const adminRole = await Role.findOne({ name: "ADMIN" });
  if (!adminRole) throw new Error("ADMIN role not found");

  const admin = new User({
    ...adminData,
    role: adminRole._id,
    createdBy,
  });
  await admin.save();
  await admin.populate("role", "name");
  await admin.populate("department", "name");
  return admin;
};

export const editAdmin = async (id, adminData, createdBy) => {
  const admin = await User.findByIdAndUpdate(id, adminData, { new: true })
    .populate("role", "name")
    .populate("department", "name");

  if (!admin) throw new Error("Admin not found");
  return admin;
};

export const removeAdmin = async (id, user) => {
  const admin = await User.findByIdAndDelete(id);
  if (!admin) throw new Error("Admin not found");
  return admin;
};

// ─── Dashboard Stats
export const getDashboardStats = async (user) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayStr = today.toISOString().split("T")[0];

  const query = {};
  if (user.role && user.department) {
    query.department = user.department;
  }

  // Get user stats
  const totalUsers = await User.countDocuments(query);
  const activeUsers = await User.countDocuments({ ...query, isActive: true });

  // Get today's attendance
  const todayAttendance = await Attendance.find({ date: todayStr }).countDocuments();
  const presentToday = await Attendance.find({
    date: todayStr,
    status: { $in: ["CHECKED_IN", "CHECKED_OUT"] },
  }).countDocuments();

  const lateToday = await Attendance.find({
    date: todayStr,
    isLate: true,
  }).countDocuments();

  // Get pending leaves
  const pendingLeaves = await Leave.countDocuments({
    status: "PENDING",
    ...(query.department && { department: query.department }),
  });

  return {
    totalUsers,
    activeUsers,
    todayAttendance,
    presentToday,
    lateToday,
    pendingLeaves,
  };
};
