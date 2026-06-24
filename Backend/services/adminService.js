import User from "../models/User.models.js";
import Department from "../models/Department.models.js";
import Role from "../models/Roles.models.js";
import { isHRAdmin } from "../utils/roleUtils.js";
import { deleteUserById } from "./userService.js";
// ─── Department helpers

export const listDepartments = () => Department.find();

export const addDepartment = (name) => Department.create({ name });

export const removeDepartment = (id) => Department.findByIdAndDelete(id);

export const editDepartment = async (id, name) => {
  const dept = await Department.findByIdAndUpdate(id, { name }, { new: true });
  if (!dept)
    throw Object.assign(new Error("Department not found"), { status: 404 });
  return dept;
};

// ─── Role helpers
export const listRoles = () => Role.find();

export const addRole = (name, permissions = []) =>
  Role.create({ name, permissions });

export const editRole = async (id, name, permissions) => {
  const role = await Role.findByIdAndUpdate(
    id,
    { name, permissions },
    { new: true },
  );
  if (!role) throw Object.assign(new Error("Role not found"), { status: 404 });
  return role;
};

export const removeRole = (id) => Role.findByIdAndDelete(id);

// ─── User helpers
export const listUsers = async (requestingUser, departmentFilter) => {
  const userRole = await Role.findOne({ name: "USER" });
  if (!userRole)
    throw Object.assign(new Error("USER role not found"), { status: 400 });

  const filter = { role: userRole._id, isActive: true };
  if (departmentFilter && !isHRAdmin(requestingUser)) {
    Object.assign(filter, departmentFilter);
  }

  return User.find(filter)
    .populate("role", "name")
    .populate("department", "name")
    .select("-password");
};

export const addUser = async (body, requestingUser) => {
  const { name, email, password, department, sidebarPermissions } = body;
  if (!name || !email)
    throw Object.assign(new Error("Name and email are required"), {
      status: 400,
    });

  const role = await Role.findOne({ name: "USER" });
  if (!role)
    throw Object.assign(new Error("User role not found"), { status: 400 });

  if (
    requestingUser.role.name === "ADMIN" &&
    requestingUser.department &&
    !isHRAdmin(requestingUser)
  ) {
    if (department && department !== requestingUser.department._id.toString()) {
      throw Object.assign(
        new Error("Admins can only create users in their own department"),
        { status: 403 },
      );
    }
    body.department = requestingUser.department._id;
  }

  if (await User.findOne({ email })) {
    throw Object.assign(new Error("Email already exists"), { status: 400 });
  }

  const pwd = password || "123456";
  if (pwd.length < 6)
    throw Object.assign(new Error("Password must be at least 6 characters"), {
      status: 400,
    });

  const user = await User.create({
    name,
    email,
    password: pwd,
    role: role._id,
    department: body.department,
    createdBy: requestingUser._id,
    sidebarPermissions: sidebarPermissions || [],
  });

  return User.findById(user._id)
    .populate("role", "name")
    .populate("department", "name")
    .select("-password");
};

export const editUser = async (id, body, requestingUser, departmentFilter) => {
  const { name, email, department, sidebarPermissions } = body;
  const user = await User.findById(id);
  if (!user) throw Object.assign(new Error("User not found"), { status: 404 });

  if (
    requestingUser.role.name === "ADMIN" &&
    requestingUser.department &&
    !isHRAdmin(requestingUser)
  ) {
    if (
      user.department.toString() !== requestingUser.department._id.toString()
    ) {
      throw Object.assign(
        new Error("You can only manage users in your own department"),
        { status: 403 },
      );
    }
    if (department && department !== requestingUser.department._id.toString()) {
      throw Object.assign(
        new Error("Cannot change user to a different department"),
        { status: 403 },
      );
    }
  }

  user.name = name || user.name;
  user.email = email || user.email;
  if (sidebarPermissions) user.sidebarPermissions = sidebarPermissions;
  if (!departmentFilter || requestingUser.role.name === "SUPER_ADMIN") {
    user.department = department || user.department;
  }
  await user.save();

  return User.findById(user._id)
    .populate("role", "name")
    .populate("department", "name")
    .select("-password");
};

export const removeUser = async (id, requestingUser) => {
  const user = await User.findById(id);
  if (!user) throw Object.assign(new Error("User not found"), { status: 404 });

  if (
    requestingUser.role.name === "ADMIN" &&
    requestingUser.department &&
    !isHRAdmin(requestingUser)
  ) {
    if (
      user.department.toString() !== requestingUser.department._id.toString()
    ) {
      throw Object.assign(
        new Error("You can only delete users in your own department"),
        { status: 403 },
      );
    }
  }

  await deleteUserById(id);
};

// ─── Admin helpers
export const listAdmins = async (requestingUser) => {
  const adminRole = await Role.findOne({ name: "ADMIN" });
  if (!adminRole)
    throw Object.assign(new Error("ADMIN role not found"), { status: 404 });

  const filter = { role: adminRole._id, isActive: true };
  if (
    requestingUser.role.name === "ADMIN" &&
    requestingUser.department &&
    !isHRAdmin(requestingUser)
  ) {
    filter.department = requestingUser.department._id;
  }

  return User.find(filter)
    .populate("role", "name")
    .populate("department", "name")
    .select("-password");
};

export const addAdmin = async (body, requestingUser) => {
  const { name, email, password, department, sidebarPermissions } = body;

  if (
    requestingUser.role.name === "ADMIN" &&
    requestingUser.department &&
    !isHRAdmin(requestingUser)
  ) {
    if (department !== requestingUser.department._id.toString()) {
      throw Object.assign(
        new Error("You can only create admins in your own department"),
        { status: 403 },
      );
    }
  }

  const { createUser } = await import("./userService.js");
  const user = await createUser(
    name,
    email,
    password || "123456",
    "ADMIN",
    department,
    requestingUser._id,
  );

  if (sidebarPermissions) {
    user.sidebarPermissions = sidebarPermissions;
    await user.save();
  }

  return User.findById(user._id)
    .populate("role", "name")
    .populate("department", "name")
    .select("-password");
};

export const editAdmin = async (id, body, requestingUser) => {
  const { name, email, department, sidebarPermissions } = body;
  const admin = await User.findById(id);
  if (!admin)
    throw Object.assign(new Error("Admin not found"), { status: 404 });

  if (
    requestingUser.role.name === "ADMIN" &&
    requestingUser.department &&
    !isHRAdmin(requestingUser)
  ) {
    if (
      admin.department.toString() !== requestingUser.department._id.toString()
    ) {
      throw Object.assign(
        new Error("You can only update admins in your own department"),
        { status: 403 },
      );
    }
  }

  const updateData = { name, email, department };
  if (sidebarPermissions !== undefined)
    updateData.sidebarPermissions = sidebarPermissions;

  return User.findByIdAndUpdate(id, updateData, { new: true })
    .populate("role", "name")
    .populate("department", "name")
    .select("-password");
};

export const removeAdmin = async (id, requestingUser) => {
  const admin = await User.findById(id);
  if (!admin)
    throw Object.assign(new Error("Admin not found"), { status: 404 });

  if (
    requestingUser.role.name === "ADMIN" &&
    requestingUser.department &&
    !isHRAdmin(requestingUser)
  ) {
    if (
      admin.department.toString() !== requestingUser.department._id.toString()
    ) {
      throw Object.assign(
        new Error("You can only delete admins in your own department"),
        { status: 403 },
      );
    }
  }

  const { deleteUserById } = await import("./userService.js");
  await deleteUserById(id);
};

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export const getDashboardStats = async (requestingUser) => {
  const userRole = await Role.findOne({ name: "USER" });

  const filter = { role: userRole?._id, isActive: true };
  if (
    requestingUser.role.name === "ADMIN" &&
    requestingUser.department &&
    !isHRAdmin(requestingUser)
  ) {
    filter.department = requestingUser.department._id;
  }

  const userCount = await User.countDocuments(filter);
  const roleCount = await Role.countDocuments();

  let departmentCount = 1;
  let departmentName = "All Departments";

  if (requestingUser.role.name === "ADMIN" && requestingUser.department) {
    if (isHRAdmin(requestingUser)) {
      departmentCount = await Department.countDocuments();
      departmentName = "All Departments (HR)";
    } else {
      const dept = await Department.findById(requestingUser.department._id);
      departmentName = dept?.name || "Unknown";
      departmentCount = 1;
    }
  } else if (requestingUser.role.name === "SUPER_ADMIN") {
    departmentCount = await Department.countDocuments();
  }

  return {
    totalUsers: userCount,
    departments: departmentCount,
    activeToday: Math.floor(userCount * 0.3),
    roles: roleCount,
    departmentName,
  };
};
