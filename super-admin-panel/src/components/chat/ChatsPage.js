"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/layout/Navbar";
import ChatWindow from "@/components/ui/ChatWindow";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import {
  getUserChatsApi,
  deleteChatApi,
  createGroupChatApi,
} from "@/services/chatApi";
import {
  MessageCircle,
  User as UserIcon,
  Search,
  Loader2,
  Plus,
  X,
  Users,
  Trash2,
} from "lucide-react";
import { toast } from "react-toastify";

/**
 * Unified Chats Page — works for SUPER_ADMIN, ADMIN, and USER roles.
 *
 * Props:
 *  fetchUsers  — async fn that returns [{ _id, name, email, role, department }]
 *                pass null/undefined for roles that can't start new chats (USER)
 *  canNewChat  — show "New Chat" button  (default false)
 *  canGroup    — show "New Group" button, only meaningful when canNewChat true (default false)
 *  canDelete   — show delete button on each chat row (default false)
 */
export default function ChatsPage({
  fetchUsers = null,
  canNewChat = false,
  canGroup = false,
  canDelete = false,
}) {
  const { user: currentUser } = useAuth();
  const { socket } = useSocket();
  const searchParams = useSearchParams();

  const [chats, setChats] = useState([]);
  const [filteredChats, setFilteredChats] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // New chat modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("direct"); // "direct" | "group"
  const [allUsers, setAllUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Group creation
  const [groupName, setGroupName] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState([]);

  // ── Data loading

  const loadChats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getUserChatsApi();
      const data = res.data.data || [];
      setChats(data);
      setFilteredChats(data);
    } catch (err) {
      console.error("Load chats error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Handle chatId query param
  useEffect(() => {
    const chatIdParam = searchParams.get("chatId");
    if (!chatIdParam || loading) return;

    const foundChat = chats.find((c) => c._id === chatIdParam);
    if (foundChat) {
      if (foundChat.isGroupChat) {
        setSelectedChat(foundChat);
        setSelectedUser(null);
      } else {
        const otherUser = foundChat.participants.find(
          (p) => p._id !== currentUser._id,
        );
        setSelectedUser(otherUser);
        setSelectedChat(null);
      }
    }
  }, [searchParams, chats, loading, currentUser]);

  // FIX: Join the user's personal room so chatUpdated events are received.
  // SocketContext already does this on connect, but we re-confirm here in case
  // the socket connected before currentUser was available.
  useEffect(() => {
    if (!socket || !currentUser?._id) return;
    socket.emit("joinUserRoom", currentUser._id);
  }, [socket, currentUser?._id]);

  // Real-time chat list updates
  useEffect(() => {
    if (!socket) return;

    const handleChatUpdated = (updatedChat) => {
      // Update the sidebar chat list
      setChats((prev) => {
        const exists = prev.find((c) => c._id === updatedChat._id);
        const next = exists
          ? prev.map((c) => (c._id === updatedChat._id ? updatedChat : c))
          : [updatedChat, ...prev];
        return [...next].sort(
          (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt),
        );
      });

      // KEY FIX: propagate the updated chat into ChatWindow via selectedChat.
      // This works for BOTH group chats and direct chats because ChatWindow's
      // initialChat sync effect now depends on the full object reference.
      setSelectedChat((prev) => {
        if (prev && prev._id === updatedChat._id) return updatedChat;
        return prev;
      });
    };

    const handleUserChange = () => {
      loadChats();
    };

    socket.on("chatUpdated", handleChatUpdated);
    socket.on("user:created", handleUserChange);
    socket.on("user:deleted", handleUserChange);
    socket.on("user:updated", handleUserChange);

    return () => {
      socket.off("chatUpdated", handleChatUpdated);
      socket.off("user:created", handleUserChange);
      socket.off("user:deleted", handleUserChange);
      socket.off("user:updated", handleUserChange);
    };
  }, [socket, loadChats]);

  // Search filter
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredChats(chats);
      return;
    }
    const q = searchQuery.toLowerCase();
    setFilteredChats(
      chats.filter((chat) => {
        if (chat.isGroupChat) return chat.groupName?.toLowerCase().includes(q);
        const other = getOtherUser(chat);
        return (
          other?.name?.toLowerCase().includes(q) ||
          other?.email?.toLowerCase().includes(q)
        );
      }),
    );
  }, [searchQuery, chats]);

  // ── Helpers

  const getOtherUser = (chat) =>
    chat.participants?.find((p) => p._id !== currentUser._id);

  const getUnreadCount = (chat) =>
    (chat.messages || []).filter(
      (m) =>
        !m.readBy?.includes(currentUser._id) &&
        m.sender?._id !== currentUser._id,
    ).length;

  const getChatTitle = (chat) =>
    chat.isGroupChat ? chat.groupName : getOtherUser(chat)?.name || "Unknown";

  const getChatSubtitle = (chat) =>
    chat.isGroupChat
      ? `${chat.participants?.length} participants`
      : getOtherUser(chat)?.email || "";

  const formatTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString())
      return d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // ── Actions

  const openModal = async (mode) => {
    setModalMode(mode);
    setGroupName("");
    setSelectedParticipants([]);
    setUserSearch("");
    setShowModal(true);
    if (fetchUsers) {
      try {
        setLoadingUsers(true);
        const users = await fetchUsers();
        setAllUsers(users.filter((u) => u._id !== currentUser._id));
      } catch (err) {
        console.error("Load users error:", err);
      } finally {
        setLoadingUsers(false);
      }
    }
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSelectedChat(null);
    setShowModal(false);
  };

  const handleSelectChat = (chat) => {
    if (chat.isGroupChat) {
      setSelectedChat(chat);
      setSelectedUser(null);
    } else {
      setSelectedUser(getOtherUser(chat));
      setSelectedChat(null);
    }
  };

  const toggleParticipant = (id) =>
    setSelectedParticipants((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedParticipants.length < 2) return;
    try {
      const res = await createGroupChatApi(groupName, selectedParticipants);
      setShowModal(false);
      loadChats();
      setSelectedChat(res.data.data);
      setSelectedUser(null);
    } catch (err) {
      console.error("Create group error:", err);
      toast.error("Failed to create group");
    }
  };

  const handleDelete = async (e, chatId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this conversation?")) return;
    try {
      await deleteChatApi(chatId);
      setChats((prev) => prev.filter((c) => c._id !== chatId));
      setFilteredChats((prev) => prev.filter((c) => c._id !== chatId));
      if (selectedChat?._id === chatId) {
        setSelectedChat(null);
      }
    } catch (err) {
      console.error("Delete chat error:", err);
    }
  };

  const filteredUsers = allUsers.filter(
    (u) =>
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()),
  );

  // ── Render

  return (
    <div className="min-h-screen">
      <Sidebar />
      <Navbar />

      <main className="md:pl-64 pt-16">
        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="flex text-xl sm:text-2xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent gap-2">
                <MessageCircle className="text-blue-600" size={30} />
                Messages
              </h1>
              <p className="text-[var(--text-muted)] text-sm mt-0.5">
                {canNewChat
                  ? "Chat with admins and users"
                  : "Your conversations"}
              </p>
            </div>

            {canNewChat && (
              <div className="flex gap-2">
                <button
                  onClick={() => openModal("direct")}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition text-sm font-medium"
                >
                  <Plus size={16} />
                  New Chat
                </button>
                {canGroup && (
                  <button
                    onClick={() => openModal("group")}
                    className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl hover:bg-violet-700 transition text-sm font-medium"
                  >
                    <Users size={16} />
                    New Group
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Search */}
          <div className="mb-6 max-w-md">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations…"
                className="w-full bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl pl-9 pr-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Chat list */}
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center p-16">
                <Loader2 className="animate-spin text-indigo-500" size={30} />
              </div>
            ) : filteredChats.length > 0 ? (
              <div className="divide-y divide-[var(--border)]">
                {filteredChats.map((chat) => {
                  const unread = getUnreadCount(chat);
                  const isGroup = chat.isGroupChat;

                  return (
                    <div
                      key={chat._id}
                      onClick={() => handleSelectChat(chat)}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--bg-elevated)] cursor-pointer transition-colors"
                    >
                      {/* Avatar */}
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isGroup ? "bg-violet-100" : "bg-indigo-100"
                        }`}
                      >
                        {isGroup ? (
                          <Users className="text-violet-600" size={20} />
                        ) : (
                          <UserIcon className="text-indigo-600" size={20} />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[var(--text-primary)] truncate text-sm">
                            {getChatTitle(chat)}
                          </span>
                          <span className="text-xs text-[var(--text-muted)] flex-shrink-0 ml-2">
                            {formatTime(chat.lastMessageAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-[var(--text-muted)] truncate">
                            {chat.lastMessage || getChatSubtitle(chat)}
                          </p>
                          {unread > 0 && (
                            <span className="ml-2 flex-shrink-0 min-w-[20px] h-5 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                              {unread > 9 ? "9+" : unread}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Delete */}
                      {canDelete && (
                        <button
                          onClick={(e) => handleDelete(e, chat._id)}
                          className="flex-shrink-0 p-1.5 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Delete conversation"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
                <MessageCircle size={40} className="opacity-25 mb-3" />
                <p className="font-medium text-sm">No conversations yet</p>
                <p className="text-xs mt-1">
                  {canNewChat
                    ? "Start a new chat using the button above"
                    : "Wait for someone to start a conversation with you"}
                </p>
                {canNewChat && (
                  <button
                    onClick={() => openModal("direct")}
                    className="mt-4 flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition text-sm"
                  >
                    <Plus size={16} />
                    Start New Chat
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── New Chat / Group Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-surface)] rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
            {/* Modal header */}
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {modalMode === "direct" ? "New Chat" : "New Group Chat"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-[var(--bg-elevated)] rounded-lg transition"
              >
                <X size={18} className="text-[var(--text-muted)]" />
              </button>
            </div>

            {/* Group name input */}
            {modalMode === "group" && (
              <div className="px-5 py-4 border-b border-[var(--border)]">
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Group Name *
                </label>
                <input
                  autoFocus
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name…"
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            )}

            {/* User search */}
            <div className="px-5 py-3 border-b border-[var(--border)]">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder={
                    modalMode === "direct"
                      ? "Search users…"
                      : "Search participants…"
                  }
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl pl-9 pr-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {modalMode === "group" && selectedParticipants.length > 0 && (
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  {selectedParticipants.length} selected
                </p>
              )}
            </div>

            {/* User list */}
            <div className="flex-1 overflow-y-auto">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-indigo-500" size={28} />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-[var(--text-muted)] text-sm">
                  No users found
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedParticipants.includes(u._id);
                  return (
                    <button
                      key={u._id}
                      onClick={() =>
                        modalMode === "direct"
                          ? handleSelectUser(u)
                          : toggleParticipant(u._id)
                      }
                      className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-[var(--bg-elevated)] ${
                        isSelected ? "bg-indigo-500/10" : ""
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                          isSelected
                            ? "bg-indigo-600"
                            : "bg-gradient-to-br from-indigo-400 to-violet-500"
                        }`}
                      >
                        {u.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {u.name}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          {u.email}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-1.5">
                        {u.role?.name && (
                          <span className="text-[10px] bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-muted)] px-1.5 py-0.5 rounded-md">
                            {u.role.name}
                          </span>
                        )}
                        {modalMode === "group" && isSelected && (
                          <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Group create button */}
            {modalMode === "group" && (
              <div className="p-5 border-t border-[var(--border)]">
                <button
                  onClick={handleCreateGroup}
                  disabled={
                    !groupName.trim() || selectedParticipants.length < 2
                  }
                  className="w-full bg-violet-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {!groupName.trim()
                    ? "Enter a group name to continue"
                    : selectedParticipants.length < 2
                      ? "Select at least 2 participants"
                      : `Create Group (${selectedParticipants.length} members)`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat window */}
      {(selectedUser || selectedChat) && (
        <ChatWindow
          user={selectedUser}
          chat={selectedChat}
          onClose={() => {
            setSelectedUser(null);
            setSelectedChat(null);
            loadChats();
          }}
          // FIX: pass loadChats directly — it is already a stable useCallback
          // so ChatWindow's socket effect won't re-fire on every render.
          onUpdate={loadChats}
        />
      )}
    </div>
  );
}
