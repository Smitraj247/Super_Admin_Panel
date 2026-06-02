"use client";

import { memo } from "react";
import { LogOut, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon } from "lucide-react";

function SidebarFooter({
  collapsed,
  user,
  meta,
  role,
  dept,
  onProfileClick,
  onLogout,
  onToggleCollapse,
}) {
  return (
    <div className="mt-auto p-3 border-t border-white/10 bg-[#181625]">
      <button
        onClick={onProfileClick}
        className={`
              w-full flex items-center
              ${collapsed ? "justify-center" : "gap-3"}
              p-3 rounded-2xl
              bg-white/[0.03]
              hover:bg-white/[0.06]
              transition-all
            `}
      >
        <div
          className={`
                w-10 h-10 rounded-xl
                bg-gradient-to-br ${meta.gradient}
                flex items-center justify-center
                text-white font-bold text-sm
                shadow-lg
              `}
        >
          {user?.name?.charAt(0)?.toUpperCase()}
        </div>

        {!collapsed && (
          <div className="text-left min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {user?.name}
            </p>

            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        )}
      </button>

      <div className="mt-2 space-y-2">
        <button
          onClick={onLogout}
          className={`
                w-full flex items-center
                ${collapsed ? "justify-center" : "gap-3"}
                px-3 py-3 rounded-2xl
                text-slate-400
                hover:bg-rose-500/10
                hover:text-rose-400
                transition-all
              `}
        >
          <LogOut size={17} />

          {!collapsed && (
            <span className="text-sm font-medium">Sign Out</span>
          )}
        </button>

        <button
          onClick={onToggleCollapse}
          className={`
                hidden lg:flex w-full items-center
                ${collapsed ? "justify-center" : "justify-between"}
                px-3 py-3 rounded-2xl
                text-slate-400
                hover:bg-white/5
                hover:text-white
                transition-all
              `}
        >
          {!collapsed && <span className="text-sm">Collapse</span>}

          {collapsed ? (
            <ChevronRightIcon size={16} />
          ) : (
            <ChevronLeftIcon size={16} />
          )}
        </button>
      </div>
    </div>
  );
}

export default memo(SidebarFooter);
