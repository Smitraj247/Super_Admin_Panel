"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ChatWindow from "@/components/ui/ChatWindow";
import {
  getAdminsApi,
  createAdminApi,
  updateAdminApi,
  deleteAdminApi,
  getDepartmentsApi,
} from "@/services/adminApi";
import {
  Users,
  UserPlus,
  Mail,
  Building2,
  Shield,
  Trash2,
  Edit3,
  Search,
  Key,
  CheckCircle2,
  XCircle,
  MessageCircle,
} from "lucide-react";
import { toast } from "react-toastify";

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
    birthday: "",
  });

  const [editingId, setEditingId] = useState(null);

  // Chat state
  const [chatUser, setChatUser] = useState(null);

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
      toast.error("Please fill all required fields (name, email, department)");
      return;
    }

    if (!editingId && !form.password) {
      toast.error("Password is required for new admins");
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
      });
      toast.success(
        "Admin " + (editingId ? "updated" : "created") + " successfully!",
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed");
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
    <DashboardLayout>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 py-3 gap-4 overflow-hidden">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
            <Shield className="text-cyan-600" size={26} />
            Admin Management
          </h1>
          <p className="text-gray-500 text-sm">
            Manage administrator accounts for your department
          </p>
        </div>

        <div className="bg-white text-blue-600 border border-blue-300  rounded-lg px-4 py-2 flex items-center gap-2">
          <Users size={16} className="text-blue-800" />
          {admins.length} Admins
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">
          Loading admins...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-blue-200 p-6 shadow-lg h-fit">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-blue-600">
              {editingId ? <Edit3 size={18} /> : <UserPlus size={18} />}
              {editingId ? "Edit Admin" : "Add New Admin"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-cyan-700 mb-1">
                  Full Name *
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g., John Doe"
                  className="w-full border border-blue-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cyan-700 mb-1">
                  Email Address *
                </label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="e.g., admin@company.com"
                  className="w-full border border-blue-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                  required
                />
              </div>

              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-cyan-700 mb-1">
                    Password *
                  </label>
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter secure password"
                    className="w-full border border-blue-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-cyan-700 mb-1">
                  Department *
                </label>
                <select
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  className="w-full border border-blue-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
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

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium transition"
              >
                {editingId ? "Update Admin" : "Create Admin"}
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
                      department: "",
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
            <div className="bg-white border border-blue-200 rounded-2xl p-4 flex items-center gap-2 overflow-hidden">
              <Search size={18} className="text-blue-400" />
              <input
                type="text"
                placeholder="Search admins by name, email, or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 outline-none"
              />
            </div>

            <div className="bg-white border border-blue-200 rounded-2xl overflow-hidden">
              <div className="overflow-auto ">
                <table className="w-full text-sm md:text-md min-w-[600px]">
                  <thead className="border-b border-blue-300 bg-blue-50 sticky top-0 z-10">
                    <tr>
                      <th className="p-3 text-left">Admin</th>
                      <th className="p-3 text-left hidden sm:table-cell">
                        Email
                      </th>
                      <th className="p-3 text-left hidden md:table-cell">
                        Department
                      </th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredAdmins.length > 0 ? (
                      filteredAdmins.map((admin) => (
                        <tr
                          key={admin._id}
                          className="border-b border-blue-200 hover:bg-blue-50"
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                                {admin.name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium">
                                  {admin.name}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="p-3 hidden sm:table-cell">
                            <div className="flex items-center gap-1 text-gray-600">
                              <Mail size={14} />
                              <span>{admin.email}</span>
                            </div>
                          </td>

                          <td className="p-3 hidden md:table-cell">
                            <div className="flex items-center gap-1">
                              <Building2
                                size={14}
                                className="text-gray-500"
                              />
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                {admin.department?.name || "N/A"}
                              </span>
                            </div>
                          </td>

                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-3">
                              <button
                                onClick={() => setChatUser(admin)}
                                className="text-blue-600 hover:text-blue-800 transition"
                                title="Chat with Admin"
                              >
                                <MessageCircle size={16} />
                              </button>

                              <button
                                onClick={() => startEdit(admin)}
                                className="text-green-600 hover:text-green-800 transition"
                                title="Edit Admin"
                              >
                                <Edit3 size={16} />
                              </button>

                              <button
                                onClick={() => deleteAdmin(admin._id)}
                                className="text-red-500 hover:text-red-700 transition"
                                title="Delete Admin"
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
                          No Admins Found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Chat Window */}
      {chatUser && (
        <ChatWindow user={chatUser} onClose={() => setChatUser(null)} />
      )}
    </DashboardLayout>
  );
}
 