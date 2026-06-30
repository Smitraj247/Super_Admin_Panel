import { uploadFileToDrive } from "../services/driveService.js";

export const uploadReport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileName =
      req.body.fileName || req.file.originalname || "report.xlsx";
    const result = await uploadFileToDrive(req.file.buffer, fileName);

    return res.status(200).json({
      success: true,
      fileId: result.id,
      webViewLink: result.webViewLink,
    });
  } catch (error) {
    console.error("Drive upload error:", error);
    return res.status(500).json({ error: "Failed to upload report to Drive" });
  }
};
