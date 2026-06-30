import express from "express";
import multer from "multer";
import { uploadReport } from "../controllers/reportController.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload-to-drive", upload.single("file"), uploadReport);

export default router;
