"use client";

import { useState, useEffect } from "react";
import { PlusCircle, Trash2, Edit3, Building2 } from "lucide-react";
import { toast } from "react-toastify";
import { ProtectedDashboardRoute } from "@/components/auth/ProtectedDashboardRoute";
import { ROLES } from "@/utils/constants";
import {
  getDepartmentsApi,
  createDepartmentApi,
  updateDepartmentApi,
  deleteDepartmentApi,
} from "../../../services/superAdminApi";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [departmentName, setDepartmentName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await getDepartmentsApi();
      setDepartments(response.data);
    } catch (error) {
      console.error("Failed to fetch departments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDepartment = async () => {
    if (!departmentName.trim()) return;

    setSubmitting(true);
    try {
      await createDepartmentApi({ name: departmentName.trim() });
      setDepartmentName("");
      fetchDepartments();
    } catch (error) {
      console.error("Failed to create department:", error);
      toast.error("Failed to create department");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditDepartment = async (id) => {
    if (!editName.trim()) return;

    setSubmitting(true);
    try {
      await updateDepartmentApi(id, { name: editName.trim() });
      setEditingId(null);
      setEditName("");
      fetchDepartments();
    } catch (error) {
      console.error("Failed to update department:", error);
      toast.error("Failed to update department");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDepartment = async (id) => {
    if (!confirm("Are you sure you want to delete this department?")) return;

    try {
      await deleteDepartmentApi(id);
      fetchDepartments();
    } catch (error) {
      console.error("Failed to delete department:", error);
      toast.error("Failed to delete department");
    }
  };

  const startEditing = (department) => {
    setEditingId(department._id);
    setEditName(department.name);
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
                <h1 className="text-3xl font-bold text-[var(--text-primary)] flex  gap-3">
                  <Building2 className="text-indigo-600" size={30} />
                  Departments Management
                </h1>
                <p className="mt-2 text-[var(--text-secondary)]">
                  Manage your organization's departments
                </p>
              </div>

              <div className="bg-[var(--bg-surface)] border border-[var(--border)] px-4 py-2 rounded-xl shadow-sm text-sm font-bold text-indigo-600">
                {departments.length} Department
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <div className="bg-[var(--bg-surface)] p-4 rounded-[2rem] border border-[var(--border)] shadow-sm">
                  <h3 className=" flex items-center gap-2 text-xl font-bold text-[var(--text-primary)] ">
                    <PlusCircle className=" text-indigo-600" />
                    Add Department
                  </h3>

                  <input
                    type="text"
                    placeholder="Enter department name"
                    value={departmentName}
                    onChange={(e) => setDepartmentName(e.target.value)}
                    className="w-full rounded-xl p-3 bg-[var(--bg-elevated)]  border border-[var(--border)] mt-6 outline-none hover:bg-[var(--bg-elevated)] "
                  />

                  <button
                    onClick={handleAddDepartment}
                    disabled={submitting || !departmentName.trim()}
                    className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Creating..." : "Create Department"}
                  </button>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-[var(--bg-surface)] rounded-[2rem] border border-[var(--border)] shadow-sm overflow-x-auto">
                  {loading ? (
                    <div className="p-8 text-center text-[var(--text-secondary)]">
                      Loading departments...
                    </div>
                  ) : (
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-[var(--bg-elevated)]">
                          <th className="p-5 text-xs text-[var(--text-secondary)] font-bold uppercase">
                            DEPARTMENT NAME
                          </th>
                          <th className="p-5 text-xs text-[var(--text-secondary)] font-bold uppercase text-right">
                            ACTIONS
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y">
                        {departments.map((department) => (
                          <tr
                            key={department._id}
                            className="hover:bg-[var(--bg-elevated)]"
                          >
                            <td className="p-5 font-semibold text-[var(--text-primary)]">
                              {editingId === department._id ? (
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="w-full p-2 border border-[var(--border)] rounded-lg outline-none"
                                  autoFocus
                                />
                              ) : (
                                department.name
                              )}
                            </td>

                            <td className="p-5 text-right">
                              <div className="flex justify-end gap-2">
                                {editingId === department._id ? (
                                  <>
                                    <button
                                      onClick={() =>
                                        handleEditDepartment(department._id)
                                      }
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
                                      onClick={() => startEditing(department)}
                                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                    >
                                      <Edit3 size={18} />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteDepartment(department._id)
                                      }
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
