import { Readable } from "stream";
import { driveClient } from "../providers/googleDriveProvider.js";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function uploadFileToDrive(
  buffer,
  fileName,
  folderId = process.env.GOOGLE_DRIVE_FOLDER_ID,
) {
  const res = await driveClient.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
      mimeType: XLSX_MIME,
    },
    media: {
      mimeType: XLSX_MIME,
      body: Readable.from(buffer),
    },
    fields: "id, webViewLink, webContentLink",
    supportsAllDrives: true,
  });

  return res.data;
}
