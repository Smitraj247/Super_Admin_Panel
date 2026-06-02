"use client";

import { memo } from "react";
import { ChevronLeft as ChevronLeftIcon } from "lucide-react";

function SidebarHeader({ collapsed, user, meta, onCollapse }) {
  const RoleIcon = meta.icon;

  return (
    <div className="relative px-4 py-5 border-b border-white/10">
      <div
        className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}
      >
        <div
          className={`
                w-11 h-11 rounded-2xl
                bg-gradient-to-br ${meta.gradient}
                flex items-center justify-center
                shadow-lg shadow-black/30
              `}
        >
          <RoleIcon size={20} className="text-white" />
        </div>

        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-sm truncate">
              {user?.name}
            </h2>

            <p className="text-xs text-slate-400 mt-0.5">{meta.title}</p>
          </div>
        )}

        {!collapsed && (
          <button
            onClick={onCollapse}
            className="hidden lg:flex p-2 rounded-xl hover:bg-white/5 text-slate-400"
          >
            <ChevronLeftIcon size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

export default memo(SidebarHeader);
