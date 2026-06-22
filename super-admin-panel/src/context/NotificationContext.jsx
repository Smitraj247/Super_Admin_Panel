"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import { useSocket } from "./SocketContext";
import toast from "react-hot-toast";
import {
  getNotificationsApi,
  markAsReadApi,
  markAllAsReadApi,
  deleteNotificationApi,
} from "@/services/notificationApi";
import { DEPARTMENTS } from "@/utils/constants";

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, getDepartment } = useAuth();
  const { socket } = useSocket();

  // Fetch initial notifications and unread count
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await getNotificationsApi(50, 0);
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await markAsReadApi(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await markAllAsReadApi();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await deleteNotificationApi(notificationId);
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      // Create a simple beep sound using Web Audio API
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioCtx.currentTime + 0.5,
      );

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNotificationCreated = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      // Show toast notification
      toast(
        <div>
          <strong>{notification.title}</strong>
          <p className="text-sm">{notification.message}</p>
        </div>,
        {
          duration: 5000,
          position: "top-right",
        },
      );
      playNotificationSound();
    };

    const handleUnreadCountUpdated = ({ unreadCount: count }) => {
      setUnreadCount(count);
    };

    const handleChatUpdated = (chat) => {
      const lastMessage = chat.messages?.[chat.messages.length - 1];
      if (lastMessage && lastMessage.sender._id !== user?._id) {
        // Get department path
        const deptName = getDepartment();
        let deptPath = "/dashboard/employee";
        if (deptName && DEPARTMENTS[deptName]) {
          deptPath = DEPARTMENTS[deptName].path;
        }

        // Play notification sound but don't show toast
        playNotificationSound();
      }
    };

    socket.on("notification:created", handleNotificationCreated);
    socket.on("unread:count:updated", handleUnreadCountUpdated);
    socket.on("chatUpdated", handleChatUpdated);
    socket.on("newMessage", handleChatUpdated);

    return () => {
      socket.off("notification:created", handleNotificationCreated);
      socket.off("unread:count:updated", handleUnreadCountUpdated);
      socket.off("chatUpdated", handleChatUpdated);
      socket.off("newMessage", handleChatUpdated);
    };
  }, [socket, playNotificationSound, user, getDepartment]);

  // Fetch initial data when user is logged in
  useEffect(() => {
    if (user) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        refetchNotifications: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return context;
};
