"use client";

import React, {
  createContext,
  useContext,
  useState,
} from "react";

/**
 * SocketContext - Vercel-compatible version using polling instead of Socket.IO
 * 
 * This context maintains backward compatibility with existing code
 * but no longer relies on WebSocket connections.
 * All real-time updates now use HTTP polling (every 2-5 seconds).
 */

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  // Always report as connected since polling doesn't require a persistent connection
  const [isConnected] = useState(true);

  // Socket is null - polling hooks handle all real-time updates
  const value = {
    socket: null,
    isConnected,
  };

  return (
    <SocketContext.Provider value={value}>
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
