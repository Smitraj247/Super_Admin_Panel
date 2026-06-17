"use client";

import { useAuth } from "@/context/AuthContext";
import {
  Bell,
  User,
  Settings,
  LogOut,
  X,
  Search,
  Sun,
  Moon,
  BellRing,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTheme } from "next-themes";
import {
  getNotificationsApi,
  markAsReadApi,
  markAllAsReadApi,
  deleteNotificationApi,
  createNotificationApi,
  broadcastToAllApi,
} from "@/services/notificationApi";
import { cachedFetch, invalidateCache } from "@/lib/cache";
import { useSidebar } from "@/context/SidebarContext";

import {
  ROLE_MAP,
  DEPT_MAP,
  NOTIF_TTL,
  NOTIF_CACHE_KEY,
} from "./navbarConstants";
import {
  getGreeting,
  getGreetingIcon,
  getTimeStr,
  getDateStr,
} from "./navbarUtils";
import NotificationItem from "./NotificationItem";
import toast from "react-hot-toast";

export default function Navbar() {
  const { user, logout, loading } = useAuth();
  const { collapsed } = useSidebar();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const [showProfile, setShowProfile] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [dateStr, setDateStr] = useState("");
  const [greeting, setGreeting] = useState("");
  const [greetingIcon, setGreetingIcon] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [mounted, setMounted] = useState(false);
  const searchTimer = useRef(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  const [broadcastData, setBroadcastData] = useState({
    title: "",
    message: "",
    type: "info",
  });

  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { roleKey, rolePath, deptPath } = useMemo(() => {
    const roleKey = (user?.role?.name || user?.role || "USER")
      .toUpperCase()
      .replace(" ", "_");
    const deptKey = (user?.department?.name || user?.department || "CE")
      .toUpperCase()
      .replace(" ", "_");
    return {
      roleKey,
      rolePath: ROLE_MAP[roleKey] || "user",
      deptPath: DEPT_MAP[deptKey] || "employee",
    };
  }, [user?.role, user?.department]);

  const fetchNotifs = useCallback(async () => {
    if (!user) return;
    setLoadingNotifs(true);
    try {
      const res = await cachedFetch(
        NOTIF_CACHE_KEY,
        () => getNotificationsApi(20, 0),
        NOTIF_TTL,
      );
      setNotifications(res.data?.notifications || []);
      setUnreadCount(res.data?.unreadCount || 0);
    } catch (e) {
      console.error("Fetch notifications:", e);
    } finally {
      setLoadingNotifs(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchNotifs();
    setDateStr(getDateStr());
    setGreeting(getGreeting());
    setGreetingIcon(getGreetingIcon());
    setTimeStr(getTimeStr());
    const tick = setInterval(() => {
      setTimeStr(getTimeStr());
      setGreeting(getGreeting());
      setGreetingIcon(getGreetingIcon());
    }, 1000);
    return () => clearInterval(tick);
  }, [user, fetchNotifs]);

  useEffect(() => {
    if (!user) return;
    const t = setInterval(fetchNotifs, 60_000);
    return () => clearInterval(t);
  }, [user, fetchNotifs]);

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest(".notif-dropdown")) setShowNotifs(false);
      if (!e.target.closest(".profile-dropdown")) setShowProfile(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearchChange = useCallback((e) => {
    const val = e.target.value;
    setSearchQuery(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {}, 300);
  }, []);

  const markAsRead = useCallback(
    async (id) => {
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      invalidateCache(NOTIF_CACHE_KEY);
      try {
        await markAsReadApi(id);
      } catch {
        fetchNotifs();
      }
    },
    [fetchNotifs],
  );

  const markAllRead = useCallback(async () => {
    const snap = { notifications, unreadCount };
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    invalidateCache(NOTIF_CACHE_KEY);
    try {
      await markAllAsReadApi();
    } catch {
      setNotifications(snap.notifications);
      setUnreadCount(snap.unreadCount);
    }
  }, [notifications, unreadCount]);

  const deleteNotif = useCallback(
    async (id) => {
      const target = notifications.find((n) => n._id === id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (target && !target.read)
        setUnreadCount((prev) => Math.max(0, prev - 1));
      invalidateCache(NOTIF_CACHE_KEY);
      try {
        await deleteNotificationApi(id);
      } catch {
        fetchNotifs();
      }
    },
    [notifications, fetchNotifs],
  );

  const sendBroadcastNotification = useCallback(async () => {
    if (!broadcastData.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!broadcastData.message.trim()) {
      toast.error("Message is required");
      return;
    }

    try {
      setSendingBroadcast(true);

      const res = await broadcastToAllApi({
        title: broadcastData.title,
        message: broadcastData.message,
        type: broadcastData.type,
      });

      toast.success(res?.data?.message || "Notification sent successfully");

      setBroadcastData({
        title: "",
        message: "",
        type: "info",
      });

      setShowBroadcastModal(false);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Failed to send notification",
      );
    } finally {
      setSendingBroadcast(false);
    }
  }, [broadcastData]);

  const goToProfile = useCallback(() => {
    const path =
      roleKey === "SUPER_ADMIN"
        ? `/${rolePath}/profile`
        : roleKey === "ADMIN"
          ? `/admin/${deptPath}/profile`
          : `/dashboard/${deptPath}/profile`;
    router.push(path);
    setShowProfile(false);
  }, [roleKey, rolePath, deptPath, router]);

  if (loading || !user) return null;

  const userInitial = user?.name?.charAt(0).toUpperCase() || "U";
  const isDark = mounted && theme !== "light";

  return (
    <header
      className={`
    fixed top-0 z-40
    h-[72px] 
    flex items-center justify-between
    px-4 lg:px-6
    border-b border-white/10
    backdrop-blur-2xl
     dark:bg-[#111827]/95
    transition-all duration-300

    left-0 right-0

    ${collapsed ? "lg:left-20" : "lg:left-[248px]"}
  `}
      style={{
        boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
      }}
    >
      {/* Greeting */}
      {!showMobileSearch && (
        <div className="shrink-0 animate-fade-in relative z-10">
          <h2 className="text-[15px]  font-semibold  leading-tight">
            {greetingIcon} {greeting}
          </h2>

          <p className="text-[11px] text-slate-400 hidden lg:block mt-0.5">
            <span className="font-mono">{timeStr}</span>
            {timeStr && " · "}Welcome back to HRMS
          </p>
        </div>
      )}

      {/* Mobile Search */}
      {showMobileSearch && (
        <div className="flex-1 md:hidden animate-fade-in relative z-10">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              size={14}
            />

            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search anything..."
              className="
            w-full rounded-2xl
            bg-white/5 border border-white/10
            pl-9 pr-9 py-2
            text-sm text-white
            outline-none
            focus:border-violet-500/50
          "
            />

            <button
              onClick={() => setShowMobileSearch(false)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X size={14} className="text-slate-400" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop Search */}
      <div className="hidden md:flex flex-1 max-w-md mx-6 relative z-10">
        <div className="relative w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            size={15}
          />

          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search anything..."
            className="
          w-full rounded-2xl
          bg-white/5 border border-violet-900
          pl-10 pr-4 py-2.5
          text-sm text-black
          placeholder:text-slate-500
          outline-none
          transition-all
          focus:border-violet-800/40
          focus:bg-white/[0.07]
        "
          />
        </div>
      </div>

      {/* RIGHT CONTROLS */}
      <div
        className={`flex items-center gap-2 relative z-10 ${
          showMobileSearch ? "hidden md:flex" : "flex"
        }`}
      >
        {/* MOBILE SEARCH BTN */}
        <button
          onClick={() => setShowMobileSearch(true)}
          className="
        md:hidden
        p-2 rounded-xl
        text-slate-400
        hover:text-white
        hover:bg-white/5
        transition-all
      "
        >
          <Search size={17} />
        </button>

        {/* DATE */}
        <div
          className="
        hidden sm:flex items-center
        px-3 py-2 rounded-2xl
        bg-slate-100 border border-white/10
      "
        >
          <span className="text-[12px] text-slate-400 font-medium">
            {dateStr}
          </span>
        </div>

        {/* THEME */}
        {mounted && (
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="
          p-2 rounded-xl
          text-slate-500
          hover:text-gray-400
          transition-all
        "
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        )}

        {/* NOTIFICATIONS */}
        <div className="relative notif-dropdown">
          <button
            onClick={() => setShowNotifs((v) => !v)}
            className="
          relative
          p-2 rounded-xl
          text-slate-400
          hover:text-gray-600
          hover:bg-white/5
          transition-all
        "
          >
            <Bell size={17} />

            {unreadCount > 0 && (
              <span
                className="
              absolute -top-1 -right-1
              min-w-[18px] h-[18px]
              rounded-full
              bg-rose-500
              text-white text-[10px]
              flex items-center justify-center
              font-bold
            "
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div
              className="
            absolute right-0 mt-3
            w-[360px]
            rounded-3xl overflow-hidden
            border border-white/10
            bg-gray-100
            shadow-2xl
            animate-scale-in
          "
            >
              {/* HEADER */}
              <div
                className="px-5 py-4"
                style={{
                  background:
                    "linear-gradient(135deg,#7c6fff 0%,#4f46e5 60%,#00d4aa 100%)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold text-sm">
                      Notifications
                    </h3>

                    <p className="text-white/70 text-xs mt-0.5">
                      {unreadCount} unread
                    </p>
                  </div>

                  <button
                    onClick={() => setShowNotifs(false)}
                    className="p-2 rounded-xl hover:bg-white/10 text-white/70 hover:text-white"
                  >
                    <X size={15} />
                  </button>
                </div>

                {user?.role?.name === "SUPER_ADMIN" && (
                  <button
                    onClick={() => {
                      setShowNotifs(false);
                      setShowBroadcastModal(true);
                    }}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/15 hover:bg-white/20 text-white text-sm font-medium transition-all"
                  >
                    <BellRing size={16} />
                    Broadcast Notification
                  </button>
                )}
              </div>

              {/* LIST */}
              <div className="max-h-[360px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-14 flex flex-col items-center text-slate-500">
                    <Bell size={32} className="opacity-20" />

                    <p className="text-xs mt-2">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <NotificationItem
                      key={n._id}
                      notif={n}
                      onMarkRead={markAsRead}
                      onDelete={deleteNotif}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* PROFILE */}
        <div className="relative profile-dropdown">
          <button
            onClick={() => setShowProfile((v) => !v)}
            className="
          flex items-center gap-2
          p-1.5 pr-3 rounded-2xl
          hover:bg-white/5
          transition-all
        "
          >
            <div
              className="
            w-9 h-9 rounded-2xl
            flex items-center justify-center
            text-white text-sm font-bold
            shadow-lg
          "
              style={{
                background: "linear-gradient(135deg,#7c6fff,#00d4aa)",
              }}
            >
              {userInitial}
            </div>

            <span className="hidden sm:block text-sm text-slate-400 font-medium max-w-[90px] truncate">
              {user?.name?.split(" ")[0]}
            </span>
          </button>

          {showProfile && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-2xl overflow-hidden animate-scale-in z-50 border border-[var(--border-strong)]"
              style={{
                background: "var(--bg-surface)",
                boxShadow: "var(--shadow-lg)",
              }}
            >
              {/* Profile header */}
              <div
                className="px-4 py-3.5 border-b border-[var(--border)]"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(124,111,255,0.12) 0%, rgba(0,212,170,0.06) 100%)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow"
                    style={{
                      background: "linear-gradient(135deg, #7c6fff, #00d4aa)",
                    }}
                  >
                    {userInitial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
                      {user?.name}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] capitalize truncate">
                      {(user?.role?.name || user?.role || "")
                        .toLowerCase()
                        .replace("_", " ")}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-2 truncate">
                  {user?.email}
                </p>
              </div>

              <div className="py-1">
                {[
                  {
                    icon: <User size={14} />,
                    label: "Profile Settings",
                    action: goToProfile,
                  },
                  {
                    icon: <Settings size={14} />,
                    label: "System Config",
                    action: () => {},
                  },
                ].map(({ icon, label, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all"
                  >
                    <span className="text-[var(--text-muted)]">{icon}</span>
                    {label}
                  </button>
                ))}

                <div className="h-px bg-[var(--border)] mx-3 my-1" />

                <button
                  onClick={() => {
                    logout();
                    router.push("/login");
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/8 transition-all"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BROADCAST MODAL */}
      {showBroadcastModal && (
        <div className="fixed inset-0 mt-[500px] z-[9999]  flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl border border-blue-200 bg-white overflow-hidden shadow-2xl">
            {/* Header */}
            <div
              className="px-6 py-5 flex items-center justify-between"
              style={{
                background:
                  "linear-gradient(135deg,#7c6fff 0%,#4f46e5 60%,#00d4aa 100%)",
              }}
            >
              <h2 className="text-xl font-bold text-white">
                Broadcast Notification
              </h2>

              <button
                onClick={() => setShowBroadcastModal(false)}
                className="text-white hover:bg-white/10 rounded-lg p-2"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <input
                placeholder="Notification Title"
                value={broadcastData.title}
                onChange={(e) =>
                  setBroadcastData((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                className="w-full border border-gray-300 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <textarea
                placeholder="Write your message..."
                value={broadcastData.message}
                onChange={(e) =>
                  setBroadcastData((prev) => ({
                    ...prev,
                    message: e.target.value,
                  }))
                }
                rows={5}
                className="w-full border border-gray-300 p-3 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              <select
                value={broadcastData.type}
                onChange={(e) =>
                  setBroadcastData((prev) => ({
                    ...prev,
                    type: e.target.value,
                  }))
                }
                className="w-full border border-gray-300 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
              </select>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowBroadcastModal(false)}
                  className="flex-1 border border-gray-300 rounded-xl py-3 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  onClick={sendBroadcastNotification}
                  disabled={sendingBroadcast}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 font-medium disabled:opacity-60"
                >
                  {sendingBroadcast ? "Sending..." : "Send Notification"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
