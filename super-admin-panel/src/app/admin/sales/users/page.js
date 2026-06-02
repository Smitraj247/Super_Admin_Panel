"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/layout/Navbar";
import API from "@/lib/api";
import {
  Users,
  UserPlus,
  Trash2,
  Edit3,
  Search,
  UserCircle,
  Eye,
  EyeOff,
} from "lucide-react";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [dept] = useState("sales");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [editingId, setEditingId] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await API.get("/admin/users");
      setUsers(res.data);
    } catch (err) {
      console.error("Fetch Error:", err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (e) => {
    const { name, type, value, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      alert("Please fill all required fields");
      return;
    }

    try {
      if (editingId) {
        const res = await API.put(`/admin/users/${editingId}`, {
          name: form.name,
          email: form.email,
        });
        setUsers(users.map((u) => (u._id === editingId ? res.data : u)));
        setEditingId(null);
      } else {
        const res = await API.post("/admin/users", {
          name: form.name,
          email: form.email,
          password: form.password || "123456",
        });
        setUsers([...users, res.data]);
      }
      setForm({
        name: "",
        email: "",
        password: "",
      });
    } catch (err) {
      alert(err.response?.data?.message || "Operation failed");
    }
  };

  const deleteUser = async (id) => {
    if (!confirm("Are you sure you want to remove this user?")) return;
    try {
      await API.delete(`/admin/users/${id}`);
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
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filteredUsers = users.filter(
    (user) =>
      (user.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (user.email || "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100">
      <Sidebar />
      <Navbar />
      <main className="md:pl-64 pt-16">
        <div className="p-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center py-3 mb-8 gap-3">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="text-purple-600" size={28} />
                {dept.toUpperCase()} - User Management
              </h1>
              <p className="text-gray-500 text-sm">Manage department users</p>
            </div>

            <div className="bg-white rounded-lg border p-2 flex items-center gap-4">
              <UserCircle size={16} />
              {users.length} Users
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm top-24 p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                {editingId ? <Edit3 size={18} /> : <UserPlus size={18} />}
                {editingId ? "Edit User" : "Add User"}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Full Name"
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 placeholder:text-slate-400"
                  required
                />

                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Email"
                  className="w-full bg-white border border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 placeholder:text-slate-400"
                  required
                />

                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Password (optional)"
                    className="w-full bg-white border border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
                >
                  {editingId ? "Update User" : "Create User"}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setForm({
                        name: "",
                        email: "",
                        password: "",
                      });
                    }}
                    className="w-full text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                )}
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-2">
                <Search size={18} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 outline-none"
                />
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
                <table className="w-full text-md">
                  <thead className="border-b border-slate-300 hover:bg-gray-50">
                    <tr>
                      <th className="p-3 text-left">User</th>
                      <th className="p-3 text-left">Email</th>
                      <th className="p-3 text-left">Role</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <tr
                          key={user._id}
                          className="border-b border-slate-200 hover:bg-gray-50"
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center text-purple-600">
                                {user.name.charAt(0)}
                              </div>
                              <div>
                                <div>{user.name}</div>
                              </div>
                            </div>
                          </td>

                          <td className="p-3">{user.email}</td>

                          <td className="p-3">{user.role?.name || "User"}</td>

                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => startEdit(user)}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Edit3 size={16} />
                              </button>

                              <button
                                onClick={() => deleteUser(user._id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="4"
                          className="p-10 text-center text-gray-400"
                        >
                          No Users Found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
