import express from "express";
import {
  getProfile,
  updateProfile,
  deleteUser,
  getUser,
  getUpcomingBirthdays,
} from "../controllers/userController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import permissionMiddleware from "../middleware/permissionMiddleware.js";
import { PERMISSIONS } from "../config/permissions.js";

const router = express.Router();

router.get("/profile", authMiddleware, getProfile);
router.put("/profile", authMiddleware, updateProfile);

router.get("/users", authMiddleware, getUser);
router.get("/upcoming-birthdays", authMiddleware, getUpcomingBirthdays);

router.delete(
  "/:id",
  authMiddleware,
  permissionMiddleware(PERMISSIONS.DELETE_USER),
  deleteUser,
);

export default router;
