import express from "express";
import {
  checkIn,
  breakIn,
  breakOut,
  checkOut,
  getTodayStatus,
  getAttendanceByDate,
  getAttendanceByDateRange,
  getAllUsersAttendance,
  getAllUsersSummary,
  getUserSummaryById,
  updateAttendanceRecord,
  completeBreakOut,
  getAttendanceSummary,
  getDashboardStats,
  getWeeklyStats,
  getUserAttendanceById,
  addBreaksToRecord,
  adminCreateBreakEntry,
} from "../controllers/attendanceController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import departmentScope from "../middleware/departmentScope.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getAttendanceByDate);
router.post("/check-in", checkIn);
router.post("/break-in", breakIn);
router.post("/break-out", breakOut);
router.post("/check-out", checkOut);
router.get("/status", getTodayStatus);
router.get("/monthly", getAttendanceByDateRange);
router.get("/summary", getAttendanceSummary);
router.get("/dashboard-stats", getDashboardStats);
router.get("/weekly-stats", getWeeklyStats);

// HR Admin / Super Admin routes
router.get("/all",          roleMiddleware(["ADMIN", "SUPER_ADMIN"]), departmentScope, getAllUsersAttendance);
router.get("/all-summary",  roleMiddleware(["ADMIN", "SUPER_ADMIN"]), departmentScope, getAllUsersSummary);

router.put("/:id",               roleMiddleware(["ADMIN", "SUPER_ADMIN"]), departmentScope, updateAttendanceRecord);
router.put("/:id/complete-break", roleMiddleware(["ADMIN", "SUPER_ADMIN"]), departmentScope, completeBreakOut);

// Admin break management
router.post("/:id/breaks",                roleMiddleware(["ADMIN", "SUPER_ADMIN"]), departmentScope, addBreaksToRecord);
router.post("/user/:userId/create-break", roleMiddleware(["ADMIN", "SUPER_ADMIN"]), departmentScope, adminCreateBreakEntry);

router.get("/user/:userId",         roleMiddleware(["ADMIN", "SUPER_ADMIN"]), departmentScope, getUserAttendanceById);
router.get("/user/:userId/summary", roleMiddleware(["ADMIN", "SUPER_ADMIN"]), departmentScope, getUserSummaryById);

export default router;
