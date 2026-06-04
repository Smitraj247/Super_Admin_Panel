import User from "../models/User.models.js";
import Role from "../models/Roles.models.js";
import Department from "../models/Department.models.js";
import AuditLogs from "../models/AuditLogs.models.js";
import Leave from "../models/Leave.js";
import { createUser, deleteUserById } from "./userService.js";

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

export const listAdmins = async () => {
  const adminRole = await Role.findOne({ name: "ADMIN" });
  if (!adminRole) throw Object.assign(new Error("ADMIN role not found"), { status: 404 });
  return User.find({ role: adminRole._id })
    .populate("role", "name").populate("department", "name").select("-password");
};

export const addAdmin = async (body, creatorId) => {
  const { name, email, password, department, joiningDate, probationEndDate, leaveBalance, sidebarPermissions } = body;
  const user = await createUser(name, email, password || "123456", "ADMIN", department, creatorId, joiningDate, probationEndDate, leaveBalance);
  if (sidebarPermissions) { user.sidebarPermissions = sidebarPermissions; await user.save(); }
  return User.findById(user._id).populate("role", "name").populate("department", "name").select("-password");
};

export const editAdmin = async (id, body) => {
  const { name, email, department, joiningDate, probationEndDate, leaveBalance, sidebarPermissions } = body;
  const update = { name, email, department };
  if (joiningDate !== undefined)        update.joiningDate = joiningDate;
  if (probationEndDate !== undefined)   update.probationEndDate = probationEndDate;
  if (leaveBalance !== undefined)       update.leaveBalance = leaveBalance;
  if (sidebarPermissions !== undefined) update.sidebarPermissions = sidebarPermissions;

  const admin = await User.findByIdAndUpdate(id, update, { new: true })
    .populate("role", "name").populate("department", "name").select("-password");
  if (!admin) throw Object.assign(new Error("Admin not found"), { status: 404 });
  return admin;
};

export const removeAdmin = (id) => deleteUserById(id);

// ─── Department CRUD ──────────────────────────────────────────────────────────

export const listDepartments = () => Department.find();

export const addDepartment = async (name) => {
  if (await Department.findOne({ name }))
    throw Object.assign(new Error("Department already exists"), { status: 400 });
  return Department.create({ name });
};

export const editDepartment = async (id, name) => {
  const dept = await Department.findByIdAndUpdate(id, { name }, { new: true });
  if (!dept) throw Object.assign(new Error("Department not found"), { status: 404 });
  return dept;
};

export const removeDepartment = async (id) => {
  const dept = await Department.findByIdAndDelete(id);
  if (!dept) throw Object.assign(new Error("Department not found"), { status: 404 });
};

// ─── User CRUD ────────────────────────────────────────────────────────────────

export const listUsers = async ({ page = 1, limit = 50 } = {}, requestingUser) => {
  const userRole = await Role.findOne({ name: "USER" });
  if (!userRole) throw Object.assign(new Error("USER role not found"), { status: 400 });

  const filter = { role: userRole._id };
  if (requestingUser.role.name === "ADMIN" && requestingUser.department) {
    filter.department = requestingUser.department._id;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [users, total] = await Promise.all([
    User.find(filter).populate("role", "name").populate("department", "name").select("-password").skip(skip).limit(parseInt(limit)),
    User.countDocuments(filter),
  ]);

  return { users, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) };
};

export const addUser = async (body, creatorId) => {
  const { name, email, password, department, sidebarPermissions, joiningDate, probationEndDate, leaveBalance } = body;

  const role = await Role.findOne({ name: "USER" });
  if (!role) throw Object.assign(new Error("USER role not found"), { status: 400 });
  if (await User.findOne({ email })) throw Object.assign(new Error("User already exists"), { status: 400 });

  const user = await User.create({
    name, email,
    password: password || "123456",
    role: role._id,
    department,
    createdBy: creatorId,
    sidebarPermissions: sidebarPermissions || [],
    joiningDate: joiningDate || new Date(),
    probationEndDate,
    leaveBalance: leaveBalance || { PL: 0, CL: 0, SL: 0, DL: 0 },
  });

  return User.findById(user._id).populate("role", "name").populate("department", "name").select("-password");
};

export const editUser = async (id, body) => {
  const { name, email, department, joiningDate, probationEndDate, leaveBalance, sidebarPermissions } = body;
  const update = { name, email, department };
  if (joiningDate !== undefined)        update.joiningDate = joiningDate;
  if (probationEndDate !== undefined)   update.probationEndDate = probationEndDate;
  if (leaveBalance !== undefined)       update.leaveBalance = leaveBalance;
  if (sidebarPermissions !== undefined) update.sidebarPermissions = sidebarPermissions;

  const user = await User.findByIdAndUpdate(id, update, { new: true })
    .populate("role", "name").populate("department", "name").select("-password");
  if (!user) throw Object.assign(new Error("User not found"), { status: 404 });
  return user;
};

export const removeUser = (id) => deleteUserById(id);

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export const getDashboardStats = async () => {
  const [userRole, adminRole] = await Promise.all([
    Role.findOne({ name: "USER" }),
    Role.findOne({ name: "ADMIN" }),
  ]);

  const [totalUsers, totalAdmins, totalDepartments, totalRoles, recentLogs, deptCounts] = await Promise.all([
    User.countDocuments({ role: userRole?._id }),
    User.countDocuments({ role: adminRole?._id }),
    Department.countDocuments(),
    Role.countDocuments(),
    AuditLogs.find()
      .populate("performedBy", "name email")
      .populate("targetUser", "name email")
      .populate("department", "name")
      .limit(10).sort({ createdAt: -1 }),
    User.aggregate([{ $group: { _id: "$department", users: { $sum: 1 } } }]),
  ]);

  const departments = await Department.find();
  const departmentUsage = departments.map((d) => {
    const match = deptCounts.find((c) => c._id?.toString() === d._id.toString());
    return { name: d.name, users: match ? match.users : 0 };
  });

  const recentActivity = recentLogs.map((log) => ({
    id: log._id,
    text: log.action,
    performedBy: log.performedBy?.name || "Unknown",
    targetUser: log.targetUser?.name || null,
    department: log.department?.name || null,
    time: log.createdAt,
    metadata: log.metadata,
  }));

  return {
    stats: { users: totalUsers, admins: totalAdmins, departments: totalDepartments, roles: totalRoles },
    userGrowth: [
      { month: "Jan", users: 120 }, { month: "Feb", users: 210 },
      { month: "Mar", users: 450 }, { month: "Apr", users: totalUsers },
    ],
    departmentUsage,
    recentActivity,
  };
};

// ─── Users with leaves ────────────────────────────────────────────────────────

export const listUsersWithLeaves = async () => {
  const users = await User.find().populate("role", "name").populate("department", "name").select("-password").sort({ name: 1 });
  return Promise.all(
    users.map(async (u) => ({
      ...u.toObject(),
      pendingLeaveCount: await Leave.countDocuments({ user: u._id, status: "PENDING" }),
    }))
  );
};

export const getUserLeaveHistory = async (userId, { year, month } = {}) => {
  const user = await User.findById(userId)
    .populate("role", "name").populate("department", "name").select("-password");
  if (!user) throw Object.assign(new Error("User not found"), { status: 404 });

  const query = { user: userId };
  if (year && month) {
    query.fromDate = { $gte: new Date(+year, +month - 1, 1), $lte: new Date(+year, +month, 0, 23, 59, 59) };
  } else if (year) {
    query.fromDate = { $gte: new Date(+year, 0, 1), $lte: new Date(+year, 11, 31, 23, 59, 59) };
  }

  const leaves = await Leave.find(query)
    .populate("user", "name email").populate("department", "name").sort({ fromDate: -1 });

  return { user, leaves };
};
