import {
  LayoutDashboard,
  Users,
  Building2,
  ShieldCheck,
  History,
  UserCog,
  Calendar,
  MessageCircle,
  ClipboardList,
  User,
  Shield,
  Crown,
  Zap,
  Mail,
  CalendarCheck,
  CheckCircle,
  BarChart3,
  Target,
} from "lucide-react";

export const toSlug = (name = "") =>
  String(name).toLowerCase().replace(/\s+/g, "-");

export const DEFAULT_PERMISSIONS = [
  "Dashboard",
  "Profile",
  "Chats",
  "Attendance",
  "Apply Leave",
  "Leads",
  "Emails",
  "Meetings",
  "Followups",
  "Reports",
];

export const normalizePermissions = (permissions = []) =>
  Array.isArray(permissions)
    ? permissions.map((p) => {
        if (p === "Chat") return "Chats";
        return p;
      })
    : [];

export const uniqueByName = (items = []) => {
  if (!Array.isArray(items)) return [];

  const seen = new Set();

  return items.filter((item) => {
    const name = item?.name?.toString().trim().toLowerCase();
    if (!name || seen.has(name)) return false;
    seen.add(name);
    return true;
  });
};

export const uniqueByPath = (items = []) => {
  if (!Array.isArray(items)) return [];

  const seen = new Set();

  return items.filter((item) => {
    const path = item?.path?.toString().trim();
    if (!path || seen.has(path)) return false;
    seen.add(path);
    return true;
  });
};

export const buildDeptMenu = (roleKey, dept, prefix, permissions = []) => {
  const extra = DEPT_EXTRA?.[roleKey]?.[dept] ?? [];
  const items = [...BASE_ITEMS(), ...extra, ...TAIL_ITEMS];

  const filteredByName = uniqueByName(items);
  const normalizedPermissions = normalizePermissions(permissions);

  const mappedItems = filteredByName
    .filter(({ name }) => name)
    .map(({ name, icon }) => ({
      name,
      icon,
      path:
        name === "Dashboard"
          ? `/${prefix}/${dept}`
          : `/${prefix}/${dept}/${toSlug(name)}`,
    }));

  const uniqueItems = uniqueByPath(mappedItems);

  return normalizedPermissions.length
    ? uniqueItems.filter(({ name }) => normalizedPermissions.includes(name))
    : uniqueItems;
};

export const ROLE_META = {
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

export const SUPER_ADMIN_MENU = [
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

export const BASE_ITEMS = () => [
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

export const DEPT_EXTRA = {
  user: {
    employee: [
      {
        name: "Attendance",
        icon: Calendar,
      },
      {
        name: "Leaves",
        icon: ClipboardList,
      },
    ],
    sales: [
      {
        name: "Attendance",
        icon: Calendar,
      },
      {
        name: "Leads",
        icon: Zap,
      },
      {
        name: "Emails",
        icon: Mail,
      },
      {
        name: "Meetings",
        icon: CalendarCheck,
      },
      {
        name: "Followups",
        icon: CheckCircle,
      },
      {
        name: "Reports",
        icon: BarChart3,
      },
    ],
    hr: [],
  },

  admin: {
    sales: [
      {
        name: "Attendance",
        icon: Calendar,
      },
      {
        name: "Holidays",
        icon: Calendar,
      },
      {
        name: "Leads",
        icon: Zap,
      },
      {
        name: "Emails",
        icon: Mail,
      },
      {
        name: "Meetings",
        icon: CalendarCheck,
      },
      {
        name: "Followups",
        icon: CheckCircle,
      },
      {
        name: "Targets",
        icon: Target,
      },
      {
        name: "Reports",
        icon: BarChart3,
      },
    ],

    hr: [
      {
        name: "Admins",
        icon: ShieldCheck,
      },
      {
        name: "Attendance",
        icon: Calendar,
      },
      {
        name: "Holidays",
        icon: Calendar,
      },
    ],
  },
};

export const TAIL_ITEMS = [
  {
    name: "Apply Leave",
    icon: ClipboardList,
  },
];
