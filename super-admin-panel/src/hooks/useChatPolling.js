"use client";

import { useEffect, useCallback, useRef } from "react";
import { getUserChatsApi } from "@/services/chatApi";

/**
 * Hook to poll chat list every 3-4 seconds
 * Vercel-compatible replacement for Socket.IO chatUpdated events
 */
export const useChatPolling = (enabled = true) => {
  const lastFetchRef = useRef(null);

  const pollChats = useCallback(async () => {
    try {
      const res = await getUserChatsApi();
      const chats = res.data?.data || [];
      
      // Create a hash to detect changes
      const hash = JSON.stringify(chats.map(c => ({
        id: c._id,
        lastMsg: c.lastMessage,
        lastMsgAt: c.lastMessageAt,
        msgCount: c.messages?.length
      })));
      
      // Only return new data if changed
      if (lastFetchRef.current !== hash) {
        lastFetchRef.current = hash;
        return chats;
      }
      
      return null; // No changes
    } catch (err) {
      console.warn("[Chat Polling] Error:", err.message);
      return null;
    }
  }, []);

  return { pollChats };
};
