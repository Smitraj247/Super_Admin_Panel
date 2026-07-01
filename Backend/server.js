import "dotenv/config";

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import cors from "cors";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import compression from "compression";
import { setSocketIO } from "./utils/socketEmitter.js";

import authRoutes from "./routes/authRoutes.js";
import superAdminRoutes from "./routes/superAdminRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import holidayRoutes from "./routes/holidays.js";
import leaveRoutes from "./routes/leaveRoutes.js";
import attendanceRoutes from "./routes/attendanceRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import googleAuthRoutes from "./routes/googleAuthRoutes.js";

await connectDB();

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://super-admin-panel-lemon.vercel.app/",
];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"],
  },
});

// Set the io instance in the socket emitter
setSocketIO(io);

// In your Socket.io server setup
io.on("connection", (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // Lets a client join a specific chat room to receive newMessage events
  socket.on("joinChat", (chatId) => {
    socket.join(chatId);
    console.log(`[Socket.io] Socket ${socket.id} joined chat room: ${chatId}`);
  });

  socket.on("leaveChat", (chatId) => {
    socket.leave(chatId);
    console.log(`[Socket.io] Socket ${socket.id} left chat room: ${chatId}`);
  });

  // Joins the user's personal room so chatUpdated / notification events are received
  socket.on("joinUserRoom", (userId) => {
    socket.join(userId);
    console.log(`[Socket.io] Socket ${socket.id} joined user room: ${userId}`);
  });

  socket.on("disconnect", (reason) => {
    console.log(
      `[Socket.io] Client disconnected: ${socket.id} — reason: ${reason}`,
    );
  });
});

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json());
app.use(compression());

app.use("/api/auth", authRoutes);
app.use("/api/superadmin", superAdminRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/reports", reportRoutes);
app.use("/auth", googleAuthRoutes);

app.get("/", (req, res) => {
  res.send("API is running ");
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
