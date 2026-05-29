"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useSidebar } from "../context/SidebarContext";
import { useState, useMemo, useCallback } from "react";

import {
  LayoutDashboard,
  Users,
  Building2,
  ShieldCheck,
  History,
  LogOut,
  UserCog,
  Menu,
  X,
  Calendar,
  Monitor,
  Server,
  Wifi,
  Cpu,
  Zap,
  ClipboardList,
  User,
  Shield,
  Crown,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const toSlug = (name) =>
  name.toLowerCase().replace(/\s+/g, "-");

/* -------------------------------------------------------------------------- */
/*                               DEFAULT ACCESS                               */
/* -------------------------------------------------------------------------- */

const DEFAULT_PERMISSIONS = [
  "Dashboard",
  "Profile",
  "Chats",
  "Attendance",
  "Apply Leave",
];

/* -------------------------------------------------------------------------- */
/*                          NORMALIZE PERMISSIONS                             */
/* -------------------------------------------------------------------------- */

const normalizePermissions = (permissions = []) =>
  permissions.map((p) => {
    if (p === "Chat") return "Chats";
    return p;
  });

/* -------------------------------------------------------------------------- */
/*                                ROLE META                                   */
/* -------------------------------------------------------------------------- */

const ROLE_META = {
  SUPER_ADMIN: {
    title: "Super Admin",
    icon: Crown,
    gradient: "from-violet-500 to-indigo-600",
  },

  ADMIN: {
    title: "Admin",
    icon: Shield,
    gradient: "from-emerald-500 to-teal-600",
  },

  USER: {
    title: "User",
    icon: User,
    gradient: "from-sky-500 to-indigo-500",
  },
};

/* -------------------------------------------------------------------------- */
/*                           SUPER ADMIN MENU                                 */
/* -------------------------------------------------------------------------- */

const SUPER_ADMIN_MENU = [
  {
    name: "Dashboard",
    icon: LayoutDashboard,
    path: "/superadmin/dashboard",
  },

  {
    name: "Profile",
    icon: User,
    path: "/superadmin/profile",
  },

  {
    name: "Admins",
    icon: ShieldCheck,
    path: "/superadmin/admins",
  },

  {
    name: "Users",
    icon: Users,
    path: "/superadmin/users",
  },

  {
    name: "Departments",
    icon: Building2,
    path: "/superadmin/departments",
  },

  {
    name: "Roles",
    icon: UserCog,
    path: "/superadmin/roles",
  },

  {
    name: "Chats",
    icon: MessageCircle,
    path: "/superadmin/chats",
  },

  {
    name: "Attendance",
    icon: Calendar,
    path: "/superadmin/attendance",
  },

  {
    name: "Leaves",
    icon: ClipboardList,
    path: "/superadmin/leaves",
  },

  {
    name: "Holidays",
    icon: Calendar,
    path: "/superadmin/holidays",
  },

  {
    name: "Audit Logs",
    icon: History,
    path: "/superadmin/audit",
  },
];

/* -------------------------------------------------------------------------- */
/*                                BASE ITEMS                                  */
/* -------------------------------------------------------------------------- */

const BASE_ITEMS = () => [
  {
    name: "Dashboard",
    icon: LayoutDashboard,
  },

  {
    name: "Profile",
    icon: User,
  },

  {
    name: "Users",
    icon: Users,
  },

  {
    name: "Departments",
    icon: Building2,
  },

  {
    name: "Roles",
    icon: UserCog,
  },

  {
    name: "Chats",
    icon: MessageCircle,
  },
];

/* -------------------------------------------------------------------------- */
/*                             DEPARTMENT ITEMS                               */
/* -------------------------------------------------------------------------- */

const DEPT_EXTRA = {
  user: {
    it: [
      {
        name: "Help Desk",
        icon: Monitor,
      },

      {
        name: "Network Monitor",
        icon: Wifi,
      },
    ],

    ce: [
      {
        name: "Projects",
        icon: Cpu,
      },

      {
        name: "Reports",
        icon: ClipboardList,
      },
    ],

    sales: [
      {
        name: "Leads",
        icon: Zap,
      },

      {
        name: "Targets",
        icon: ClipboardList,
      },

      {
        name: "Reports",
        icon: ClipboardList,
      },
    ],

    hr: [],
  },

  admin: {
    it: [
      {
        name: "Holidays",
        icon: Calendar,
      },

      {
        name: "Help Desk",
        icon: Monitor,
      },

      {
        name: "Asset Management",
        icon: Server,
      },

      {
        name: "Network Monitor",
        icon: Wifi,
      },
    ],

    ce: [
      {
        name: "Projects",
        icon: Cpu,
      },

      {
        name: "Reports",
        icon: ClipboardList,
      },

      {
        name: "Holidays",
        icon: Calendar,
      },
    ],

    sales: [
      {
        name: "Holidays",
        icon: Calendar,
      },

      {
        name: "Leads",
        icon: Zap,
      },

      {
        name: "Targets",
        icon: ClipboardList,
      },

      {
        name: "Reports",
        icon: ClipboardList,
      },
    ],

    hr: [
      {
        name: "Admins",
        icon: ShieldCheck,
      },

      {
        name: "Holidays",
        icon: Calendar,
      },
    ],
  },
};

/* -------------------------------------------------------------------------- */
/*                                 TAIL ITEMS                                 */
/* -------------------------------------------------------------------------- */

const TAIL_ITEMS = [
  {
    name: "Attendance",
    icon: Calendar,
  },

  {
    name: "Apply Leave",
    icon: ClipboardList,
  },
];

/* -------------------------------------------------------------------------- */
/*                            BUILD MENU FUNCTION                             */
/* -------------------------------------------------------------------------- */

const buildDeptMenu = (
  roleKey,
  dept,
  prefix,
  permissions = []
) => {
  const extra = DEPT_EXTRA[roleKey]?.[dept] ?? [];

  const all = [
    ...BASE_ITEMS(),
    ...extra,
    ...TAIL_ITEMS,
  ];

  const normalizedPermissions =
    normalizePermissions(permissions);

  const items = normalizedPermissions.length
    ? all.filter(({ name }) =>
      normalizedPermissions.includes(name)
    )
    : all;

  return items.map(({ name, icon }) => ({
    name,
    icon,
    path:
      name === "Dashboard"
        ? `/${prefix}/${dept}`
        : `/${prefix}/${dept}/${toSlug(name)}`,
  }));
};

export default function Sidebar() {
  const { user, logout, loading } = useAuth();

  const { collapsed, setCollapsed } =
    useSidebar();

  const pathname = usePathname();

  const router = useRouter();

  const [open, setOpen] = useState(false);

  const { role, dept } = useMemo(() => {
    const role = (
      user?.role?.name ||
      user?.role ||
      "USER"
    )
      .toUpperCase()
      .replace(" ", "_");

    const dept = (
      (typeof user?.department === "object"
        ? user?.department?.name
        : user?.department) || "ce"
    ).toLowerCase();

    return {
      role,
      dept,
    };
  }, [user?.role, user?.department]);

  /* -------------------------------------------------------------------------- */
  /*                               MENU ITEMS                                   */
  /* -------------------------------------------------------------------------- */

  const menuItems = useMemo(() => {
    if (role === "SUPER_ADMIN") {
      return SUPER_ADMIN_MENU;
    }

    const permissions =
      user?.sidebarPermissions?.length > 0
        ? normalizePermissions(
          user.sidebarPermissions
        )
        : DEFAULT_PERMISSIONS;

    return role === "ADMIN"
      ? buildDeptMenu(
        "admin",
        dept,
        "admin",
        permissions
      )
      : buildDeptMenu(
        "user",
        dept,
        "dashboard",
        permissions
      );
  }, [
    role,
    dept,
    user?.sidebarPermissions,
  ]);

  const groupedItems = useMemo(() => {
    const groups = [
      {
        id: "general",
        title: "General",
        items: [],
      },

      {
        id: "management",
        title: "Management",
        items: [],
      },

      {
        id: "operations",
        title: "Operations",
        items: [],
      },
    ];

    menuItems.forEach((item) => {
      const name =
        item.name.toLowerCase();

      if (
        name.includes("dashboard") ||
        name === "profile" ||
        name === "chats"
      ) {
        groups[0].items.push(item);
      } else if (
        name === "users" ||
        name === "departments" ||
        name === "roles" ||
        name === "admins"
      ) {
        groups[1].items.push(item);
      } else {
        groups[2].items.push(item);
      }
    });

    return groups.filter(
      (g) => g.items.length > 0
    );
  }, [menuItems]);

  const meta =
    ROLE_META[role] ??
    ROLE_META.USER;

  const handleLogout = useCallback(() => {
    logout();
    setOpen(false);
    router.push("/login");
  }, [logout, router]);

  if (loading || !user) return null;

  const RoleIcon = meta.icon;

  return (
    <>
      {/* MOBILE BUTTON */}

      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden
        p-2.5 rounded-xl bg-[#1f1b2e]
        border border-white/10 text-white"
      >
        <Menu size={20} />
      </button>

      {/* BACKDROP */}

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* SIDEBAR */}

      <aside
        className={`
          fixed top-0 left-0 z-50
          h-screen
          transition-all duration-300
          border-r border-white/10
          bg-[#1e1b2e]
          flex flex-col
          shadow-2xl
          ${collapsed ? "w-20" : "w-62"}
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* GLOW */}

        <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-violet-500/10 to-transparent pointer-events-none" />

        {/* HEADER */}

        <div className="relative px-4 py-5 border-b border-white/10">
          <div
            className={`flex items-center ${collapsed
              ? "justify-center"
              : "gap-3"
              }`}
          >
            <div
              className={`
                w-11 h-11 rounded-2xl
                bg-gradient-to-br ${meta.gradient}
                flex items-center justify-center
                shadow-lg shadow-black/30
              `}
            >
              <RoleIcon
                size={20}
                className="text-white"
              />
            </div>

            {!collapsed && (
              <div className="flex-1 min-w-0">
                <h2 className="text-white font-bold text-sm truncate">
                  {user?.name}
                </h2>

                <p className="text-xs text-slate-400 mt-0.5">
                  {meta.title}
                </p>
              </div>
            )}

            {!collapsed && (
              <button
                onClick={() =>
                  setCollapsed(true)
                }
                className="hidden lg:flex p-2 rounded-xl hover:bg-white/5 text-slate-400"
              >
                <ChevronLeft size={16} />
              </button>
            )}
          </div>
        </div>

        {/* MENU */}

        <div className="flex-1 overflow-y-auto py-5 px-3 no-scrollbar">
          {groupedItems.map((group) => (
            <div
              key={group.id}
              className="mb-6"
            >
              {!collapsed && (
                <p className="px-3 mb-3 text-[11px] uppercase tracking-[0.2em] text-slate-500 font-bold">
                  {group.title}
                </p>
              )}

              <div className="space-y-1.5">
                {group.items.map(
                  ({
                    name,
                    path,
                    icon: Icon,
                  }) => {
                    const active =
                      pathname === path;

                    return (
                      <Link
                        key={path}
                        href={path}
                        title={
                          collapsed
                            ? name
                            : undefined
                        }
                        onClick={() =>
                          setOpen(false)
                        }
                        className={`
                          group relative flex items-center
                          ${collapsed
                            ? "justify-center"
                            : "gap-3"
                          }
                          px-3 py-3 rounded-2xl
                          transition-all duration-200
                          ${active
                            ? "bg-gradient-to-r from-violet-500/20 to-indigo-500/20 text-white border border-violet-500/20"
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                          }
                        `}
                      >
                        <Icon
                          size={18}
                          className={`${active
                            ? "text-violet-300"
                            : ""
                            }`}
                        />

                        {!collapsed && (
                          <>
                            <span className="text-sm font-medium">
                              {name}
                            </span>

                            {active && (
                              <div className="ml-auto w-2 h-2 rounded-full bg-violet-400" />
                            )}
                          </>
                        )}

                        {/* TOOLTIP */}

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
                  }
                )}
              </div>
            </div>
          ))}
        </div>

        {/* FOOTER FIXED BOTTOM */}

        <div className="mt-auto p-3 border-t border-white/10 bg-[#181625]">
          {/* PROFILE */}

          <button
            onClick={() =>
              router.push(
                role ===
                  "SUPER_ADMIN"
                  ? "/superadmin/profile"
                  : role ===
                    "ADMIN"
                    ? `/admin/${dept}/profile`
                    : `/dashboard/${dept}/profile`
              )
            }
            className={`
              w-full flex items-center
              ${collapsed
                ? "justify-center"
                : "gap-3"
              }
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
              {user?.name
                ?.charAt(0)
                ?.toUpperCase()}
            </div>

            {!collapsed && (
              <div className="text-left min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {user?.name}
                </p>

                <p className="text-xs text-slate-400 truncate">
                  {user?.email}
                </p>
              </div>
            )}
          </button>

          {/* ACTIONS */}

          <div className="mt-2 space-y-2">
            <button
              onClick={handleLogout}
              className={`
                w-full flex items-center
                ${collapsed
                  ? "justify-center"
                  : "gap-3"
                }
                px-3 py-3 rounded-2xl
                text-slate-400
                hover:bg-rose-500/10
                hover:text-rose-400
                transition-all
              `}
            >
              <LogOut size={17} />

              {!collapsed && (
                <span className="text-sm font-medium">
                  Sign Out
                </span>
              )}
            </button>

            <button
              onClick={() =>
                setCollapsed(!collapsed)
              }
              className={`
                hidden lg:flex w-full items-center
                ${collapsed
                  ? "justify-center"
                  : "justify-between"
                }
                px-3 py-3 rounded-2xl
                text-slate-400
                hover:bg-white/5
                hover:text-white
                transition-all
              `}
            >
              {!collapsed && (
                <span className="text-sm">
                  Collapse
                </span>
              )}

              {collapsed ? (
                <ChevronRight size={16} />
              ) : (
                <ChevronLeft size={16} />
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}