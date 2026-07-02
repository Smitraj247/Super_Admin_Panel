"use client";

import { useState, useEffect, useRef } from "react";
import {
  getOrCreateChatApi,
  sendMessageApi,
  markAsReadApi,
  updateGroupNameApi,
  leaveGroupChatApi,
  getChatMessagesApi,
} from "@/services/chatApi";
import { useAuth } from "@/context/AuthContext";
import {
  X,
  Send,
  Loader2,
  MessageCircle,
  User as UserIcon,
  Maximize2,
  Minimize2,
  Users,
  Settings,
  Edit2,
  LogOut,
  Check,
} from "lucide-react";
import { toast } from "react-toastify";

export default function ChatWindow({
  user,
  chat: initialChat,
  onClose,
  onUpdate,
}) {
  const { user: currentUser } = useAuth();
  const [chat, setChat] = useState(initialChat || null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(!initialChat);
  const [sending, setSending] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);

  // Keep a ref to the current chatId for polling
  const chatIdRef = useRef(chat?._id);
  useEffect(() => {
    chatIdRef.current = chat?._id;
  }, [chat?._id]);

  const isGroupChat = chat?.isGroupChat || false;
  const isGroupAdmin = isGroupChat && chat?.groupAdmin?._id === currentUser._id;

  // Sync when parent passes a NEW initialChat object
  useEffect(() => {
    if (initialChat) {
      setChat(initialChat);
    }
  }, [initialChat]);

  // Load chat if opened via user object (no existing chat)
  useEffect(() => {
    if (user && !initialChat) {
      loadChat();
    }
  }, [user]);

  // Polling for messages - Vercel-compatible real-time updates
  // Background polling without loading states to prevent flickering
  useEffect(() => {
    if (!chat?._id) return;

    const pollMessages = async () => {
      try {
        // Background fetch - no loading indicators, silent update
        const res = await getChatMessagesApi(chat._id);
        const freshChat = res.data?.data;
        
        if (freshChat && freshChat.messages) {
          // Only update if messages actually changed (prevents flickering)
          setChat((prevChat) => {
            if (!prevChat) return freshChat;
            
            // Compare message counts first (fast check)
            if (freshChat.messages.length !== prevChat.messages.length) {
              return freshChat;
            }
            
            // Compare last message timestamp (detect edits/updates)
            const prevLastMsg = prevChat.messages?.[prevChat.messages.length - 1];
            const freshLastMsg = freshChat.messages?.[freshChat.messages.length - 1];
            
            if (prevLastMsg?.createdAt !== freshLastMsg?.createdAt) {
              return freshChat;
            }
            
            // No changes detected - keep existing state to prevent re-render
            return prevChat;
          });

          // Mark as read if we received new messages (silent API call)
          if (freshChat.messages.length > (chat.messages?.length || 0)) {
            markAsReadApi(chat._id).catch(() => {});
            // Notify parent to refresh chat list (background refresh)
            if (onUpdate) onUpdate();
          }
        }
      } catch (err) {
        // Silently ignore polling errors to prevent disruption
        console.debug("[Chat Message Polling] Background update skipped:", err.message);
      }
    };

    // Initial poll (silent - chat already loaded)
    pollMessages();

    // Poll every 3 seconds in production, 2 seconds in dev (background updates)
    const interval = setInterval(
      pollMessages,
      process.env.NODE_ENV === "production" ? 3000 : 2000
    );

    // Poll when tab becomes visible (silent)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        pollMessages();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [chat?._id, onUpdate]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [chat?.messages?.length]);

  // Mark as read when chat window opens
  useEffect(() => {
    if (chat?._id) {
      markAsReadApi(chat._id).catch(() => {});
    }
  }, [chat?._id]);

  const loadChat = async () => {
    try {
      setLoading(true);
      const res = await getOrCreateChatApi(user._id);
      setChat(res.data.data);
    } catch (error) {
      console.error("Load chat error:", error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !chat) return;

    try {
      setSending(true);
      const res = await sendMessageApi(chat._id, message);
      // Update local state immediately from API response (sender side)
      setChat(res.data.data);
      setMessage("");
      messageInputRef.current?.focus();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Send message error:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleUpdateGroupName = async () => {
    if (!newGroupName.trim()) return;
    try {
      const res = await updateGroupNameApi(chat._id, newGroupName);
      setChat(res.data.data);
      setEditingGroupName(false);
      setNewGroupName("");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Update group name error:", error);
      toast.error("Failed to update group name");
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) return;
    try {
      await leaveGroupChatApi(chat._id);
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error("Leave group error:", error);
      toast.error(error.response?.data?.message || "Failed to leave group");
    }
  };

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatDate = (date) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (messageDate.toDateString() === today.toDateString()) return "Today";
    if (messageDate.toDateString() === yesterday.toDateString())
      return "Yesterday";
    return messageDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const groupMessagesByDate = (messages) => {
    const groups = {};
    messages.forEach((msg) => {
      const date = formatDate(msg.createdAt);
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  };

  const getChatTitle = () => {
    if (isGroupChat) return chat.groupName;
    return (
      user?.name ||
      chat?.participants?.find((p) => p._id !== currentUser._id)?.name ||
      "Chat"
    );
  };

  const getChatSubtitle = () => {
    if (isGroupChat) return `${chat.participants.length} participants`;
    return (
      user?.email ||
      chat?.participants?.find((p) => p._id !== currentUser._id)?.email ||
      ""
    );
  };

  return (
    <div
      className={`fixed bg-white shadow-2xl border border-slate-200 flex flex-col z-50 transition-all duration-300 ${
        isFullscreen
          ? "inset-0 rounded-none"
          : "bottom-4 right-4 w-96 h-[600px] rounded-2xl"
      }`}
    >
      {/* Header */}
      <div
        className={`bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex items-center justify-between ${
          isFullscreen ? "rounded-none" : "rounded-t-2xl"
        }`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
            {isGroupChat ? <Users size={20} /> : <UserIcon size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{getChatTitle()}</h3>
            <p className="text-xs text-white/80 truncate">
              {getChatSubtitle()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isGroupChat && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1 hover:bg-white/20 rounded-lg transition"
              title="Group Settings"
            >
              <Settings size={20} />
            </button>
          )}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 hover:bg-white/20 rounded-lg transition"
            title={isFullscreen ? "Minimize" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Group Settings Panel */}
      {showSettings && isGroupChat && (
        <div className="bg-slate-100 border-b border-slate-200 p-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">
              Group Name
            </label>
            {editingGroupName ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Enter group name"
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleUpdateGroupName}
                  className="bg-indigo-600 text-white p-1 rounded-lg hover:bg-indigo-700"
                >
                  <Check size={18} />
                </button>
                <button
                  onClick={() => {
                    setEditingGroupName(false);
                    setNewGroupName("");
                  }}
                  className="bg-slate-300 text-slate-700 p-1 rounded-lg hover:bg-slate-400"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-white border border-slate-300 rounded-lg px-3 py-2">
                <span className="text-sm">{chat.groupName}</span>
                {isGroupAdmin && (
                  <button
                    onClick={() => {
                      setEditingGroupName(true);
                      setNewGroupName(chat.groupName);
                    }}
                    className="text-indigo-600 hover:text-indigo-700"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">
              Participants ({chat.participants.length})
            </label>
            <div className="bg-white border border-slate-300 rounded-lg p-2 max-h-32 overflow-y-auto">
              {chat.participants.map((participant) => (
                <div
                  key={participant._id}
                  className="flex items-center gap-2 py-1"
                >
                  <UserIcon size={16} className="text-slate-400" />
                  <span className="text-sm flex-1">{participant.name}</span>
                  {participant._id === chat.groupAdmin?._id && (
                    <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded">
                      Admin
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {!isGroupAdmin && (
            <button
              onClick={handleLeaveGroup}
              className="w-full flex items-center justify-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
            >
              <LogOut size={18} />
              Leave Group
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
          </div>
        ) : chat?.messages?.length > 0 ? (
          Object.entries(groupMessagesByDate(chat.messages)).map(
            ([date, messages]) => (
              <div key={date}>
                <div className="flex items-center justify-center my-4">
                  <div className="bg-slate-200 text-slate-600 text-xs px-3 py-1 rounded-full">
                    {date}
                  </div>
                </div>
                {messages.map((msg) => {
                  const isCurrentUser =
                    msg.sender?._id === currentUser._id ||
                    msg.sender === currentUser._id;
                  const senderName = msg.sender?.name || "Deleted User";

                  return (
                    <div
                      key={msg._id}
                      className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} mb-3`}
                    >
                      <div
                        className={`max-w-[75%] ${
                          isCurrentUser
                            ? "bg-indigo-600 text-white"
                            : "bg-white text-slate-900 border border-slate-200"
                        } rounded-2xl px-4 py-2 shadow-sm`}
                      >
                        {!isCurrentUser && isGroupChat && (
                          <p className="text-xs font-semibold text-indigo-600 mb-1">
                            {senderName}
                          </p>
                        )}
                        <p className="text-sm break-words">{msg.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isCurrentUser ? "text-white/70" : "text-slate-500"
                          }`}
                        >
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ),
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <MessageCircle size={48} className="mb-2" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Start the conversation!</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSendMessage}
        className={`p-4 border-t border-slate-200 bg-white ${
          isFullscreen ? "rounded-none" : "rounded-b-2xl"
        }`}
      >
        <div className="flex gap-2">
          <input
            ref={messageInputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!message.trim() || sending}
            className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {sending ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
