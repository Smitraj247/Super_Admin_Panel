"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/layout/Navbar";
import ChatWindow from "@/components/ui/ChatWindow";
import { getUserChatsApi } from "@/services/chatApi";
import { getAdminsApi, getUsersApi } from "@/services/adminApi";
import { useAuth } from "@/context/AuthContext";
import {
  MessageCircle,
  User as UserIcon,
  Search,
  Loader2,
  Plus,
  X,
} from "lucide-react";

export default function ChatsPage() {
  const { user: currentUser } = useAuth();
  const [chats, setChats] = useState([]);
  const [filteredChats, setFilteredChats] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // New chat modal
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

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

      const users = usersRes.data || [];
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
    setShowNewChatModal(true);
    loadAllUsers();
  };

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setShowNewChatModal(false);
  };

  const getOtherUser = (chat) => {
    return chat.participants.find((p) => p._id !== currentUser._id);
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
    <div className="min-h-screen">
      <Sidebar />
      <Navbar />

      <main className="md:pl-64 pt-16">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2 text-green-900">
                <MessageCircle className="text-green-600" size={32} />
                Messages
              </h1>
              <p className="text-green-700 text-sm">
                Chat with admins and users
              </p>
            </div>

            <button
              onClick={handleNewChat}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              <Plus size={20} />
              New Chat
            </button>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400"
                size={18}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full bg-white border border-green-300 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Chats List */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-white/40 shadow-lg">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="animate-spin text-green-600" size={32} />
              </div>
            ) : filteredChats.length > 0 ? (
              <div className="divide-y divide-green-200">
                {filteredChats.map((chat) => {
                  const otherUser = getOtherUser(chat);
                  const unreadCount = getUnreadCount(chat);

                  return (
                    <div
                      key={chat._id}
                      onClick={() => setSelectedUser(otherUser)}
                      className="p-4 hover:bg-green-50 cursor-pointer transition"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <UserIcon className="text-green-600" size={24} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-green-900 truncate">
                              {otherUser?.name}
                            </h3>
                            <span className="text-xs text-green-600">
                              {formatTime(chat.lastMessageAt)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <p className="text-sm text-green-700 truncate">
                              {chat.lastMessage || "No messages yet"}
                            </p>
                            {unreadCount > 0 && (
                              <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full ml-2">
                                {unreadCount}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-green-600">
                              {otherUser?.role?.name || "User"}
                            </span>
                            {otherUser?.department && (
                              <>
                                <span className="text-xs text-green-400">
                                  •
                                </span>
                                <span className="text-xs text-green-600">
                                  {typeof otherUser.department === "object"
                                    ? otherUser.department.name
                                    : otherUser.department}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-green-400">
                <MessageCircle size={48} className="mb-4" />
                <p className="text-lg font-medium">No conversations yet</p>
                <p className="text-sm mb-4">
                  Start chatting with users from the Users or Admins page
                </p>
                <button
                  onClick={handleNewChat}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                Start New Chat
              </h2>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 border-b border-slate-200">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search users and admins..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-green-600" size={32} />
                </div>
              ) : filteredUsers.length > 0 ? (
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => handleSelectUser(user)}
                      className="flex items-center gap-4 p-4 hover:bg-green-50 rounded-lg cursor-pointer transition"
                    >
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <UserIcon className="text-green-600" size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate">
                          {user.name}
                        </h3>
                        <p className="text-sm text-slate-600 truncate">
                          {user.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">
                            {user.role?.name || "User"}
                          </span>
                          {user.department && (
                            <>
                              <span className="text-xs text-slate-400">•</span>
                              <span className="text-xs text-slate-500">
                                {typeof user.department === "object"
                                  ? user.department.name
                                  : user.department}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <p>No users found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat Window */}
      {selectedUser && (
        <ChatWindow
          user={selectedUser}
          onClose={() => {
            setSelectedUser(null);
            loadChats(); // Refresh chats when closing
          }}
        />
      )}
    </div>
  );
}
