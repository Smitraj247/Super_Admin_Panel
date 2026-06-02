export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  USER: "USER",
};

export const DEPARTMENTS = {
  HR: {
    name: "HR",
    path: "/dashboard/hr",
    adminPath: "/admin/hr",
    color: "from-green-500 to-green-600",
  },
  SALES: {
    name: "SALES",
    path: "/dashboard/sales",
    adminPath: "/admin/sales",
    color: "from-purple-500 to-purple-600",
  },
  EMPLOYEE: {
    name: "EMPLOYEE",
    path: "/dashboard/employee",
    adminPath: "/admin/employee",
    color: "from-purple-500 to-purple-600",
  },
};

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";
