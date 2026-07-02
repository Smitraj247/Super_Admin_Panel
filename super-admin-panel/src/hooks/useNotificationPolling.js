"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { getNotificationsApi, getUnreadCountApi } from "@/services/notificationApi";

/**
 * Hook to poll notifications every 3-5 seconds on Vercel serverless
 * Falls back to polling when Socket.io is unavailable
 */
export const useNotificationPolling = (enabled = true) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const lastFetchRef = useRef({});

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getNotificationsApi(50, 0);
      const data = res.data;

      if (data && data.notifications) {
        const hash = JSON.stringify(data.notifications);
        if (lastFetchRef.current.notifHash !== hash) {
          lastFetchRef.current.notifHash = hash;
          setNotifications(data.notifications);
        }
      }

      if (data && data.unreadCount !== undefined) {
        if (lastFetchRef.current.unreadCount !== data.unreadCount) {
          lastFetchRef.current.unreadCount = data.unreadCount;
          setUnreadCount(data.unreadCount);
        }
      }
    } catch (err) {
      console.warn("[Notification Polling] Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll for unread count more frequently
  useEffect(() => {
    if (!enabled) return;

    const pollUnreadCount = async () => {
      try {
        const res = await getUnreadCountApi();
        if (res.data.unreadCount !== undefined) {
          if (lastFetchRef.current.unreadCount !== res.data.unreadCount) {
            lastFetchRef.current.unreadCount = res.data.unreadCount;
            setUnreadCount(res.data.unreadCount);
          }
        }
      } catch (err) {
        console.warn("[Unread Count Polling] Error:", err.message);
      }
    };

    // Poll every 3 seconds for unread count
    const interval = setInterval(pollUnreadCount, 3000);

    // Initial fetch
    pollUnreadCount();

    return () => clearInterval(interval);
  }, [enabled]);

  // Poll for full notifications list every 5 seconds
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(fetchNotifications, 5000);

    return () => clearInterval(interval);
  }, [enabled, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    refetch: fetchNotifications,
  };
};
