"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext";
import socketService from "@/services/socketService";

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState({});
  const initializingRef = useRef(false);
  const tokenRef = useRef(null);

  /**
   * Initialize socket connection when user logs in
   */
  useEffect(() => {
    // Get token from storage
    const token =
      typeof window !== "undefined"
        ? sessionStorage.getItem("token") || localStorage.getItem("token")
        : null;

    if (user && token && !initializingRef.current) {
      initializingRef.current = true;
      tokenRef.current = token;

      console.log("Initializing socket connection...");
      socketService.connect(token);

      // Listen for connection status
      const socket = socketService.getSocket();
      if (socket) {
        const handleConnect = () => {
          setConnected(true);
          console.log("✓ Socket connected in context");
        };

        const handleDisconnect = () => {
          setConnected(false);
          console.log("✗ Socket disconnected in context");
        };

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);

        // Set initial connection status
        setConnected(socket.connected);

        return () => {
          socket.off("connect", handleConnect);
          socket.off("disconnect", handleDisconnect);
        };
      }
    } else if (!user && initializingRef.current) {
      // User logged out, disconnect socket
      console.log("User logged out, disconnecting socket...");
      socketService.disconnect();
      setConnected(false);
      initializingRef.current = false;
      tokenRef.current = null;
    }
  }, [user]);

  /**
   * Listen for user presence updates
   */
  useEffect(() => {
    if (!connected) return;

    const handlePresence = ({ userId, status }) => {
      setOnlineUsers((prev) => ({
        ...prev,
        [userId]: status === "online",
      }));
    };

    socketService.onUserPresence(handlePresence);

    return () => {
      socketService.off("user:presence", handlePresence);
    };
  }, [connected]);

  /**
   * Check if a user is online
   */
  const isUserOnline = useCallback((userId) => {
    return onlineUsers[userId] === true;
  }, [onlineUsers]);

  /**
   * Join a chat room
   */
  const joinChat = useCallback((chatId) => {
    if (connected) {
      socketService.joinChat(chatId);
    }
  }, [connected]);

  /**
   * Leave a chat room
   */
  const leaveChat = useCallback((chatId) => {
    if (connected) {
      socketService.leaveChat(chatId);
    }
  }, [connected]);

  /**
   * Emit typing start
   */
  const emitTypingStart = useCallback((chatId, userName) => {
    if (connected) {
      socketService.emitTypingStart(chatId, userName);
    }
  }, [connected]);

  /**
   * Emit typing stop
   */
  const emitTypingStop = useCallback((chatId) => {
    if (connected) {
      socketService.emitTypingStop(chatId);
    }
  }, [connected]);

  /**
   * Emit message read
   */
  const emitMessageRead = useCallback((chatId, messageIds) => {
    if (connected) {
      socketService.emitMessageRead(chatId, messageIds);
    }
  }, [connected]);

  const value = {
    socket: socketService.getSocket(),
    socketService,
    connected,
    onlineUsers,
    isUserOnline,
    joinChat,
    leaveChat,
    emitTypingStart,
    emitTypingStop,
    emitMessageRead,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
