"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { Building2, PlusCircle, Edit3, Trash2 } from "lucide-react";
import {
  getDepartmentsApi,
  createDepartmentApi,
  updateDepartmentApi,
  deleteDepartmentApi,
} from "@/services/adminApi";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [departmentInput, setDepartmentInput] = useState("");
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
    if (!departmentInput.trim()) return;

    setSubmitting(true);
    try {
      await createDepartmentApi({ name: departmentInput.trim() });
      setDepartmentInput("");
      fetchDepartments();
    } catch (error) {
      console.error("Failed to create department:", error);
      alert("Failed to create department");
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
      alert("Failed to update department");
    } finally {
      setSubmitting(false);
    }
  };

  /*
  const handleDeleteDepartment = async (id) => {
    if (!confirm("Are you sure you want to delete this department?")) return;

    try {
      await deleteDepartmentApi(id);
      fetchDepartments(); 
    } catch (error) {
      console.error("Failed to delete department:", error);
      alert("Failed to delete department");
    }
  };
  */

  const startEditing = (department) => {
    setEditingId(department._id);
    setEditName(department.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleDelete = (index) => {
    const updated = departments.filter((_, i) => i !== index);
    setDepartments(updated);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      <Sidebar />
      <Navbar />

      <main className="md:pl-64 pt-16">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2 text-green-900">
                <Building2 className="text-green-600" size={28} />
                Manage Departments
              </h1>
              <p className="text-green-600 text-sm ">
                Create and manage company departments
              </p>
            </div>

            <div className="bg-white  border rounded-lg px-4 py-2 text-sm flex items-center gap-2">
              <Building2 size={16} className="text-green-600" />
              {departments.length} Departments
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 h-fit">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-green-900">
                <PlusCircle size={18} />
                Add Department
              </h3>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Department Name"
                  value={departmentInput}
                  onChange={(e) => setDepartmentInput(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                />

                <button
                  onClick={handleAddDepartment}
                  disabled={submitting || !departmentInput.trim()}
                  className="w-full bg-green-600 text-white py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Adding..." : "Add Department"}
                </button>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-md">
                  <thead className="border-b border-slate-200">
                    <tr>
                      <th className="p-4 text-left text-green-900">Department</th>
                      <th className="p-4 text-right text-green-900">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {departments.length > 0 ? (
                      departments.map((department) => (
                        <tr
                          key={department._id}
                          className="border-b border-slate-200 hover:bg-green-50"
                        >
                          <td className="p-4">
                            {editingId === department._id ? (
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-full p-2 border border-slate-200 rounded-lg outline-none"
                                autoFocus
                              />
                            ) : (
                              department.name
                            )}
                          </td>

                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-3">
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
                                    className="px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-green-700"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEditing(department)}
                                    className="text-green-600 hover:text-green-800"
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
                          No Departments Found
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
