"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  getHolidaysApi,
  updateHolidayApi,
  deleteHolidayApi,
} from "../../../../services/holidayApi";

export default function HolidayPage() {
  const [holidays, setHolidays] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: "",
    date: "",
    type: "festival",
    description: "",
  });

  const fetchHolidays = async () => {
    try {
      const res = await getHolidaysApi();
      setHolidays(res.data);
    } catch (error) {
      console.error("Error fetching holidays", error);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

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

    try {
      await updateHolidayApi(editingId, editForm);

      setEditingId(null);

      setEditForm({
        title: "",
        date: "",
        type: "festival",
        description: "",
      });

      fetchHolidays();
    } catch (error) {
      console.error("Error updating holiday", error);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this holiday?")) {
      await deleteHolidayApi(id);
      fetchHolidays();
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-xl sm:text-3xl font-bold mb-6">
        <span className=" bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
          Holiday Management
        </span>
      </h1>

      {editingId && (
        <form
          onSubmit={handleUpdate}
          className="bg-green-50 p-6 rounded-xl mb-8 border-l-4 border-green-400"
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
              placeholder="Description"
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
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-md border border-blue-200 shadow-sm p-3">
        <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
          Holiday List
        </h2>

        {holidays.length === 0 ? (
          <p className="text-gray-500">No holidays found.</p>
        ) : (
          <div className="space-y-3">
            {holidays.map((h) => (
              <div
                key={h._id}
                className="flex justify-between items-center border border-blue-100 py-3 px-4 rounded-lg transition-all duration-300 hover:border-blue-300 hover:bg-gradient-to-r hover:from-cyan-100 hover:via-blue-100 hover:to-purple-100 hover:shadow-md"
              >
                <div>
                  <h3 className="font-medium text-blue-600">{h.title}</h3>

                  <p className="text-sm text-gray-600">
                    {new Date(h.date).toDateString()}
                  </p>

                  <p className="text-xs text-gray-500 capitalize">{h.type}</p>
                </div>

                <div className="space-x-2">
                  <button
                    onClick={() => handleEdit(h)}
                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 transition"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDelete(h._id)}
                    className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
