"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/layout/Navbar";
import ChatWindow from "@/components/ui/ChatWindow";
import { getUserChatsApi, createGroupChatApi } from "@/services/chatApi";
import { getAdminsApi, getUsersApi } from "@/services/superAdminApi";
import { useAuth } from "@/context/AuthContext";
import { ProtectedDashboardRoute } from "@/components/auth/ProtectedDashboardRoute";
import { ROLES } from "@/utils/constants";
import {
  MessageCircle,
  User as UserIcon,
  Search,
  Loader2,
  Plus,
  X,
  Users,
} from "lucide-react";

export default function ChatsPage() {
  const { user: currentUser } = useAuth();
  const [chats, setChats] = useState([]);
  const [filteredChats, setFilteredChats] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // New chat modal
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [modalType, setModalType] = useState("direct"); // "direct" or "group"
  const [allUsers, setAllUsers] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Group chat creation
  const [groupName, setGroupName] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState([]);

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = chats.filter((chat) => {
        const otherUser = chat.participants.find(
          (p) => p._id !== currentUser._id,
        );
        return (
          otherUser?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          otherUser?.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
      setFilteredChats(filtered);
    } else {
      setFilteredChats(chats);
    }
  }, [searchQuery, chats, currentUser]);

  const loadChats = async () => {
    try {
      setLoading(true);
      const res = await getUserChatsApi();
      setChats(res.data.data);
      setFilteredChats(res.data.data);
    } catch (error) {
      console.error("Load chats error:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      setLoadingUsers(true);
      const [usersRes, adminsRes] = await Promise.all([
        getUsersApi(),
        getAdminsApi(),
      ]);

      const users = usersRes.data.users || usersRes.data || [];
      const admins = adminsRes.data || [];

      // Combine and filter out current user
      const combined = [...users, ...admins].filter(
        (u) => u._id !== currentUser._id,
      );

      setAllUsers(combined);
    } catch (error) {
      console.error("Load users error:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleNewChat = () => {
    setModalType("direct");
    setShowNewChatModal(true);
    loadAllUsers();
  };

  const handleNewGroupChat = () => {
    setModalType("group");
    setShowNewChatModal(true);
    setGroupName("");
    setSelectedParticipants([]);
    loadAllUsers();
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSelectedChat(null);
    setShowNewChatModal(false);
  };

  const handleSelectChat = (chat) => {
    if (chat.isGroupChat) {
      setSelectedChat(chat);
      setSelectedUser(null);
    } else {
      const otherUser = getOtherUser(chat);
      setSelectedUser(otherUser);
      setSelectedChat(null);
    }
  };

  const toggleParticipant = (userId) => {
    setSelectedParticipants((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      alert("Please enter a group name");
      return;
    }

    if (selectedParticipants.length < 2) {
      alert("Please select at least 2 participants");
      return;
    }

    try {
      const res = await createGroupChatApi(groupName, selectedParticipants);
      setShowNewChatModal(false);
      setGroupName("");
      setSelectedParticipants([]);
      loadChats();
      setSelectedChat(res.data.data);
      setSelectedUser(null);
    } catch (error) {
      console.error("Create group error:", error);
      alert("Failed to create group");
    }
  };

  const getOtherUser = (chat) => {
    if (chat.isGroupChat) return null;
    return chat.participants.find((p) => p._id !== currentUser._id);
  };

  const getChatTitle = (chat) => {
    if (chat.isGroupChat) {
      return chat.groupName;
    }
    const otherUser = getOtherUser(chat);
    return otherUser?.name || "Unknown";
  };

  const getChatSubtitle = (chat) => {
    if (chat.isGroupChat) {
      return `${chat.participants.length} participants`;
    }
    const otherUser = getOtherUser(chat);
    return otherUser?.email || "";
  };

  const getUnreadCount = (chat) => {
    return chat.messages.filter(
      (msg) =>
        !msg.readBy.includes(currentUser._id) &&
        msg.sender._id !== currentUser._id,
    ).length;
  };

  const formatTime = (date) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return messageDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return messageDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const filteredUsers = allUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchQuery.toLowerCase()),
  );

  return (
    <ProtectedDashboardRoute requiredRole={ROLES.SUPER_ADMIN}>
      <div className="min-h-screen">
        <Sidebar />
        <Navbar />

        <main className="md:pl-64 pt-16">
          <div className="p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <MessageCircle className="text-indigo-600" size={32} />
                  Messages
                </h1>
                <p className="text-gray-500 text-sm">
                  Chat with admins and users
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleNewChat}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                  <Plus size={20} />
                  New Chat
                </button>
                <button
                  onClick={handleNewGroupChat}
                  className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
                >
                  <Users size={20} />
                  New Group
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Chats List */}
            <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] shadow-sm">
              {loading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="animate-spin text-indigo-600" size={32} />
                </div>
              ) : filteredChats.length > 0 ? (
                <div className="divide-y divide-slate-200">
                  {filteredChats.map((chat) => {
                    const unreadCount = getUnreadCount(chat);

                    return (
                      <div
                        key={chat._id}
                        onClick={() => handleSelectChat(chat)}
                        className="p-4 hover:bg-[var(--bg-elevated)] cursor-pointer transition"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-12 h-12 ${chat.isGroupChat ? "bg-purple-100" : "bg-indigo-100"} rounded-full flex items-center justify-center flex-shrink-0`}
                          >
                            {chat.isGroupChat ? (
                              <Users
                                className={
                                  chat.isGroupChat
                                    ? "text-purple-600"
                                    : "text-indigo-600"
                                }
                                size={24}
                              />
                            ) : (
                              <UserIcon className="text-indigo-600" size={24} />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold text-[var(--text-primary)] truncate">
                                {getChatTitle(chat)}
                              </h3>
                              <span className="text-xs text-[var(--text-secondary)]">
                                {formatTime(chat.lastMessageAt)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <p className="text-sm text-[var(--text-secondary)] truncate">
                                {chat.lastMessage || "No messages yet"}
                              </p>
                              {unreadCount > 0 && (
                                <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded-full ml-2">
                                  {unreadCount}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-[var(--text-secondary)]">
                                {getChatSubtitle(chat)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                  <MessageCircle size={48} className="mb-4" />
                  <p className="text-lg font-medium">No conversations yet</p>
                  <p className="text-sm mb-4">
                    Start chatting with users from the Users or Admins page
                  </p>
                  <button
                    onClick={handleNewChat}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                  >
                    <Plus size={18} />
                    Start New Chat
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* New Chat Modal */}
        {showNewChatModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--bg-surface)] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
              <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  {modalType === "direct"
                    ? "Start New Chat"
                    : "Create Group Chat"}
                </h2>
                <button
                  onClick={() => setShowNewChatModal(false)}
                  className="p-2 hover:bg-[var(--bg-elevated)] rounded-lg transition"
                >
                  <X size={20} />
                </button>
              </div>

              {modalType === "group" && (
                <div className="p-6 border-b border-[var(--border)] bg-purple-50">
                  <label className="block text-sm font-bold text-purple-900 mb-2">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Enter group name... (Required)"
                    className="w-full bg-[var(--bg-surface)] border-2 border-purple-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    autoFocus
                  />
                  {!groupName.trim() && selectedParticipants.length >= 2 && (
                    <p className="text-sm text-red-600 mt-2">
                      ⚠️ Please enter a group name to continue
                    </p>
                  )}
                </div>
              )}

              <div className="p-6 border-b border-[var(--border)]">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder={
                      modalType === "direct"
                        ? "Search users and admins..."
                        : "Search participants..."
                    }
                    className="w-full bg-[var(--bg-elevated)] border border-[var(--border-strong)] rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {modalType === "group" && selectedParticipants.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm text-[var(--text-secondary)] mb-2">
                      Selected: {selectedParticipants.length} participants
                    </p>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2
                      className="animate-spin text-indigo-600"
                      size={32}
                    />
                  </div>
                ) : filteredUsers.length > 0 ? (
                  <div className="space-y-2">
                    {filteredUsers.map((user) => {
                      const isSelected = selectedParticipants.includes(
                        user._id,
                      );

                      return (
                        <div
                          key={user._id}
                          onClick={() => {
                            if (modalType === "direct") {
                              handleSelectUser(user);
                            } else {
                              toggleParticipant(user._id);
                            }
                          }}
                          className={`flex items-center gap-4 p-4 rounded-lg cursor-pointer transition ${
                            isSelected
                              ? "bg-indigo-50 border-2 border-indigo-500"
                              : "hover:bg-[var(--bg-elevated)] border-2 border-transparent"
                          }`}
                        >
                          <div
                            className={`w-12 h-12 ${isSelected ? "bg-indigo-200" : "bg-indigo-100"} rounded-full flex items-center justify-center flex-shrink-0`}
                          >
                            <UserIcon className="text-indigo-600" size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-[var(--text-primary)] truncate">
                              {user.name}
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)] truncate">
                              {user.email}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-[var(--text-secondary)]">
                                {user.role?.name || "User"}
                              </span>
                              {user.department && (
                                <>
                                  <span className="text-xs text-slate-400">
                                    •
                                  </span>
                                  <span className="text-xs text-[var(--text-secondary)]">
                                    {typeof user.department === "object"
                                      ? user.department.name
                                      : user.department}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          {modalType === "group" && isSelected && (
                            <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <p>No users found</p>
                  </div>
                )}
              </div>

              {modalType === "group" && (
                <div className="p-6 border-t border-[var(--border)] bg-[var(--bg-elevated)]">
                  <button
                    onClick={handleCreateGroup}
                    disabled={
                      !groupName.trim() || selectedParticipants.length < 2
                    }
                    className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold text-base"
                  >
                    {!groupName.trim()
                      ? "Enter Group Name to Continue"
                      : selectedParticipants.length < 2
                        ? "Select at least 2 participants"
                        : `Create Group (${selectedParticipants.length} participants)`}
                  </button>
                  {!groupName.trim() && selectedParticipants.length >= 2 && (
                    <p className="text-center text-sm text-red-600 mt-2">
                      Please enter a group name above
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chat Window */}
        {(selectedUser || selectedChat) && (
          <ChatWindow
            user={selectedUser}
            chat={selectedChat}
            onClose={() => {
              setSelectedUser(null);
              setSelectedChat(null);
              loadChats(); // Refresh chats when closing
            }}
            onUpdate={loadChats}
          />
        )}
      </div>
    </ProtectedDashboardRoute>
  );
}
