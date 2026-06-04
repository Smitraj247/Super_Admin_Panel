import {
  createUserValidation,
  updateUserValidation,
} from "../validations/userValidation.js";

import {
  createUser,
  deleteUserById,
  getUserProfile,
  getUsersByDepartment,
} from "../services/userService.js";

import User from "../models/User.models.js";
import Role from "../models/Roles.models.js";

export const getUser = async (req, res) => {
  try {
    const userRole = await Role.findOne({ name: "USER" });        

    if (!userRole) {
      return res.status(404).json({
        message: "USER role not found",
      });
    }

    const users = await User.find({ role: userRole._id })
      .populate("role", "name")
      .populate("department", "name")
      .select("-password");

    res.json(users);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const profile = await User.findById(req.user._id)
      .populate("role", "name")
      .populate("department", "name")
      .populate("reportTo", "name email")
      .select("-password");

    if (!profile) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const updateData = { ...req.body };

    // Remove fields that shouldn't be updated via profile
    delete updateData.password;
    delete updateData.role;
    delete updateData.createdBy;
    delete updateData.leaveBalance;

    // Validate required fields
    if (updateData.name && !updateData.name.trim()) {
      return res.status(400).json({ message: "Name cannot be empty" });
    }

    // Check if email is already taken by another user
    if (updateData.email) {
      const existingUser = await User.findOne({ 
        email: updateData.email, 
        _id: { $ne: userId } 
      });
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("role", "name")
      .populate("department", "name")
      .populate("reportTo", "name email")
      .select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ 
      success: false,
      message: error.message || "Error updating profile" 
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const response = await deleteUserById(req.params.id);

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createUserController = async (req, res) => {
  const { error } = createUserValidation(req.body);

  if (error) {
    return res.status(400).json({
      message: error.details[0].message,
    });
  }

  try {
    const { name, email, password, roleName, department } = req.body;

    const user = await createUser(
      name,
      email,
      password,
      roleName,
      department,
      req.user._id,
    );

    res.status(201).json({
      message: "User created successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const updateUser = async (req, res) => {
  const { error } = updateUserValidation(req.body);

  if (error) {
    return res.status(400).json({
      message: error.details[0].message,
    });
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getUpcomingBirthdays = async (req, res) => {
  try {
    // Get all users with birthday field
    const users = await User.find({ 
      birthday: { $exists: true, $ne: null },
      isActive: true 
    })
      .populate("department", "name")
      .select("name birthday department")
      .lean();

    if (!users || users.length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Calculate upcoming birthdays within next 30 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingBirthdays = users
      .map((user) => {
        const birthday = new Date(user.birthday);
        const currentYear = today.getFullYear();
        
        // Set birthday to current year
        const nextBirthday = new Date(
          currentYear,
          birthday.getMonth(),
          birthday.getDate()
        );
        
        // If birthday has passed this year, set to next year
        if (nextBirthday < today) {
          nextBirthday.setFullYear(currentYear + 1);
        }
        
        // Calculate days until birthday
        const diffTime = nextBirthday - today;
        const daysUntil = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          ...user,
          nextBirthday,
          daysUntil,
        };
      })
      .filter((user) => user.daysUntil <= 30) // Only next 30 days
      .sort((a, b) => a.daysUntil - b.daysUntil); // Sort by nearest first

    res.json({
      success: true,
      data: upcomingBirthdays,
    });
  } catch (error) {
    console.error("Error fetching upcoming birthdays:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
