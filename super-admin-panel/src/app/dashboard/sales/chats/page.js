"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/layout/Navbar";
import ChatWindow from "@/components/ui/ChatWindow";
import { getUserChatsApi, deleteChatApi } from "@/services/chatApi";
import { useAuth } from "@/context/AuthContext";
import { MessageCircle, User as UserIcon, Search, Loader2 } from "lucide-react";

export default function UserChatsPage() {
  const { user: currentUser } = useAuth();
  const [chats, setChats] = useState([]);
  const [filteredChats, setFilteredChats] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleDeleteChat = async (chatId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this conversation?",
    );

    if (!confirmed) return;

    try {
      await deleteChatApi(chatId);

      setChats((prev) => prev.filter((chat) => chat._id !== chatId));
      setFilteredChats((prev) => prev.filter((chat) => chat._id !== chatId));

      if (selectedChat?.chatId === chatId) {
        setSelectedChat(null);
      }
    } catch (error) {
      console.error("Delete chat error:", error);
    }
  };
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

  return (
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
                Your conversations with admins
              </p>
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
                className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Chats List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
              </div>
            ) : filteredChats.length > 0 ? (
              <div className="divide-y divide-slate-200">
                {filteredChats.map((chat) => {
                  const otherUser = getOtherUser(chat);
                  const unreadCount = getUnreadCount(chat);

                  return (
                    <div
                      key={chat._id}
                      onClick={() =>
                        setSelectedChat({
                          chatId: chat._id,
                          user: otherUser,
                        })
                      }
                      className="p-4 hover:bg-slate-50 cursor-pointer transition"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <UserIcon className="text-indigo-600" size={24} />
                        </div>

                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <h3 className="font-semibold text-slate-900 truncate">
                              {otherUser?.name}
                            </h3>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500">
                              {formatTime(chat.lastMessageAt)}
                            </span>
 
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteChat(chat._id);
                              }}
                              className="text-red-600 font-semibolds hover:text-red-800 text-xs font-semibold"
                            >
                              DELETE
                            </button>
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
                <p className="text-sm">
                  Wait for an admin to start a conversation with you
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Chat Window */}
      {selectedChat && (
        <ChatWindow
          user={selectedChat.user}
          onClose={() => {
            setSelectedChat(null);
            loadChats();
          }}
        />
      )}
    </div>
  );
}
