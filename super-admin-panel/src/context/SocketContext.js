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
  const [isConnected, setIsConnected] = useState(true);
  const { user } = useAuth();
  const socketRef = useRef(null);
  const pollingRef = useRef(null);

  useEffect(() => {
    if (!user?._id) {
      if (socketRef.current) {
        socketRef.current.disconnect?.();
        socketRef.current = null;
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setSocket(null);
      setIsConnected(false);
      return;
    }

    let newSocket;

    // Try real Socket.io first (works locally)
    const setupSocket = () => {
      newSocket = io(
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000",
        {
          withCredentials: true,
          reconnection: true,
          reconnectionAttempts: 3,
          reconnectionDelay: 1000,
          timeout: 5000,
          transports: ["websocket"],
        },
      );

      socketRef.current = newSocket;

      const onConnect = () => {
        console.log("[Socket] Connected:", newSocket.id);
        setIsConnected(true);
        newSocket.emit("joinUserRoom", user._id);
      };

      const onDisconnect = (reason) => {
        console.log("[Socket] Disconnected:", reason);
        // Keep isConnected true for UX — polling handles it
        setIsConnected(true);
      };

      const onConnectError = (err) => {
        console.warn("[Socket] Connection error, polling active:", err.message);
        setIsConnected(true);
      };

      newSocket.on("connect", onConnect);
      newSocket.on("disconnect", onDisconnect);
      newSocket.on("connect_error", onConnectError);

      return newSocket;
    };

    // Setup socket (may not connect on Vercel)
    const socket = setupSocket();

    return () => {
      if (newSocket) {
        newSocket.off("connect");
        newSocket.off("disconnect");
        newSocket.off("connect_error");
        newSocket.disconnect?.();
      }
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [user?._id]);

  // Polling happens at component level (ChatWindow, ChatsPage) for granular control
  // This SocketProvider just attempts socket connection and gracefully falls back

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
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
