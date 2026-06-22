"use client";

import { useEffect } from "react";
import { useSocket } from "@/context/SocketContext";

export const useRealtime = (eventHandlers = {}) => {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const cleanupFns = [];

    Object.entries(eventHandlers).forEach(([event, handler]) => {
      socket.on(event, handler);
      cleanupFns.push(() => socket.off(event, handler));
    });

    return () => {
      cleanupFns.forEach((cleanup) => cleanup());
    };
  }, [socket, eventHandlers]);
};
