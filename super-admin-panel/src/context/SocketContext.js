"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();
  // Keep a ref so cleanup callbacks always close the right instance
  const socketRef = useRef(null);

  useEffect(() => {
    // Only connect when a user is present
    if (!user?._id) {
      // Disconnect any lingering socket if the user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const newSocket = io(
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
      {
        withCredentials: true,
        // Reconnect automatically with sensible defaults
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      },
    );

    socketRef.current = newSocket;

    const onConnect = () => {
      console.log("[Socket] Connected:", newSocket.id);
      setIsConnected(true);
      // FIX: Join the user's personal room on EVERY (re)connect so that
      // chatUpdated / notification events are always delivered, even after
      // a network drop.
      newSocket.emit("joinUserRoom", user._id);
    };

    const onDisconnect = (reason) => {
      console.log("[Socket] Disconnected:", reason);
      setIsConnected(false);
    };

    const onConnectError = (err) => {
      console.error("[Socket] Connection error:", err.message);
      setIsConnected(false);
    };

    newSocket.on("connect", onConnect);
    newSocket.on("disconnect", onDisconnect);
    newSocket.on("connect_error", onConnectError);

    setSocket(newSocket);

    return () => {
      newSocket.off("connect", onConnect);
      newSocket.off("disconnect", onDisconnect);
      newSocket.off("connect_error", onConnectError);
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
    // Re-run only when the logged-in user's ID changes
  }, [user?._id]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
