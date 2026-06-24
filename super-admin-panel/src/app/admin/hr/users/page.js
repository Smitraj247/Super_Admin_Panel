"use client";

import { useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/layout/Navbar";
import API from "@/lib/api";
import ChatWindow from "@/components/ui/ChatWindow";
import { useRealtime } from "@/hooks/useRealtime";
import {
  User,
  UserPlus,
  Edit3,
  Trash2,
  Search,
  UserCircle,
  MessageCircle,
} from "lucide-react";
import { toast } from "react-toastify";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "USER",
    department: "",
    birthday: "",
    sidebarPermissions: [],
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Chat state
  const [chatUser, setChatUser] = useState(null);

  // Set up real-time event listeners
  const eventHandlers = useMemo(
    () => ({
      "user:deleted": () => fetchData(),
      "user:created": () => fetchData(),
      "user:updated": () => fetchData(),
    }),
    [],
  );

  useRealtime(eventHandlers);

  // Get selected department name
  const selectedDepartment = departments.find(
    (dept) => dept._id === form.department,
  );
  const deptName = selectedDepartment?.name?.toLowerCase() || "";

  // Available sidebar options for users (dynamically based on department)
  const getAvailableSidebarOptions = () => {
    const baseOptions = [
      "Dashboard",
      "Profile",
      "Chats",
      "Attendance",
      "Apply Leave",
    ];

    // Add sales-specific options
    if (deptName === "sales") {
      return [
        ...baseOptions,
        "Leads",
        "Emails",
        "Meetings",
        "Followups",
        "Reports",
      ];
    }

    // Add other department options if needed
    if (deptName === "it") {
      return [...baseOptions, "Help Desk", "Network Monitor", "Projects"];
    }

    return baseOptions;
  };

  const availableSidebarOptions = getAvailableSidebarOptions();

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
        API.get("/admin/users"),
        API.get("/admin/departments"),
      ]);
      setUsers(usersRes.data);
      setDepartments(deptsRes.data);
    } catch (err) {
      console.error(err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Auto-select sidebar permissions when department is selected
    if (name === "department") {
      const selectedDept = departments.find((dept) => dept._id === value);
      const deptName = selectedDept?.name?.toLowerCase() || "";

      if (deptName === "sales") {
        setForm({
          ...form,
          [name]: value,
          sidebarPermissions: [
            "Dashboard",
            "Profile",
            "Leads",
            "Reports",
            "Emails",
            "Meetings",
            "Apply Leave",
            "Attendance",
          ],
        });
      } else if (deptName === "it") {
        setForm({
          ...form,
          [name]: value,
          sidebarPermissions: [
            "Dashboard",
            "Profile",
            "Help Desk",
            "Network Monitor",
            "Projects",
            "Apply Leave",
            "Attendance",
          ],
        });
      } else {
        setForm({
          ...form,
          [name]: value,
          sidebarPermissions: [
            "Dashboard",
            "Profile",
            "Chats",
            "Apply Leave",
            "Attendance",
          ],
        });
      }
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.department) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      if (editingId) {
        const res = await API.put(`/admin/users/${editingId}`, form);
        setUsers(users.map((u) => (u._id === editingId ? res.data : u)));
        setEditingId(null);
      } else {
        const res = await API.post("/admin/users", {
          ...form,
          password: "123456",
        });
        setUsers([...users, res.data]);
      }

      setForm({
        name: "",
        email: "",
        role: "USER",
        department: "",
        birthday: "",
        sidebarPermissions: [],
      });
    } catch (err) {
      console.error(err.response?.data);
      toast.error("Operation failed");
    }
  };

  const startEdit = (user) => {
    setEditingId(user._id);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role?.name || "USER",
      department: user.department?._id || "",
      sidebarPermissions: user.sidebarPermissions || [],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  const filteredUsers = users.filter(
    (user) =>
      (user.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (user.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (user.department?.name || "")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen">
      <Sidebar />
      <Navbar />

      <main className="md:pl-64 pt-16">
        <div className="p-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 py-3 gap-4 overflow-hidden">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                <User size={24} className="text-cyan-600" />
                User Directory
              </h1>
              <p className="text-cyan-600 text-sm ">
                Manage user accounts and departments
              </p>
            </div>
            <div className="bg-white border rounded-lg px-4 py-2 flex items-center gap-2">
              <UserCircle size={16} />
              {users.length} Users
            </div>
          </div>

          <div className="grid grid-cols-1  md:grid-cols-3 gap-6">
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl border border-blue-200 p-6 shadow-lg h-fit">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-blue-600">
                {editingId ? <Edit3 size={18} /> : <UserPlus size={18} />}
                {editingId ? "Edit User" : "Add User"}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium  mb-1 text-cyan-600">
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
                  <label className="block text-sm font-medium text-cyan-600 mb-1">
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
                    <label className="block text-sm font-medium text-cyan-600 mb-1">
                      Password *
                    </label>
                    <input
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Enter secure password"
                      className="w-full border border-blue-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-cyan-600 mb-1">
                    Department *
                  </label>
                  <select
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    className="w-full border border-blue-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                    required
                  >
                    <option value=""> -- Select Department --</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sidebar Permissions */}
                <div className="border border-blue-300 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-cyan-700 mb-3">
                    Sidebar Permissions
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availableSidebarOptions.map((option) => (
                      <label
                        key={option}
                        className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={form.sidebarPermissions.includes(option)}
                          onChange={() => handlePermissionToggle(option)}
                          className="w-4 h-4 text-cyan-600 rounded focus:ring-2 focus:ring-cyan-600"
                        />
                        <span className="text-sm text-cyan-700">{option}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-cyan-600 mt-2">
                    {form.sidebarPermissions.length === 0
                      ? "No permissions selected - user will see all options"
                      : `${form.sidebarPermissions.length} permission(s) selected`}
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium transition"
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
                        department: "",
                        sidebarPermissions: [],
                      });
                    }}
                    className="w-full text-sm text-blue-500 hover:text-blue-700"
                  >
                    Cancel
                  </button>
                )}
              </form>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white border border-blue-200 rounded-2xl p-4 flex items-center gap-2">
                <Search size={18} className="text-blue-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 outline-none"
                />
              </div>

              <div className="bg-white border border-blue-300 rounded-2xl overflow-hidden">
                <div className="w-full text-sm md:text-md min-w-[600px]">
                  <table className="w-full text-sm  ">
                    <thead className="border-b border-blue-500 bg-blue-100 sticky top-0 z-10">
                      <tr>
                        <th className="p-3 text-left">User</th>

                        <th className="p-3 text-left hidden sm:table-cell">
                          Department
                        </th>

                        <th className="p-3 text-left hidden md:table-cell">
                          Role
                        </th>

                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map((user) => (
                          <tr
                            key={user._id}
                            className="border-b border-blue-200 hover:bg-blue-50"
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                                  {user.name?.charAt(0).toUpperCase()}
                                </div>

                                <div>
                                  <div className="font-medium">{user.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {user.email}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="p-3 hidden sm:table-cell">
                              {user.department?.name || "Member"}
                            </td>

                            <td className="p-3 hidden md:table-cell">
                              <span className="px-2 py-1 bg-blue-100 rounded-full text-xs">
                                {user.role?.name || "User"}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="p-3 text-right">
                              <div className="flex justify-end gap-3">
                                <button
                                  onClick={() => setChatUser(user)}
                                  className="text-green-600 hover:text-cyan-800"
                                  title="Chat with user"
                                >
                                  <MessageCircle size={16} />
                                </button>

                                <button
                                  onClick={() => startEdit(user)}
                                  className="text-blue-600 hover:text-cyan-600"
                                >
                                  <Edit3 size={16} />
                                </button>

                                <button
                                  onClick={() => deleteUser(user._id)}
                                  className="text-red-500 hover:text-red-700"
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
                            className="p-10 text-center text-cyan-400"
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
        </div>
      </main>

      {/* Chat Window */}
      {chatUser && (
        <ChatWindow user={chatUser} onClose={() => setChatUser(null)} />
      )}
    </div>
  );
}
