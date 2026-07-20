"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  getOrCreateChatApi,
  sendMessageApi,
  markAsReadApi,
  updateGroupNameApi,
  leaveGroupChatApi,
} from "@/services/chatApi";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
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
  Circle,
} from "lucide-react";
import { toast } from "react-toastify";

export default function ChatWindowRealtime({
  user,
  chat: initialChat,
  onClose,
  onUpdate,
}) {
  const { user: currentUser } = useAuth();
  const { connected, joinChat, leaveChat, emitTypingStart, emitTypingStop, emitMessageRead, socketService, isUserOnline } = useSocket();
  
  const [chat, setChat] = useState(initialChat || null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(!initialChat);
  const [sending, setSending] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [onlineStatus, setOnlineStatus] = useState({});
  
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const chatIdRef = useRef(chat?._id);

  const isGroupChat = chat?.isGroupChat || false;
  const isGroupAdmin = isGroupChat && chat?.groupAdmin?._id === currentUser._id;

  useEffect(() => {
    chatIdRef.current = chat?._id;
  }, [chat?._id]);

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

  // ✓ REAL-TIME: Join chat room when chat opens
  useEffect(() => {
    if (chat?._id && connected) {
      joinChat(chat._id);
      console.log(`✓ Joined chat room: ${chat._id}`);

      return () => {
        leaveChat(chat._id);
        console.log(`✗ Left chat room: ${chat._id}`);
      };
    }
  }, [chat?._id, connected, joinChat, leaveChat]);

  // ✓ REAL-TIME: Listen for new messages
  useEffect(() => {
    if (!connected || !chat?._id) return;

    const handleNewMessage = ({ chatId, message: newMessage, chat: updatedChat }) => {
      if (chatId === chat._id) {
        console.log("✓ Received new message via socket");
        
        // Optimistic update - prevent duplicates
        setChat((prev) => {
          if (!prev) return updatedChat;
          
          // Check if message already exists (prevent duplicate from API response)
          const messageExists = prev.messages?.some(
            m => m._id === newMessage._id || 
                 (m.content === newMessage.content && 
                  m.sender === newMessage.sender &&
                  Math.abs(new Date(m.createdAt) - new Date(newMessage.createdAt)) < 1000)
          );
          
          if (messageExists) {
            return prev;
          }
          
          return {
            ...prev,
            messages: [...(prev.messages || []), newMessage],
            lastMessage: newMessage.content,
            lastMessageAt: newMessage.createdAt,
          };
        });

        // Mark as read if message is from someone else
        if (newMessage.sender?._id !== currentUser._id) {
          markAsReadApi(chat._id).catch(() => {});
          emitMessageRead(chat._id, [newMessage._id]);
        }

        // Notify parent to refresh chat list
        if (onUpdate) onUpdate();
      }
    };

    socketService.onNewMessage(handleNewMessage);

    return () => {
      socketService.off("chat:newMessage", handleNewMessage);
    };
  }, [chat?._id, connected, currentUser._id, onUpdate, emitMessageRead, socketService]);

  // ✓ REAL-TIME: Listen for chat updates (group name, participants, etc.)
  useEffect(() => {
    if (!connected || !chat?._id) return;

    const handleChatUpdated = ({ chatId, ...updates }) => {
      if (chatId === chat._id) {
        console.log("✓ Received chat update via socket");
        setChat((prev) => ({
          ...prev,
          ...updates,
        }));
        if (onUpdate) onUpdate();
      }
    };

    socketService.onChatUpdated(handleChatUpdated);

    return () => {
      socketService.off("chat:updated", handleChatUpdated);
    };
  }, [chat?._id, connected, onUpdate, socketService]);

  // ✓ REAL-TIME: Listen for typing indicators
  useEffect(() => {
    if (!connected || !chat?._id) return;

    const handleTypingStart = ({ chatId, userId, userName }) => {
      if (chatId === chat._id && userId !== currentUser._id) {
        console.log(`✓ ${userName} is typing...`);
        setTypingUsers((prev) => new Set([...prev, userName]));
      }
    };

    const handleTypingStop = ({ chatId, userId }) => {
      if (chatId === chat._id && userId !== currentUser._id) {
        setTypingUsers((prev) => {
          const updated = new Set(prev);
          // Find and remove this user
          const chat = prev;
          prev.forEach((name) => {
            // Remove any user (we can't map userId to name easily here, so clear all on stop)
            updated.delete(name);
          });
          return updated;
        });
      }
    };

    socketService.onTypingStart(handleTypingStart);
    socketService.onTypingStop(handleTypingStop);

    return () => {
      socketService.off("typing:start", handleTypingStart);
      socketService.off("typing:stop", handleTypingStop);
    };
  }, [chat?._id, connected, currentUser._id, socketService]);

  // ✓ REAL-TIME: Listen for read receipts
  useEffect(() => {
    if (!connected || !chat?._id) return;

    const handleMessageRead = ({ chatId, messageIds, userId }) => {
      if (chatId === chat._id && userId !== currentUser._id) {
        console.log(`✓ Messages read by user ${userId}`);
        setChat((prev) => {
          if (!prev) return prev;
          
          return {
            ...prev,
            messages: prev.messages.map((msg) => {
              if (messageIds.includes(msg._id)) {
                return {
                  ...msg,
                  readBy: [...new Set([...(msg.readBy || []), userId])],
                };
              }
              return msg;
            }),
          };
        });
      }
    };

    socketService.onMessageRead(handleMessageRead);

    return () => {
      socketService.off("message:read", handleMessageRead);
    };
  }, [chat?._id, connected, currentUser._id, socketService]);

  // ✓ REAL-TIME: Track online status of chat participants
  useEffect(() => {
    if (!chat?.participants) return;

    const status = {};
    chat.participants.forEach((participant) => {
      status[participant._id] = isUserOnline(participant._id);
    });
    setOnlineStatus(status);
  }, [chat?.participants, isUserOnline]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [chat?.messages?.length]);

  // Mark as read when chat window opens
  useEffect(() => {
    if (chat?._id) {
      markAsReadApi(chat._id).catch(() => {});
      
      // Emit read receipt for all unread messages
      const unreadMessageIds = chat.messages
        ?.filter(m => 
          m.sender?._id !== currentUser._id && 
          !m.readBy?.includes(currentUser._id)
        )
        .map(m => m._id) || [];
      
      if (unreadMessageIds.length > 0) {
        emitMessageRead(chat._id, unreadMessageIds);
      }
    }
  }, [chat?._id]);

  const loadChat = async () => {
    try {
      setLoading(true);
      const res = await getOrCreateChatApi(user._id);
      setChat(res.data.data);
    } catch (error) {
      console.error("Load chat error:", error);
      toast.error("Failed to load chat");
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ✓ REAL-TIME: Handle typing indicator with debounce
  const handleTyping = useCallback(() => {
    if (!chat?._id || !connected) return;

    // Emit typing start
    if (!isTypingRef.current) {
      emitTypingStart(chat._id, currentUser.name);
      isTypingRef.current = true;
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to emit typing stop
    typingTimeoutRef.current = setTimeout(() => {
      emitTypingStop(chat._id);
      isTypingRef.current = false;
    }, 3000);
  }, [chat?._id, connected, currentUser.name, emitTypingStart, emitTypingStop]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !chat) return;

    // Clear typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    emitTypingStop(chat._id);
    isTypingRef.current = false;

    const tempMessage = {
      _id: `temp-${Date.now()}`,
      sender: currentUser,
      content: message,
      createdAt: new Date().toISOString(),
      readBy: [currentUser._id],
      isOptimistic: true,
    };

    try {
      setSending(true);
      
      // ✓ OPTIMISTIC UPDATE: Show message immediately
      setChat((prev) => ({
        ...prev,
        messages: [...(prev.messages || []), tempMessage],
      }));
      setMessage("");
      messageInputRef.current?.focus();

      // Send to server
      const res = await sendMessageApi(chat._id, message);
      
      // Replace optimistic message with real one
      setChat((prev) => ({
        ...prev,
        messages: prev.messages.map((msg) =>
          msg._id === tempMessage._id ? res.data.data.messages[res.data.data.messages.length - 1] : msg
        ),
      }));

      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Send message error:", error);
      toast.error("Failed to send message");
      
      // Remove optimistic message on error
      setChat((prev) => ({
        ...prev,
        messages: prev.messages.filter((msg) => msg._id !== tempMessage._id),
      }));
      setMessage(message); // Restore message in input
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
      toast.success("Group name updated");
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
      toast.success("Left group successfully");
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
    if (isGroupChat) {
      const onlineCount = chat.participants.filter(p => onlineStatus[p._id]).length;
      return `${chat.participants.length} participants${onlineCount > 0 ? ` • ${onlineCount} online` : ''}`;
    }
    const otherUser = user || chat?.participants?.find((p) => p._id !== currentUser._id);
    const isOnline = otherUser ? onlineStatus[otherUser._id] : false;
    return isOnline ? "Online" : otherUser?.email || "";
  };

  const getTypingIndicator = () => {
    if (typingUsers.size === 0) return null;
    const users = Array.from(typingUsers);
    if (users.length === 1) return `${users[0]} is typing...`;
    if (users.length === 2) return `${users[0]} and ${users[1]} are typing...`;
    return `${users.length} people are typing...`;
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
          <div className="relative">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              {isGroupChat ? <Users size={20} /> : <UserIcon size={20} />}
            </div>
            {/* Online indicator for direct chats */}
            {!isGroupChat && onlineStatus[user?._id || chat?.participants?.find(p => p._id !== currentUser._id)?._id] && (
              <Circle className="absolute -bottom-0.5 -right-0.5 w-3 h-3 fill-green-400 text-green-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{getChatTitle()}</h3>
              {!connected && (
                <span className="text-xs bg-yellow-500/20 text-yellow-200 px-2 py-0.5 rounded">
                  Reconnecting...
                </span>
              )}
            </div>
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
                  <div className="relative">
                    <UserIcon size={16} className="text-slate-400" />
                    {onlineStatus[participant._id] && (
                      <Circle className="absolute -bottom-1 -right-1 w-2 h-2 fill-green-500 text-green-500" />
                    )}
                  </div>
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
                      className={`flex ${isCurrentUser ? "justify-end" : "justify-start"} mb-3 ${
                        msg.isOptimistic ? "opacity-70" : ""
                      }`}
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
                        <div className="flex items-center justify-between gap-2 mt-1">
                          <p
                            className={`text-xs ${
                              isCurrentUser ? "text-white/70" : "text-slate-500"
                            }`}
                          >
                            {formatTime(msg.createdAt)}
                          </p>
                          {isCurrentUser && (
                            <span className="text-xs">
                              {msg.readBy?.length > 1 ? "✓✓" : "✓"}
                            </span>
                          )}
                        </div>
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

      {/* Typing Indicator */}
      {typingUsers.size > 0 && (
        <div className="px-4 py-2 text-xs text-slate-500 italic bg-slate-50 border-t border-slate-200">
          {getTypingIndicator()}
        </div>
      )}

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
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message..."
            className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={sending || !connected}
          />
          <button
            type="submit"
            disabled={!message.trim() || sending || !connected}
            className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            title={!connected ? "Connecting..." : "Send message"}
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
