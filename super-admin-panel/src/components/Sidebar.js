"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";
import { useState, useMemo, useCallback } from "react";

import { Menu } from "lucide-react";
import {
  DEFAULT_PERMISSIONS,
  ROLE_META,
  SUPER_ADMIN_MENU,
  buildDeptMenu,
  normalizePermissions,
} from "./sidebar/sidebar.config";
import SidebarHeader from "./sidebar/SidebarHeader";
import SidebarFooter from "./sidebar/SidebarFooter";
import SidebarMenu from "./sidebar/SidebarMenu";

export default function Sidebar() {
  const { user, logout, loading } = useAuth();

  const { collapsed, setCollapsed } = useSidebar();

  const pathname = usePathname();

  const router = useRouter();

  const [open, setOpen] = useState(false);

  const { role, dept } = useMemo(() => {
    const role = (user?.role?.name || user?.role || "USER")
      .toUpperCase()
      .replace(" ", "_");

    const dept = (
      (typeof user?.department === "object"
        ? user?.department?.name
        : user?.department) || "employee"
    ).toLowerCase();

    return {
      role,
      dept,
    };
  }, [user?.role, user?.department]);

  /* MENU ITEMS */

  const menuItems = useMemo(() => {
    if (role === "SUPER_ADMIN") {
      return SUPER_ADMIN_MENU;
    }

    const permissions =
      user?.sidebarPermissions?.length > 0
        ? normalizePermissions(user.sidebarPermissions)
        : DEFAULT_PERMISSIONS;

    return role === "ADMIN"
      ? buildDeptMenu("admin", dept, "admin", permissions)
      : buildDeptMenu("user", dept, "dashboard", permissions);
  }, [role, dept, user?.sidebarPermissions]);

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
      const name = item.name.toLowerCase();

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

    return groups.filter((g) => g.items.length > 0);
  }, [menuItems]);

  const meta = ROLE_META[role] ?? ROLE_META.USER;

  const handleLogout = useCallback(() => {
    logout();
    setOpen(false);
    router.push("/login");
  }, [logout, router]);

  const handleProfileClick = useCallback(() => {
    const profilePath =
      role === "SUPER_ADMIN"
        ? "/superadmin/profile"
        : role === "ADMIN"
          ? `/admin/${dept}/profile`
          : `/dashboard/${dept}/profile`;

    router.push(profilePath);
  }, [dept, role, router]);

  const handleLinkClick = useCallback(() => {
    setOpen(false);
  }, []);

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, [setCollapsed]);

  if (loading || !user) return null;

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

        <SidebarHeader
          collapsed={collapsed}
          user={user}
          meta={meta}
          onCollapse={() => setCollapsed(true)}
        />

        {/* MENU */}

        <SidebarMenu
          collapsed={collapsed}
          groupedItems={groupedItems}
          pathname={pathname}
          onLinkClick={handleLinkClick}
        />

        <SidebarFooter
          collapsed={collapsed}
          user={user}
          meta={meta}
          role={role}
          dept={dept}
          onProfileClick={handleProfileClick}
          onLogout={handleLogout}
          onToggleCollapse={handleToggleCollapse}
        />
      </aside>
    </>
  );
}
