import Notification from "../models/Notification.js";

// Get all notifications for the logged-in user
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 20, skip = 0 } = req.query;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .lean(), // Use lean() for better performance
      Notification.countDocuments({ userId, read: false }),
    ]);

    res.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Get Notifications Error:", error.message);
    res
      .status(500)
      .json({ message: error.message || "Error fetching notifications" });
  }
};

// Get unread count
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const unreadCount = await Notification.countDocuments({
      userId,
      read: false,
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error("Get Unread Count Error:", error.message);
    res
      .status(500)
      .json({ message: error.message || "Error fetching unread count" });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { read: true },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification marked as read", notification });
  } catch (error) {
    console.error("Mark As Read Error:", error.message);
    res
      .status(500)
      .json({ message: error.message || "Error marking notification as read" });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany({ userId, read: false }, { read: true });

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Mark All As Read Error:", error.message);
    res
      .status(500)
      .json({ message: error.message || "Error marking all as read" });
  }
};

// Delete notification
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      userId,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification deleted" });
  } catch (error) {
    console.error("Delete Notification Error:", error.message);
    res
      .status(500)
      .json({ message: error.message || "Error deleting notification" });
  }
};

// Create notification (for system use)
export const createNotification = async (req, res) => {
  try {
    const { userId, type, title, message, link } = req.body;

    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      link,
    });

    res.status(201).json({ message: "Notification created", notification });
  } catch (error) {
    console.error("Create Notification Error:", error.message);
    res
      .status(500)
      .json({ message: error.message || "Error creating notification" });
  }
};

// Helper function to create notification (can be used in other controllers)
export const createNotificationHelper = async (
  userId,
  type,
  title,
  message,
  link = null,
) => {
  try {
    await Notification.create({
      userId,
      type,
      title,
      message,
      link,
    });
  } catch (error) {
    console.error("Create Notification Helper Error:", error.message);
  }
};

// Broadcast message to department (Admin only)
export const broadcastToDepartment = async (req, res) => {
  try {
    const { title, message, type = "info" } = req.body;
    const adminUser = req.user;

    // Validate input
    if (!title || !message) {
      return res.status(400).json({ message: "Title and message are required" });
    }

    // Check if user is admin
    const userRole = typeof adminUser.role === "object" 
      ? adminUser.role.name 
      : adminUser.role;
    
    if (userRole !== "ADMIN") {
      return res.status(403).json({ message: "Only admins can broadcast messages" });
    }

    // Get admin's department
    const adminDepartment = typeof adminUser.department === "object"
      ? adminUser.department._id
      : adminUser.department;

    if (!adminDepartment) {
      return res.status(400).json({ message: "Admin has no department assigned" });
    }

    // Import User model
    const User = (await import("../models/User.models.js")).default;

    // Find all users in the same department (including other admins)
    const departmentUsers = await User.find({
      department: adminDepartment,
      isActive: true,
    }).select("_id");

    if (departmentUsers.length === 0) {
      return res.status(404).json({ message: "No users found in department" });
    }

    // Create notifications for all users in the department
    const notifications = departmentUsers.map((user) => ({
      userId: user._id,
      type,
      title: `[${adminUser.name}] ${title}`,
      message,
      link: null,
    }));

    await Notification.insertMany(notifications);

    res.status(201).json({
      message: "Message broadcasted successfully",
      recipientCount: departmentUsers.length,
    });
  } catch (error) {
    console.error("Broadcast To Department Error:", error.message);
    res.status(500).json({
      message: error.message || "Error broadcasting message",
    });
  }
};

// Broadcast message to all users (Super Admin only)
export const broadcastToAll = async (req, res) => {
  try {
    const { title, message, type = "info", targetDepartment = null } = req.body;
    const superAdminUser = req.user;

    // Validate input
    if (!title || !message) {
      return res.status(400).json({ message: "Title and message are required" });
    }

    // Check if user is super admin
    const userRole = typeof superAdminUser.role === "object" 
      ? superAdminUser.role.name 
      : superAdminUser.role;
    
    if (userRole !== "SUPER_ADMIN") {
      return res.status(403).json({ message: "Only super admins can broadcast to all users" });
    }

    // Import User model
    const User = (await import("../models/User.models.js")).default;

    // Build query based on target
    const query = { isActive: true }; 
    
    
    // If targetDepartment is specified, filter by department
    if (targetDepartment) {
      query.department = targetDepartment;
    }

    // Find all users (or users in specific department)
    const users = await User.find(query).select("_id");

    if (users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    // Create notifications for all users
    const notifications = users.map((user) => ({
      userId: user._id,
      type,
      title: `[Super Admin] ${title}`,
      message,
      link: null,
    }));

    await Notification.insertMany(notifications);

    res.status(201).json({
      message: targetDepartment 
        ? "Message broadcasted to department successfully" 
        : "Message broadcasted to all users successfully",
      recipientCount: users.length,
    });
  } catch (error) {
    console.error("Broadcast To All Error:", error.message);
    res.status(500).json({
      message: error.message || "Error broadcasting message",
    });
  }
};
