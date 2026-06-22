import express from "express";
import {
  applyLeave,
  getAllLeaves,
  getUserLeaves,
  updateLeaveStatus,
  getUserLeaveBalance,
  deleteUserLeave,
  updateUserLeave,
  checkLeaveAvailability,
  getCanUserCheckIn,
} from "../controllers/leaveController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { autoRefillLeaves } from "../middleware/leaveRefillMiddleware.js";
import auditMiddleware from "../middleware/auditMiddleware.js";

const router = express.Router();

router.use(authMiddleware);
router.use(autoRefillLeaves); // Auto-refill leaves monthly

router.post("/apply", auditMiddleware("Applied for leave"), applyLeave);

router.get("/user/own", getUserLeaves);

router.get("/user/balance", getUserLeaveBalance);

router.get("/user/availability", checkLeaveAvailability);
router.get("/user/can-check-in", getCanUserCheckIn);

router.put(
  "/user/:id",
  auditMiddleware("Updated leave application"),
  updateUserLeave,
);

router.delete(
  "/user/:id",
  auditMiddleware("Deleted leave application"),
  deleteUserLeave,
);

router.get("/", getAllLeaves);

router.put("/:id", auditMiddleware("Updated leave status"), updateLeaveStatus);

export default router;
