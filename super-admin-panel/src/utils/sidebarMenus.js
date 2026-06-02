// Sidebar menu definitions for each department (USER role)
export const userDeptMenus = {
  employee: [
    "Dashboard",
    "Profile",
    "Departments",
    "Roles",
    "Attedance",
    "Apply Leave"
  ],
  sales: [
    "Dashboard",
    "Profile",
    "Users",
    "Departments",
    "Roles",
    "Leads",
    "Targets",
    "Attedance",
  ],
};

// Get available menu items for a specific department and user role
export const getAvailableMenus = (department, role = "USER") => {
  if (role === "ADMIN") {
    const adminDeptMenus = {
      sales: [
        "Dashboard",
        "Profile",
        "Users",
        "Departments",
        "Roles",
        "Holidays",
        "Attedance",
      ],
      hr: [
        "Dashboard",
        "Profile",
        "Admins",
        "Users",
        "Departments",
        "Roles",
        "Holidays",
        "Attedance",
      ],
    };
    return adminDeptMenus[department?.toLowerCase()] || [];
  }

  return userDeptMenus[department?.toLowerCase()] || [];
};   