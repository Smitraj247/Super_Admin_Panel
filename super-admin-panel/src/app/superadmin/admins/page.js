"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { ProtectedDashboardRoute } from "@/components/auth/ProtectedDashboardRoute";
import { ROLES } from "@/utils/constants";
import ChatWindow from "@/components/ui/ChatWindow";
import {
  getAdminsApi,
  createAdminApi,
  updateAdminApi,
  deleteAdminApi,
  getDepartmentsApi,
} from "@/services/superAdminApi";
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  Edit3,
  Search,
  MessageCircle,
} from "lucide-react";

export default function AdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "ADMIN",
    department: "",
    sidebarPermissions: [],
  });

  const [editingId, setEditingId] = useState(null);

  // Chat state
  const [chatUser, setChatUser] = useState(null);

  // Available sidebar options for admins
  const availableSidebarOptions = [
    "Dashboard",
    "Profile",
    "Admins",
    "Users",
    "Departments",
    "Roles",
    "Attendance",
    "Apply Leave",
    "Holidays",
  ];

  const handlePermissionToggle = (permission) => {
    setForm((prev) => ({
      ...prev,
      sidebarPermissions: prev.sidebarPermissions.includes(permission)
        ? prev.sidebarPermissions.filter((p) => p !== permission)
        : [...prev.sidebarPermissions, permission],
    }));
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [adminsRes, deptsRes] = await Promise.all([
        getAdminsApi(),
        getDepartmentsApi(),
      ]);
      setAdmins(adminsRes.data);
      setDepartments(deptsRes.data);
    } catch (err) {
      console.error("Fetch Error:", err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.department) {
      alert("Please fill all required fields (name, email, department)");
      return;
    }

    if (!editingId && !form.password) {
      alert("Password is required for new admins");
      return;
    }

    try {
      if (editingId) {
        const res = await updateAdminApi(editingId, form);
        setAdmins(admins.map((a) => (a._id === editingId ? res.data : a)));
        setEditingId(null);
      } else {
        const res = await createAdminApi(form);
        setAdmins([...admins, res.data]);
      }
      setForm({
        name: "",
        email: "",
        password: "",
        role: "ADMIN",
        department: "",
        sidebarPermissions: [],
      });
      alert("Admin " + (editingId ? "updated" : "created") + " successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Operation failed");
    }
  };

  const deleteAdmin = async (id) => {
    if (!confirm("Are you sure you want to remove this admin?")) return;
    try {
      await deleteAdminApi(id);
      setAdmins(admins.filter((a) => a._id !== id));
    } catch (err) {
      console.error(err.response?.data);
    }
  };

  const startEdit = (admin) => {
    setEditingId(admin._id);
    setForm({
      name: admin.name,
      email: admin.email,
      password: "",
      role: admin.role?._id || "ADMIN",
      department: admin.department?._id || "",
      sidebarPermissions: admin.sidebarPermissions || [],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredAdmins = admins.filter(
    (admin) =>
      (admin.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (admin.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (admin.department?.name || "")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  return (
    <ProtectedDashboardRoute requiredRole={ROLES.SUPER_ADMIN}>
      <div className="min-h-screen bg-[var(--bg-base)]">
        <Sidebar />
        <Navbar />

        <main className=" md:pl-64 pt-16">
          <div className="p-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 py-3  gap-4 overflow-hidden">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Shield className="text-indigo-600" size={26} />
                  Admin Management
                </h1>
                <p className="text-gray-500 text-sm">
                  Manage administrator accounts
                </p>
              </div>

              <div className="bg-[var(--bg-surface)] border rounded-lg px-4 py-2 flex items-center gap-2">
                <Users size={16} />
                {admins.length} Admins
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] p-6 max-h-[700px] overflow-y-scroll no-scrollbar">
                <h3 className="font-semibold mb-4 flex items-center gap-2 sticky top-0 bg-[var(--bg-surface)] pb-2">
                  {editingId ? <Edit3 size={18} /> : <UserPlus size={18} />}
                  {editingId ? "Edit Admin" : "Add New Admin"}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="e.g., John Doe"
                      className="w-full border border-[var(--border-strong)] rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="e.g., admin@company.com"
                      className="w-full border border-[var(--border-strong)] rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      required
                    />
                  </div>

                  {!editingId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password *
                      </label>
                      <input
                        name="password"
                        type="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Enter secure password"
                        className="w-full border border-[var(--border-strong)] rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department *
                    </label>
                    <select
                      name="department"
                      value={form.department}
                      onChange={handleChange}
                      className="w-full border border-[var(--border-strong)] rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      required
                    >
                      <option value="">-- Select Department --</option>
                      {departments.map((dept) => (
                        <option key={dept._id} value={dept._id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sidebar Permissions */}
                  <div className="border border-[var(--border-strong)] rounded-lg p-4">
                    <label className="block text-sm font-semibold text-[var(--text-primary)] mb-3">
                      Sidebar Permissions
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {availableSidebarOptions.map((option) => (
                        <label
                          key={option}
                          className="flex items-center gap-2 cursor-pointer hover:bg-[var(--bg-elevated)] p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={form.sidebarPermissions.includes(option)}
                            onChange={() => handlePermissionToggle(option)}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-[var(--text-primary)]">
                            {option}
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-2">
                      {form.sidebarPermissions.length === 0
                        ? "No permissions selected - admin will see all options"
                        : `${form.sidebarPermissions.length} permission(s) selected`}
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all"
                  >
                    {editingId ? "Update Admin" : "Create Admin"}
                  </button>
                </form>
              </div>

              <div className="md:col-span-2">
                <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="relative w-full max-w-md">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        size={18}
                      />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search admins..."
                        className="w-full bg-[var(--bg-elevated)] border-none rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-[var(--bg-elevated)]">
                          <th className="p-5 text-xs text-[var(--text-secondary)] font-bold uppercase">
                            ADMIN
                          </th>
                          <th className="p-5 text-xs text-[var(--text-secondary)] font-bold uppercase">
                            DEPARTMENT
                          </th>
                          <th className="p-5 text-xs text-[var(--text-secondary)] font-bold uppercase">
                            ACTIONS
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredAdmins.map((admin) => (
                          <tr
                            key={admin._id}
                            className="hover:bg-[var(--bg-elevated)] transition"
                          >
                            <td className="p-5">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                                  {admin.name?.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-semibold text-[var(--text-primary)]">
                                    {admin.name}
                                  </p>
                                  <p className="text-xs text-[var(--text-secondary)]">
                                    {admin.email}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="p-5">
                              <span className="px-3 py-1 bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded-lg text-xs font-bold uppercase">
                                {admin.department?.name || "Unassigned"}
                              </span>
                            </td>
                            <td className="p-5">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setChatUser(admin)}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                  title="Chat with admin"
                                >
                                  <MessageCircle size={18} />
                                </button>
                                <button
                                  onClick={() => startEdit(admin)}
                                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                >
                                  <Edit3 size={18} />
                                </button>
                                <button
                                  onClick={() => deleteAdmin(admin._id)}
                                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Chat Window */}
        {chatUser && (
          <ChatWindow user={chatUser} onClose={() => setChatUser(null)} />
        )}
      </div>
    </ProtectedDashboardRoute>
  );
}

