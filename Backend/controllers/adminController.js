import * as adminService from "../services/adminService.js";

const handle = (fn) => async (req, res) => {
  try {
    const result = await fn(req, res);
    if (result !== undefined) res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
};

// Departments 
export const getDepartments  = handle(async () => adminService.listDepartments());
export const createDepartment = handle(async (req) => { const d = await adminService.addDepartment(req.body.name); res.status(201).json(d); });
export const deleteDepartment = handle(async (req) => { await adminService.removeDepartment(req.params.id); return { message: "Department deleted" }; });
export const updateDepartment = handle(async (req) => adminService.editDepartment(req.params.id, req.body.name));

// Roles 
export const getRoles    = handle(async () => adminService.listRoles());
export const createRole  = handle(async (req) => { const r = await adminService.addRole(req.body.name, req.body.permissions); res.status(201).json(r); });
export const updateRole  = handle(async (req) => adminService.editRole(req.params.id, req.body.name, req.body.permissions));
export const deleteRole  = handle(async (req) => { await adminService.removeRole(req.params.id); return { message: "Role deleted" }; });

// Users 
export const getUser    = handle(async (req) => adminService.listUsers(req.user, req.departmentFilter));
export const createUser = handle(async (req, res) => { const u = await adminService.addUser(req.body, req.user); res.status(201).json(u); });
export const updateUser = handle(async (req) => adminService.editUser(req.params.id, req.body, req.user, req.departmentFilter));
export const deleteUser = handle(async (req) => { await adminService.removeUser(req.params.id, req.user); return { message: "User deleted successfully" }; });

//  Admins
export const getAdmins    = handle(async (req) => adminService.listAdmins(req.user));
export const createAdmin  = handle(async (req, res) => { const a = await adminService.addAdmin(req.body, req.user); res.status(201).json(a); });
export const updateAdmin  = handle(async (req) => adminService.editAdmin(req.params.id, req.body, req.user));
export const deleteAdmin  = handle(async (req) => { await adminService.removeAdmin(req.params.id, req.user); return { message: "Admin deleted successfully" }; });

// Dashboard 
export const getDashboardStats = handle(async (req) => {
  const stats = await adminService.getDashboardStats(req.user);
  return { stats };
});
