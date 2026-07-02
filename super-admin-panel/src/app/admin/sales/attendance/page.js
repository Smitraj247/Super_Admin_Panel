"use client";

import { useEffect, useState } from "react";
import { getMonthlyAttendanceApi } from "@/services/attandanceApi";
import { toast } from "react-toastify";

export default function Attendance() {
  const [attendance, setAttendance] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCurrentMonth();
  }, []);

  const fetchCurrentMonth = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const lastDayNum = new Date(y, now.getMonth() + 1, 0).getDate();
      const firstDay = `${y}-${m}-01`;
      const lastDay = `${y}-${m}-${String(lastDayNum).padStart(2, "0")}`;

      const res = await getMonthlyAttendanceApi(firstDay, lastDay);
      setAttendance(res.data);
      setStartDate(firstDay);
      setEndDate(lastDay);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = async () => {
    if (!startDate || !endDate) {
      toast.error("Select both dates");
      return;
    }
    setLoading(true);
    try {
      const res = await getMonthlyAttendanceApi(startDate, endDate);
      setAttendance(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-10">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border p-2 rounded w-full md:w-auto"
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border p-2 rounded w-full md:w-auto"
            />

            <button
              onClick={handleFilter}
              className="bg-green-500 text-white px-4 py-2 rounded"
              disabled={loading}
            >
              {loading ? "Loading..." : "Filter"}
            </button>

            <button
              onClick={fetchCurrentMonth}
              className="bg-blue-500 text-white px-4 py-2 rounded"
              disabled={loading}
            >
              Reset
            </button>
          </div>

          <h2 className="text-xl md:text-2xl font-semibold mb-4">
            Monthly Attendance
          </h2>

          {/* Table Wrapper (IMPORTANT for mobile) */}
          <div className="overflow-x-auto bg-white rounded shadow">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Check In</th>
                  <th className="p-3 text-left">Check Out</th>
                </tr>
              </thead>

              <tbody>
                {attendance.length > 0 ? (
                  attendance.map((item) => (
                    <tr key={item._id} className="border-t">
                      <td className="p-3">
                        {new Date(item.date).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        {item.checkIn
                          ? new Date(item.checkIn).toLocaleTimeString()
                          : "-"}
                      </td>
                      <td className="p-3">
                        {item.checkOut
                          ? new Date(item.checkOut).toLocaleTimeString()
                          : "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="text-center p-4 text-gray-500">
                      No data found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
    </div>
  );
}
