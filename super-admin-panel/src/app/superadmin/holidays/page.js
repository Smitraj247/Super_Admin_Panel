"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { ProtectedDashboardRoute } from "@/components/auth/ProtectedDashboardRoute";
import { ROLES } from "@/utils/constants";
import {
  getHolidaysApi,
  addHolidayApi,
  updateHolidayApi,
  deleteHolidayApi,
} from "../../../services/holidayApi";

export default function HolidayPage() {
  const [holidays, setHolidays] = useState([]);
  const [form, setForm] = useState({
    title: "",
    date: "",
    type: "festival",
    description: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    date: "",
    type: "festival",
    description: "",
  });

  const fetchHolidays = async () => {
    const res = await getHolidaysApi();
    setHolidays(res.data);
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await addHolidayApi(form);
    setForm({ title: "", date: "", type: "festival", description: "" });
    fetchHolidays();
  };

  const handleEdit = (holiday) => {
    setEditingId(holiday._id);
    setEditForm({
      title: holiday.title,
      date: holiday.date.split("T")[0],
      type: holiday.type,
      description: holiday.description || "",
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    await updateHolidayApi(editingId, editForm);
    setEditingId(null);
    setEditForm({ title: "", date: "", type: "festival", description: "" });
    fetchHolidays();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this holiday?")) {
      await deleteHolidayApi(id);
      fetchHolidays();
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ title: "", date: "", type: "festival", description: "" });
  };

  return (
    <ProtectedDashboardRoute requiredRole={ROLES.SUPER_ADMIN}>
      <div className="min-h-screen bg-[var(--bg-base)]">
        <Sidebar />
        <Navbar />

        <main className="md:ml-64 pt-20 p-8">
          <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
            Holiday Management
          </h1>

          <form
            onSubmit={handleSubmit}
            className="bg-[var(--bg-surface)] p-6 rounded-xl mb-8 border border-[var(--border)]"
          >
            <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
              Add New Holiday
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <input
                placeholder="Holiday Title"
                className="border p-2 rounded"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />

              <input
                type="date"
                className="border p-2 rounded"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />

              <select
                className="border p-2 rounded"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="festival">Festival</option>
                <option value="national">National</option>
                <option value="company">Company</option>
              </select>

              <input
                placeholder="Description (optional)"
                className="border p-2 rounded"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded mt-4 hover:bg-indigo-700">
              Add Holiday
            </button>
          </form>

          {editingId && (
            <form
              onSubmit={handleUpdate}
              className="bg-yellow-50 p-6 rounded-xl mb-8 border-l-4 border-yellow-400"
            >
              <h2 className="text-xl font-semibold mb-4">Edit Holiday</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <input
                  placeholder="Holiday Title"
                  className="border p-2 rounded"
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                  required
                />

                <input
                  type="date"
                  className="border p-2 rounded"
                  value={editForm.date}
                  onChange={(e) =>
                    setEditForm({ ...editForm, date: e.target.value })
                  }
                  required
                />

                <select
                  className="border p-2 rounded"
                  value={editForm.type}
                  onChange={(e) =>
                    setEditForm({ ...editForm, type: e.target.value })
                  }
                >
                  <option value="festival">Festival</option>
                  <option value="national">National</option>
                  <option value="company">Company</option>
                </select>

                <input
                  placeholder="Description (optional)"
                  className="border p-2 rounded"
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                />
              </div>
              <div className="mt-4 space-x-2">
                <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                  Update Holiday
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="bg-[var(--bg-surface)] rounded-xl shadow-sm overflow-hidden border border-[var(--border)]">
            <table className="w-full text-left">
              <thead className="bg-[var(--bg-elevated)] border-b">
                <tr>
                  <th className="p-4 font-bold text-[var(--text-primary)]">TITLE</th>
                  <th className="p-4 font-bold text-[var(--text-primary)]">DATE</th>
                  <th className="p-4 font-bold text-[var(--text-primary)]">TYPE</th>
                  <th className="p-4 font-bold text-[var(--text-primary)]">DESCRIPTION</th>
                  <th className="p-4 font-bold text-[var(--text-primary)] text-right">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {holidays.map((holiday) => (
                  <tr
                    key={holiday._id}
                    className="hover:bg-[var(--bg-elevated)] transition"
                  >
                    <td className="p-4 font-medium">{holiday.title}</td>
                    <td className="p-4">
                      {new Date(holiday.date).toLocaleDateString()}
                    </td>
                    <td className="p-4 uppercase text-xs font-bold">
                      <span
                        className={`px-2 py-1 rounded ${
                          holiday.type === "national"
                            ? "bg-red-100 text-red-600"
                            : holiday.type === "festival"
                              ? "bg-indigo-100 text-indigo-600"
                              : "bg-green-100 text-green-600"
                        }`}
                      >
                        {holiday.type}
                      </span>
                    </td>
                    <td className="p-4 text-[var(--text-secondary)] text-sm">
                      {holiday.description || "-"}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleEdit(holiday)}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(holiday._id)}
                        className="text-rose-600 hover:text-rose-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </ProtectedDashboardRoute>
  );
}

