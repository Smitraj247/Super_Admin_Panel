"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/layout/Navbar";
import API from "@/lib/api";
import { ProtectedDashboardRoute } from "@/components/auth/ProtectedDashboardRoute";
import { ROLES } from "@/utils/constants";
import ChatWindow from "@/components/ui/ChatWindow";
import {
  Users,
  UserPlus,
  Mail,
  Building2,
  Shield,
  Trash2,
  Edit3,
  Search,
  UserCircle,
  MoreVertical,
  CheckCircle2,
  Eye,
  EyeOff,
  MessageCircle,
} from "lucide-react";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "USER",
    department: "",
    sidebarPermissions: [
      "Dashboard",
      "Profile",
      "Chats",
      "Attendance",
      "Apply Leave",
    ],
  });

  const [editingId, setEditingId] = useState(null);

  // Chat state
  const [chatUser, setChatUser] = useState(null);

  // Available sidebar options for users
  const availableSidebarOptions = [
    "Dashboard",
    "Profile",
    "Chats",
    "Attendance",
    "Apply Leave",
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
      const [usersRes, deptsRes] = await Promise.all([
        API.get("/superadmin/users"),
        API.get("/superadmin/departments"),
      ]);
      setUsers(usersRes.data.users || usersRes.data);
      setDepartments(deptsRes.data);
    } catch (err) {
      console.error("Fetch Error:", err);
      console.error("Error details:", err.response?.data || err.message);
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
      alert("Please fill all required fields");
      return;
    }

    try {
      if (editingId) {
        const res = await API.put(`/superadmin/users/${editingId}`, {
          name: form.name,
          email: form.email,
          department: form.department,
          sidebarPermissions: form.sidebarPermissions,
        });
        setUsers(users.map((u) => (u._id === editingId ? res.data : u)));
        setEditingId(null);
      } else {
        const res = await API.post("/superadmin/users", {
          name: form.name,
          email: form.email,
          password: form.password || "123456",
          department: form.department,
          sidebarPermissions: form.sidebarPermissions,
        });
        setUsers([...users, res.data]);
      }
      setForm({
        name: "",
        email: "",
        password: "",
        role: "USER",
        department: "",
        sidebarPermissions: [
          "Dashboard",
          "Profile",
          "Chats",
          "Attendance",
          "Apply Leave",
        ],
      });
    } catch (err) {
      alert(err.response?.data?.message || "Operation failed");
    }
  };

  const deleteUser = async (id) => {
    if (!confirm("Are you sure you want to remove this user?")) return;
    try {
      await API.delete(`/superadmin/users/${id}`);
      setUsers(users.filter((u) => u._id !== id));
    } catch (err) {
      console.error(err.response?.data);
    }
  };

  const startEdit = (user) => {
    setEditingId(user._id);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role?.name || "USER",
      department: user.department?._id || "",
      sidebarPermissions:
        user.sidebarPermissions?.length > 0
          ? user.sidebarPermissions
          : ["Dashboard", "Profile", "Chats", "Attendance", "Apply Leave"],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredUsers = users.filter(
    (user) =>
      (user.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (user.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (user.department?.name || "")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  return (
    <ProtectedDashboardRoute requiredRole={ROLES.SUPER_ADMIN}>
      <div className="min-h-screen bg-[var(--bg-base)]">
        <Sidebar />
        <Navbar />
        <main className=" md:pl-64 pt-12 ">
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center py-3 mb-8 gap-3">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Users className="text-indigo-600" size={28} />
                  User Directory
                </h1>
                <p className="text-gray-500 text-sm">
                  Manage user accounts and departments
                </p>
              </div>

              <div className="bg-[var(--bg-surface)] rounded-lg border  p-2 flex items-center gap-4  ">
                <UserCircle size={16} />
                {users.length} Users
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[var(--bg-surface)] rounded-[2rem] border border-[var(--border)] shadow-sm max-h-[700px]overflow-y-scroll no-scrollbar p-6 ">
                <h3 className="font-semibold mb-4 flex items-center gap-2 sticky top-0 bg-[var(--bg-surface)] pb-2">
                  {editingId ? <Edit3 size={18} /> : <UserPlus size={18} />}
                  {editingId ? "Edit User" : "Add User"}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Full Name"
                    className=" w-full bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400"
                    required
                  />

                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Email"
                    className=" w-full bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400"
                    required
                  />

                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Password (optional)"
                      className=" w-full bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[var(--text-secondary)]"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  <select
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    className=" w-full bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>

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
                        ? "No permissions selected - user will see all options"
                        : `${form.sidebarPermissions.length} permission(s) selected`}
                    </p>
                  </div>

                  <button
                    type="submit"
                    className=" w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all"
                  >
                    {editingId ? "Update User" : "Create User"}
                  </button>
                </form>
              </div>

              <div className=" md:col-span-2 ">
                <div className=" w-full relative mb-4">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search users..."
                    className="bg-[var(--bg-surface)] border-none rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="bg-[var(--bg-surface)] rounded-[2rem] border border-[var(--border)] shadow-sm  overflow-y-auto">
                  <table className="w-full text-left ">
                    <thead className=" sticky top-0 bg-[var(--bg-elevated)] z-20 ">
                      <tr className="bg-[var(--bg-elevated)]">
                        <th className="p-5 text-xs text-[var(--text-secondary)] font-bold uppercase">
                          USER
                        </th>
                        <th className="p-5 text-xs text-[var(--text-secondary)] font-bold uppercase">
                          DEPARTMENT
                        </th>
                        <th className="p-5 text-xs text-[var(--text-secondary)] font-bold uppercase">
                          ROLE
                        </th>
                        <th className="p-5 text-xs text-[var(--text-secondary)] font-bold uppercase">
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredUsers.map((user) => (
                        <tr
                          key={user._id}
                          className="hover:bg-slate-200 transition"
                        >
                          <td className="p-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                                {user.name?.charAt(0)}
                              </div>
                              <div>
                                <p className="text-[var(--text-primary)]">
                                  {user.name}
                                </p>
                                <p className="text-xs text-[var(--text-secondary)]">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-5">
                            <span className="px-3 py-1 bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded-lg text-xs font-bold uppercase">
                              {user.department?.name || "Unassigned"}
                            </span>
                          </td>
                          <td className="p-5">
                            <span className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold uppercase">
                              {user.role?.name}
                            </span>
                          </td>
                          <td className="p-5">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setChatUser(user)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                title="Chat with user"
                              >
                                <MessageCircle size={18} />
                              </button>
                              <button
                                onClick={() => startEdit(user)}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                              >
                                <Edit3 size={18} />
                              </button>
                              <button
                                onClick={() => deleteUser(user._id)}
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
        </main>

        {/* Chat Window */}
        {chatUser && (
          <ChatWindow user={chatUser} onClose={() => setChatUser(null)} />
        )}
      </div>
    </ProtectedDashboardRoute>
  );
}
