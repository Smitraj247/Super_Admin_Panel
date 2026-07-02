"use client";

import { useState, useEffect } from "react";
import { Shield, PlusCircle, Trash2, Edit3 } from "lucide-react";
import { toast } from "react-toastify";
import { ProtectedDashboardRoute } from "@/components/auth/ProtectedDashboardRoute";
import { ROLES } from "@/utils/constants";
import {
  getRolesApi,
  createRoleApi,
  updateRoleApi,
  deleteRoleApi,
} from "../../../services/superAdminApi";

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [roleName, setRoleName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

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

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleAddRole = async () => {
    if (!roleName.trim()) return;

    setSubmitting(true);
    try {
      await createRoleApi({ name: roleName.trim() });
      setRoleName("");
      fetchRoles();
    } catch (error) {
      console.error("Failed to create role:", error);
      toast.error("Failed to create role");
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
      toast.error("Failed to update role");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (id) => {
    if (!confirm("Are you sure you want to delete this role?")) return;

    try {
      await deleteRoleApi(id);
      fetchRoles();
    } catch (error) {
      console.error("Failed to delete role:", error);
      toast.error("Failed to delete role");
    }
  };

  const startEditing = (role) => {
    setEditingId(role._id);
    setEditName(role.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
  };

  return (
    <ProtectedDashboardRoute requiredRole={ROLES.SUPER_ADMIN}>
      <div className="p-8">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                  <Shield className="text-indigo-600" size={30} />
                  Roles Management
                </h1>
                <p className="text-[var(--text-secondary)] mt-1">
                  Manage system roles and permissions.
                </p>
              </div>

              <div className="bg-[var(--bg-surface)] border border-[var(--border)] px-4 py-2 rounded-xl shadow-sm text-sm font-bold text-indigo-600">
                {roles.length} Roles
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <div className="bg-[var(--bg-surface)] p-8 rounded-[2rem] border border-[var(--border)] shadow-sm">
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                    <PlusCircle className="text-indigo-600" size={20} />
                    Add Role
                  </h3>

                  <input
                    type="text"
                    placeholder="Enter role name"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    className="w-full p-3 border border-[var(--border)] rounded-xl bg-[var(--bg-elevated)] outline-none"
                  />

                  <button
                    onClick={handleAddRole}
                    disabled={submitting || !roleName.trim()}
                    className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Creating..." : "Create Role"}
                  </button>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-[var(--bg-surface)] rounded-[2rem] border border-[var(--border)] shadow-sm overflow-x-auto">
                  {loading ? (
                    <div className="p-8 text-center text-[var(--text-secondary)]">
                      Loading roles...
                    </div>
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-[var(--bg-elevated)]">
                          <th className="p-5 text-xs font-bold text-slate-400 uppercase">
                            Role Name
                          </th>
                          <th className="p-5 text-xs font-bold text-slate-400 uppercase text-right">
                            Actions
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y">
                        {roles.map((role) => (
                          <tr
                            key={role._id}
                            className="hover:bg-[var(--bg-elevated)]"
                          >
                            <td className="p-5 font-semibold text-[var(--text-primary)]">
                              {editingId === role._id ? (
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="w-full p-2 border border-[var(--border)] rounded-lg outline-none"
                                  autoFocus
                                />
                              ) : (
                                role.name
                              )}
                            </td>

                            <td className="p-5 text-right">
                              <div className="flex justify-end gap-2">
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
                                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                    >
                                      <Edit3 size={18} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteRole(role._id)}
                                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
    </ProtectedDashboardRoute>
  );
}
