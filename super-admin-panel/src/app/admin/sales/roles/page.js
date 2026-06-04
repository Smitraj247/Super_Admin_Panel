"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { Shield, Edit3, PlusCircle, Trash2 } from "lucide-react";
import {
  getRolesApi,
  createRoleApi,
  updateRoleApi,
  deleteRoleApi,
} from "@/services/adminApi";

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [roleInput, setRoleInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await getRolesApi();
      setRoles(response.data);
    } catch (error) {
      console.error("Failed to fetch roles:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!roleInput.trim()) return;

    setSubmitting(true);
    try {
      await createRoleApi({ name: roleInput.trim() });
      setRoleInput("");
      fetchRoles(); // Refresh the list
    } catch (error) {
      console.error("Failed to create role:", error);
      alert("Failed to create role");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditRole = async (id) => {
    if (!editName.trim()) return;

    setSubmitting(true);
    try {
      await updateRoleApi(id, { name: editName.trim() });
      setEditingId(null);
      setEditName("");
      fetchRoles();
    } catch (error) {
      console.error("Failed to update role:", error);
      alert("Failed to update role");
    } finally {
      setSubmitting(false);
    }
  };

  /* const handleDeleteRole = async (id) => {
    if (!confirm("Are you sure you want to delete this role?")) return;

    try {
      await deleteRoleApi(id);
      fetchRoles(); 
    } catch (error) {
      console.error("Failed to delete role:", error);
      alert("Failed to delete role");
    }
  };
*/
  const startEditing = (role) => {
    setEditingId(role._id);
    setEditName(role.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
  };

  return (
    <div className="min-h-screen">
      <Sidebar />
      <Navbar />

      <main className="md:pl-64 pt-16">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Shield className="text-indigo-600" size={28} />
                Manage Roles
              </h1>
              <p className="text-gray-500 text-sm">
                Create and manage system roles
              </p>
            </div>

            <div className="bg-white rounded-lg border px-4 py-2 text-sm flex items-center gap-2">
              <Shield size={16} />
              {roles.length} Roles
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 h-fit">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <PlusCircle size={18} />
                Add Role
              </h3>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Role Name"
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />

                <button
                  onClick={handleAddRole}
                  disabled={submitting || !roleInput.trim()}
                  className="w-full bg-indigo-600 text-white py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Adding..." : "Add Role"}
                </button>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                {loading ? (
                  <div className="p-8 text-center text-slate-500">
                    Loading roles...
                  </div>
                ) : (
                  <table className="w-full text-md">
                    <thead className="border-b border-slate-200">
                      <tr>
                        <th className="p-4 text-left">Role</th>
                        <th className="p-4 text-right">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {roles.length > 0 ? (
                        roles.map((role) => (
                          <tr
                            key={role._id}
                            className="border-b border-slate-200 hover:bg-gray-50"
                          >
                            <td className="p-4">
                              {editingId === role._id ? (
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                                  autoFocus
                                />
                              ) : (
                                role.name
                              )}
                            </td>

                            <td className="p-4 text-right">
                              <div className="flex justify-end gap-3">
                                {editingId === role._id ? (
                                  <>
                                    <button
                                      onClick={() => handleEditRole(role._id)}
                                      disabled={submitting}
                                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={cancelEditing}
                                      className="px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => startEditing(role)}
                                      className="text-indigo-600 hover:text-indigo-800"
                                    >
                                      <Edit3 size={16} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="2"
                            className="p-10 text-center text-gray-400"
                          >
                            No Roles Found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
