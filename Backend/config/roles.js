import { PERMISSIONS } from "./permissions.js";

export const DEFAULT_ROLES = [
  {
    name: "SUPER_ADMIN",
    description: "Full system access",
    permissions: Object.values(PERMISSIONS),
    isSystemRole: true,
  },
  {
    name: "HR",
    description: "Human Resources department admin",
    permissions: [
      PERMISSIONS.CREATE_USER,
      PERMISSIONS.UPDATE_USER,
      PERMISSIONS.DELETE_USER,
      PERMISSIONS.VIEW_USERS,
      PERMISSIONS.VIEW_DEPARTMENTS,
    ],
    isSystemRole: true,
  },
];

