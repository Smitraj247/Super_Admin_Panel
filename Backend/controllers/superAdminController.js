import User from "../models/User.models.js";
import Role from "../models/Roles.models.js";
import Department from "../models/Department.models.js";
import AuditLogs from "../models/AuditLogs.models.js";
import Leave from "../models/Leave.js";
import {
  createUserValidation,
  updateUserValidation,
} from "../validations/userValidation.js";
import {
  createUser as createUserService,
  deleteUserById,
} from "../services/userService.js";

export const getAdmins = async (req, res) => {
  try {
    const adminRole = await Role.findOne({ name: "ADMIN" });

    if (!adminRole) {
      return res.status(404).json({
        message: "ADMIN role not found",
      });
    }

    const admins = await User.find({ role: adminRole._id })
      .populate("role", "name")
      .populate("department", "name")
      .select("-password");

    res.json(admins);
  } catch (error) {
    console.error(" Error fetching admins:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

export const createAdmin = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      department,
      joiningDate,
      probationEndDate,
      leaveBalance,
      sidebarPermissions,
    } = req.body;

    console.log("👤 Creating admin:", { name, email, department });

    const user = await createUserService(
      name,
      email,
      password || "123456",
      "ADMIN",
      department,
      req.user._id,
      joiningDate,
      probationEndDate,
      leaveBalance,
    );

    // Update sidebar permissions if provided
    if (sidebarPermissions) {
      user.sidebarPermissions = sidebarPermissions;
      await user.save();
    }

    const createdAdmin = await User.findById(user._id)
      .populate("role", "name")
      .populate("department", "name")
      .select("-password");

    console.log("✓ Admin created successfully:", createdAdmin._id);

    res.status(201).json(createdAdmin);
  } catch (error) {
    console.error("Error creating admin:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

export const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      department,
      joiningDate,
      probationEndDate,
      leaveBalance,
      sidebarPermissions,
    } = req.body;

    const updateData = { name, email, department };

    if (joiningDate !== undefined) updateData.joiningDate = joiningDate;
    if (probationEndDate !== undefined)
      updateData.probationEndDate = probationEndDate;
    if (leaveBalance !== undefined) updateData.leaveBalance = leaveBalance;
    if (sidebarPermissions !== undefined)
      updateData.sidebarPermissions = sidebarPermissions;

    const admin = await User.findByIdAndUpdate(id, updateData, { new: true })
      .populate("role", "name")
      .populate("department", "name")
      .select("-password");

    if (!admin) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    res.json(admin);
  } catch (error) {
    console.error(" Error updating admin:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

export const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteUserById(id);

    res.json({ message: "Admin deleted successfully" });
  } catch (error) {
    console.error(" Error deleting admin:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find();
    res.json(departments);
  } catch (error) {
    console.error(" Error fetching departments:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

export const createDepartment = async (req, res) => {
  try {
    const { name } = req.body;

    const deptExists = await Department.findOne({ name });
    if (deptExists) {
      return res.status(400).json({
        message: "Department already exists",
      });
    }

    const department = await Department.create({ name });
    res.status(201).json(department);
  } catch (error) {
    console.error(" Error creating department:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const department = await Department.findByIdAndUpdate(
      id,
      { name },
      { new: true },
    );

    if (!department) {
      return res.status(404).json({
        message: "Department not found",
      });
    }

    res.json(department);
  } catch (error) {
    console.error(" Error updating department:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findByIdAndDelete(id);

    if (!department) {
      return res.status(404).json({
        message: "Department not found",
      });
    }

    res.json({ message: "Department deleted successfully" });
  } catch (error) {
    console.error(" Error deleting department:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getUser = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const userRole = await Role.findOne({ name: "USER" });

    if (!userRole) {
      return res.status(400).json({
        message: "USER role not found",
      });
    }

    const filter = { role: userRole._id };
    if (req.user.role.name === "ADMIN" && req.user.department) {
      filter.department = req.user.department._id;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(filter)
        .populate("role", "name")
        .populate("department", "name")
        .select("-password")
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);

    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error(" Error fetching users:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

export const createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      department,
      sidebarPermissions,
      joiningDate,
      probationEndDate,
      leaveBalance,
    } = req.body;

    console.log("👤 Creating user:", {
      name,
      email,
      department,
      sidebarPermissions,
    });

    const role = await Role.findOne({ name: "USER" });

    if (!role) {
      return res.status(400).json({
        message: "USER role not found",
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    // Pass plain password - let the model's pre-save hook hash it
    const user = await User.create({
      name,
      email,
      password: password || "123456",
      role: role._id,
      department,
      createdBy: req.user._id,
      sidebarPermissions: sidebarPermissions || [],
      joiningDate: joiningDate || new Date(),
      probationEndDate: probationEndDate,
      leaveBalance: leaveBalance,N
    });

    const createdUser = await User.findById(user._id)
      .populate("role", "name")
      .populate("department", "name")
      .select("-password");

    console.log("✓ User created successfully:", createdUser._id);

    res.status(201).json(createdUser);
  } catch (error) {
    console.error(" Error creating user:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      department,
      joiningDate,
      probationEndDate,
      leaveBalance,
      sidebarPermissions,
    } = req.body;

    const updateData = { name, email, department };

    if (joiningDate !== undefined) updateData.joiningDate = joiningDate;
    if (probationEndDate !== undefined)
      updateData.probationEndDate = probationEndDate;
    if (leaveBalance !== undefined) updateData.leaveBalance = leaveBalance;
    if (sidebarPermissions !== undefined)
      updateData.sidebarPermissions = sidebarPermissions;

    const user = await User.findByIdAndUpdate(id, updateData, { new: true })
      .populate("role", "name")
      .populate("department", "name")
      .select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json(user);
  } catch (error) {
    console.error(" Error updating user:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteUserById(id);

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(" Error deleting user:", error);
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const [userRole, adminRole] = await Promise.all([
      Role.findOne({ name: "USER" }),
      Role.findOne({ name: "ADMIN" }),
    ]);

    const [
      totalUsers,
      totalAdmins,
      totalDepartments,
      totalRoles,
      recentAuditLogs,
      deptCounts,
    ] = await Promise.all([
      User.countDocuments({ role: userRole?._id }),
      User.countDocuments({ role: adminRole?._id }),
      Department.countDocuments(),
      Role.countDocuments(),
      AuditLogs.find()
        .populate("performedBy", "name email")
        .populate("targetUser", "name email")
        .populate("department", "name")
        .limit(10)
        .sort({ createdAt: -1 }),
      User.aggregate([{ $group: { _id: "$department", users: { $sum: 1 } } }]),
    ]);

    const userGrowth = [
      { month: "Jan", users: 120 }, // Placeholder for actual growth logic
      { month: "Feb", users: 210 },
      { month: "Mar", users: 450 },
      { month: "Apr", users: totalUsers },
    ];

    const departments = await Department.find();
    const departmentUsage = departments.map((dept) => {
      const match = deptCounts.find(
        (c) => c._id?.toString() === dept._id.toString(),
      );
      return {
        name: dept.name,
        users: match ? match.users : 0,
      };
    });

    // Format recent activity
    const recentActivity = recentAuditLogs.map((log) => ({
      id: log._id,
      text: log.action,
      performedBy: log.performedBy?.name || "Unknown",
      targetUser: log.targetUser?.name || null,
      department: log.department?.name || null,
      time: log.createdAt,
      metadata: log.metadata,
    }));

    res.json({
      stats: {
        users: totalUsers,
        admins: totalAdmins,
        departments: totalDepartments,
        roles: totalRoles,
      },
      userGrowth,
      departmentUsage,
      recentActivity,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

export const getAllUsersWithLeaves = async (req, res) => {
  try {
    const users = await User.find()
      .populate("role", "name")
      .populate("department", "name")
      .select("-password")
      .sort({ name: 1 });

    // Get pending leave counts for each user
    const usersWithPendingCounts = await Promise.all(
      users.map(async (user) => {
        const pendingCount = await Leave.countDocuments({
          user: user._id,
          status: "PENDING",
        });

        return {
          ...user.toObject(),
          pendingLeaveCount: pendingCount,
        };
      }),
    );

    res.json({
      success: true,
      data: usersWithPendingCounts,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getUserLeaveHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { year, month } = req.query;

    const user = await User.findById(userId)
      .populate("role", "name")
      .populate("department", "name")
      .select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let query = { user: userId };

    if (year && month) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      query.fromDate = { $gte: startDate, $lte: endDate };
    } else if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);
      query.fromDate = { $gte: startDate, $lte: endDate };
    }

    const leaves = await User.findById(userId)
      .populate("role", "name")
      .populate("department", "name")
      .select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let leaveQuery = { user: userId };

    if (year && month) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      leaveQuery.fromDate = { $gte: startDate, $lte: endDate };
    } else if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);
      leaveQuery.fromDate = { $gte: startDate, $lte: endDate };
    }

    const leaveRecords = await Leave.find(leaveQuery)
      .populate("user", "name email")
      .populate("department", "name")
      .sort({ fromDate: -1 });

    res.json({
      success: true,
      data: {
        user,
        leaves: leaveRecords,
      },
    });
  } catch (error) {
    console.error("Error fetching user leave history:", error);
    res.status(500).json({ message: error.message });
  }
};
