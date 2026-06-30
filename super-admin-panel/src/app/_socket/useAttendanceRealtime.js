import { useState, useEffect } from "react";
import { useSocket } from "@/context/SocketContext";
import { SocketEvents } from "./socketEvents";

/**
 * Hook to manage real-time attendance data for a specific user.
 * @param {string} userId - ID      console.log('Socket attendance update received:', data);ram {Array} initialData - Initial attendance records (e.g., fetched via REST).
 * @returns {[Array, Function]} - Current attendance array and setter.
 */
export const useAttendanceRealtime = (userId, initialData = []) => {
  const { socket } = useSocket();
  console.log(
    "useAttendanceRealtime hook init – socket:",
    socket,
    "userId:",
    userId,
  );
  const [attendance, setAttendance] = useState(initialData);

  useEffect(() => {
    if (!socket) return;

    const handler = (data) => {
      console.log("Socket attendance update received:", data);
      // Ensure the event belongs to the current userId (room ensures it, but double‑check)
      // Removed userId check; the socket room already ensures correct user
      setAttendance((prev) => {
        const index = prev.findIndex(
          (rec) => rec._id?.toString() === data._id?.toString(),
        );
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = data;
          return updated;
        }
        // New record – prepend to keep latest first
        return [data, ...prev];
      });
    };

    socket.on(SocketEvents.ATTENDANCE_UPDATED, handler);
    return () => {
      socket.off(SocketEvents.ATTENDANCE_UPDATED, handler);
    };
  }, [socket, userId]);

  return [attendance, setAttendance];
};
