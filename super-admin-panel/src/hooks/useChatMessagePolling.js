"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { getChatMessagesApi } from "@/services/chatApi";

/**
 * Hook to poll a specific chat's messages every 2-3 seconds
 * Vercel-compatible replacement for Socket.IO newMessage events
 */
export const useChatMessagePolling = (chatId, enabled = true) => {
  const [messages, setMessages] = useState([]);
  const lastFetchRef = useRef(null);
  const pollIntervalRef = useRef(null);

  const pollMessages = useCallback(async () => {
    if (!chatId) return;

    try {
      const res = await getChatMessagesApi(chatId);
      const chat = res.data?.data;
      
      if (chat && chat.messages) {
        // Create a hash of message IDs and timestamps to detect changes
        const hash = JSON.stringify(
          chat.messages.map(m => ({ id: m._id, ts: m.createdAt }))
        );
        
        // Only update if messages changed
        if (lastFetchRef.current !== hash) {
          lastFetchRef.current = hash;
          setMessages(chat.messages);
          return chat;
        }
      }
      
      return null; // No changes
    } catch (err) {
      console.warn("[Message Polling] Error:", err.message);
      return null;
    }
  }, [chatId]);

  useEffect(() => {
    if (!enabled || !chatId) {
      setMessages([]);
      return;
    }

    // Initial fetch
    pollMessages();

    // Poll every 3 seconds in production, 2 seconds in dev
    const interval = process.env.NODE_ENV === "production" ? 3000 : 2000;
    pollIntervalRef.current = setInterval(pollMessages, interval);

    // Poll when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        pollMessages();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, chatId, pollMessages]);

  return {
    messages,
    pollMessages,
  };
};
