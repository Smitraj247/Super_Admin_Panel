"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";
import {
  getNotificationsApi,
  getUnreadCountApi,
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
  const lastHashRef = useRef({ notifHash: null, unreadCount: null });
  const prevUnreadCountRef = useRef(0);

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

  // Show toast for new notification
  const showNotificationToast = useCallback((notification) => {
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
  }, []);

  // Polling for notifications - replaces Socket.IO
  useEffect(() => {
    if (!user) return;

    const pollNotifications = async () => {
      try {
        const res = await getNotificationsApi(50, 0);
        const data = res.data;

        if (data && data.notifications) {
          const hash = JSON.stringify(data.notifications);
          
          // Check if notifications changed
          if (lastHashRef.current.notifHash !== hash) {
            const oldHash = lastHashRef.current.notifHash;
            lastHashRef.current.notifHash = hash;
            
            // If this is not the first load, detect new notifications
            if (oldHash !== null && data.notifications.length > notifications.length) {
              const newNotif = data.notifications[0];
              
              // Check if it's actually new (not just a re-fetch)
              const existsInOld = notifications.some(n => n._id === newNotif._id);
              
              if (!existsInOld) {
                // Show toast and play sound for new notification
                showNotificationToast(newNotif);
                playNotificationSound();
              }
            }
            
            setNotifications(data.notifications);
          }
        }

        if (data && data.unreadCount !== undefined) {
          const newUnreadCount = data.unreadCount;
          
          // Check if unread count increased (new notification)
          if (lastHashRef.current.unreadCount !== null && 
              newUnreadCount > lastHashRef.current.unreadCount) {
            // Unread count increased - play sound
            playNotificationSound();
          }
          
          lastHashRef.current.unreadCount = newUnreadCount;
          setUnreadCount(newUnreadCount);
        }
      } catch (err) {
        console.warn("[Notification Polling] Error:", err.message);
      }
    };

    // Initial fetch
    pollNotifications();

    // Poll every 3 seconds for real-time updates
    const interval = setInterval(pollNotifications, 3000);

    // Poll when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        pollNotifications();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, notifications.length, playNotificationSound, showNotificationToast]);

  // Reset state when user logs out
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      lastHashRef.current = { notifHash: null, unreadCount: null };
    }
  }, [user]);

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
