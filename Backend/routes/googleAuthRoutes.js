import express from "express";
import { google } from "googleapis";

const router = express.Router();

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_DRIVE_CLIENT_ID,
  process.env.GOOGLE_DRIVE_CLIENT_SECRET,
  process.env.GOOGLE_DRIVE_REDIRECT_URI,
);

router.get("/google", (req, res) => {
  const url = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/drive.file"],
  });
  res.redirect(url);
});

router.get("/google/callback", async (req, res) => {
  try {
    const { code } = req.query;
    const { tokens } = await oAuth2Client.getToken(code);
    console.log("REFRESH TOKEN:", tokens.refresh_token);
    res.send(
      "Authorized. Check your server console for the refresh token, then add it to .env and restart.",
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Auth failed");
  }
});

export default router;
