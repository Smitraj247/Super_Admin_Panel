"use client";

import { memo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ICON_MAP } from "./navbarConstants";
import { getTimeAgo } from "./navbarUtils";

const NotificationItem = memo(({ notif, onMarkRead, onDelete }) => {
  const router = useRouter();

  useEffect(() => {
    // console.log("Notification data:", notif);
    // console.log("Notification link:", notif.link);
  }, [notif]);

  const handleClick = () => {
    console.log("Notification clicked, link:", notif.link);
    if (notif.link) {
      console.log("Pushing to:", notif.link);
      router.push(notif.link);
    }
  };

  return (
    <div
      className={`px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors ${!notif.read ? "bg-[#7c6fff]/5" : ""} ${notif.link ? "cursor-pointer" : ""}`}
      onClick={handleClick}
    >
      <div className="flex gap-3">
        <div className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center">
          {ICON_MAP[notif.type] ?? ICON_MAP.default}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={`text-[13px] font-semibold truncate ${!notif.read ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}
            >
              {notif.title}
            </p>
            {!notif.read && (
              <span className="w-1.5 h-1.5 bg-[#7c6fff] rounded-full shrink-0 mt-1.5 animate-pulse" />
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">
            {notif.message}
          </p>
          {/* {notif.link && (
            <p className="text-xs text-blue-500 mt-1">Link: {notif.link}</p>
          )} */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-[var(--text-muted)]">
              {getTimeAgo(notif.createdAt)}
            </span>
            <div className="flex gap-2">
              {!notif.read && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkRead(notif._id);
                  }}
                  className="text-[11px] text-[#7c6fff] hover:text-[#a5b4fc] font-medium transition-colors"
                >
                  Mark read
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notif._id);
                }}
                className="text-[11px] text-rose-400 hover:text-rose-300 font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
NotificationItem.displayName = "NotificationItem";

export default NotificationItem;
