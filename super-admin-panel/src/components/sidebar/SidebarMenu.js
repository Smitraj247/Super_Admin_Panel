"use client";

import { memo } from "react";
import Link from "next/link";

function SidebarMenu({ collapsed, groupedItems, pathname, onLinkClick }) {
  return (
    <div className="flex-1 overflow-y-auto py-5 px-3 no-scrollbar">
      {Array.isArray(groupedItems) &&
        groupedItems.map((group, index) => {
          const items = Array.isArray(group?.items) ? group.items : [];
          const groupKey = group?.id || group?.title || String(index);

          return (
            <div key={groupKey} className="mb-6">
              {!collapsed && (
                <p className="px-3 mb-3 text-[11px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  {group.title}
                </p>
              )}

              <div className="space-y-1.5">
                {items.map(({ name, path, icon: Icon }) => {
                  if (!name || !path || !Icon) return null;

                  const active = pathname === path;

                  return (
                    <Link
                      key={`${groupKey}-${name}-${path}`}
                      href={path}
                      title={collapsed ? name : undefined}
                      onClick={onLinkClick}
                      className={`
                          group relative flex items-center
                          ${collapsed ? "justify-center" : "gap-3"}
                          px-3 py-3 rounded-2xl
                          transition-all duration-200
                          ${
                            active
                              ? "bg-gradient-to-r from-violet-500/20 to-indigo-500/20 text-white border border-violet-500/20"
                              : "text-slate-400 hover:bg-white/5 hover:text-white"
                          }
                        `}
                    >
                      <Icon
                        size={18}
                        className={`${active ? "text-violet-300" : ""}`}
                      />

                      {!collapsed && (
                        <>
                          <span className="text-sm font-medium">{name}</span>

                          {active && (
                            <div className="ml-auto w-2 h-2 rounded-full bg-violet-400" />
                          )}
                        </>
                      )}

                      {collapsed && (
                        <div
                          className="
                              absolute left-full ml-3
                              px-3 py-2 rounded-xl
                              bg-[#2a2640]
                              text-white text-xs
                              opacity-0 invisible
                              group-hover:visible
                              group-hover:opacity-100
                              transition-all
                              whitespace-nowrap
                              z-50
                              border border-white/10
                            "
                        >
                          {name}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
    </div>
  );
}

export default memo(SidebarMenu);
