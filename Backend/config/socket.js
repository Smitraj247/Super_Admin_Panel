import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import jwt from "jsonwebtoken";
import User from "../models/User.models.js";

let io = null;

// Store user socket mappings for presence
const userSockets = new Map(); // userId -> Set of socketIds
const socketUsers = new Map(); // socketId -> userId

/**
 * Initialize Socket.IO with Redis adapter for multi-instance support
 * Production-ready configuration with authentication and reconnection
 */
export const initializeSocket = async (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://super-admin-panel-lemon.vercel.app",
      ],
      credentials: true,
      methods: ["GET", "POST"],
    },
    // Connection settings for production
    pingTimeout: 60000, // 60 seconds
    pingInterval: 25000, // 25 seconds
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e6, // 1MB
    // Enable WebSocket transport (fallback to polling if needed)
    transports: ["websocket", "polling"],
    // Allow reconnection
    allowEIO3: true,
  });

  // Initialize Redis adapter for horizontal scaling (optional but recommended for production)
  if (process.env.REDIS_URL && process.env.NODE_ENV === "production") {
    try {
      const pubClient = createClient({ url: process.env.REDIS_URL });
      const subClient = pubClient.duplicate();

      await Promise.all([pubClient.connect(), subClient.connect()]);

      io.adapter(createAdapter(pubClient, subClient));
      console.log("✓ Socket.IO Redis adapter initialized");
    } catch (error) {
      console.warn("Redis adapter failed, using in-memory adapter:", error.message);
    }
  }

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id)
        .populate("role")
        .populate("department")
        .select("-password");

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Invalid token"));
    }
  });

  // Connection handler
  io.on("connection", (socket) => {
    const userId = socket.userId;
    
    console.log(`✓ User connected: ${socket.user.name} (${socket.id})`);

    // Track user presence
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);
    socketUsers.set(socket.id, userId);

    // Join user's personal room for direct messaging
    socket.join(`user:${userId}`);

    // Broadcast user online status to all their chat participants
    broadcastPresence(userId, "online");

    // Handle joining chat rooms
    socket.on("join:chat", (chatId) => {
      socket.join(`chat:${chatId}`);
      console.log(`User ${userId} joined chat:${chatId}`);
    });

    // Handle leaving chat rooms
    socket.on("leave:chat", (chatId) => {
      socket.leave(`chat:${chatId}`);
      console.log(`User ${userId} left chat:${chatId}`);
    });

    // Handle typing indicators
    socket.on("typing:start", ({ chatId, userName }) => {
      socket.to(`chat:${chatId}`).emit("typing:start", {
        chatId,
        userId,
        userName,
      });
    });

    socket.on("typing:stop", ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit("typing:stop", {
        chatId,
        userId,
      });
    });

    // Handle read receipts
    socket.on("message:read", ({ chatId, messageIds }) => {
      socket.to(`chat:${chatId}`).emit("message:read", {
        chatId,
        messageIds,
        userId,
        readAt: new Date(),
      });
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log(`✗ User disconnected: ${socket.user.name} (${reason})`);
      
      // Remove from tracking
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
          // User is fully offline (no active connections)
          broadcastPresence(userId, "offline");
        }
      }
      socketUsers.delete(socket.id);
    });

    // Handle reconnection
    socket.on("reconnect", () => {
      console.log(`↻ User reconnected: ${socket.user.name}`);
      broadcastPresence(userId, "online");
    });

    // Handle errors
    socket.on("error", (error) => {
      console.error(`Socket error for user ${userId}:`, error);
    });
  });

  console.log("✓ Socket.IO server initialized");
  return io;
};

/**
 * Broadcast user presence to all chat participants
 */
const broadcastPresence = (userId, status) => {
  if (!io) return;
  
  // Emit to user's room (all their active chats will receive this)
  io.emit("user:presence", {
    userId,
    status, // 'online' | 'offline'
    timestamp: new Date(),
  });
};

/**
 * Get Socket.IO instance
 */
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};

/**
 * Emit event to specific user(s)
 */
export const emitToUser = (userId, event, data) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
};

/**
 * Emit event to chat room
 */
export const emitToChat = (chatId, event, data) => {
  if (!io) return;
  io.to(`chat:${chatId}`).emit(event, data);
};

/**
 * Emit event to multiple users
 */
export const emitToUsers = (userIds, event, data) => {
  if (!io) return;
  userIds.forEach(userId => {
    io.to(`user:${userId}`).emit(event, data);
  });
};

/**
 * Check if user is online
 */
export const isUserOnline = (userId) => {
  return userSockets.has(userId) && userSockets.get(userId).size > 0;
};

/**
 * Get online users from a list
 */
export const getOnlineUsers = (userIds) => {
  return userIds.filter(userId => isUserOnline(userId));
};

/**
 * Get count of user's active connections
 */
export const getUserConnectionCount = (userId) => {
  return userSockets.get(userId)?.size || 0;
};

export default {
  initializeSocket,
  getIO,
  emitToUser,
  emitToChat,
  emitToUsers,
  isUserOnline,
  getOnlineUsers,
  getUserConnectionCount,
};
