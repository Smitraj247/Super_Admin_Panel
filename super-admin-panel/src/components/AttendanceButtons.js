"use client";

import { useEffect, useState } from "react";
import { Clock, LogOut, Coffee, LogIn } from "lucide-react";
import {
  getTodayStatusApi,
  checkInApi,
  breakInApi,
  breakOutApi,
  checkOutApi,
  getAttendanceApi,
} from "../services/attandanceApi.js";

export default function AttendanceButtons({ userId }) {
  const [attendance, setAttendance] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const fetchStatus = async () => {
    try {
      const res = await getTodayStatusApi();
      setAttendance(res.data);
    } catch (error) {
      console.error("Error fetching status:", error);
    }
  };

  const fetchAttendanceHistory = async () => {
    try {
      const res = await getAttendanceApi(selectedDate);
      setAttendanceHistory(res.data);
    } catch (error) {
      console.error("Error fetching attendance history:", error);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchAttendanceHistory();
  }, [selectedDate]);

  const handleAction = async (type) => {
    try {
      setLoading(true);
      setMessage("");

      const payload = {};

      let response;
      if (type === "checkIn") response = await checkInApi(payload);
      if (type === "breakIn") response = await breakInApi(payload);
      if (type === "breakOut") response = await breakOutApi(payload);
      if (type === "checkOut") response = await checkOutApi(payload);

      setMessage(response.data.message);
      setMessageType("success");

      await fetchStatus();
      await fetchAttendanceHistory();

      setTimeout(() => {
        setMessage("");
      }, 1500);
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Action failed";
      setMessage(errorMsg);
      setMessageType("error");
      console.error("Action error:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const calculateBreakTime = (breaks) => {
    if (!breaks || breaks.length === 0) return "0:00";
    let totalBreakMinutes = 0;
    breaks.forEach((breakRecord) => {
      if (breakRecord.breakIn && breakRecord.breakOut) {
        const breakLength =
          new Date(breakRecord.breakOut) - new Date(breakRecord.breakIn);
        totalBreakMinutes += breakLength / (1000 * 60);
      }
    });
    const hours = Math.floor(totalBreakMinutes / 60);
    const minutes = Math.floor(totalBreakMinutes % 60);
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  };

  const calculateWorkingHours = (checkIn, checkOut, breaks) => {
    if (!checkIn || !checkOut) return "-";
    const totalTime = new Date(checkOut) - new Date(checkIn);
    let breakTime = 0;
    if (breaks && breaks.length > 0) {
      breaks.forEach((breakRecord) => {
        if (breakRecord.breakIn && breakRecord.breakOut) {
          breakTime +=
            new Date(breakRecord.breakOut) - new Date(breakRecord.breakIn);
        }
      });
    }
    const workingMinutes = (totalTime - breakTime) / (1000 * 60);
    const hours = Math.floor(workingMinutes / 60);
    const minutes = Math.floor(workingMinutes % 60);
    return `${hours} hrs ${minutes} mins`;
  };

  if (!attendance) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">
          Attendance Tracking
        </h2>
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg font-semibold ${
              messageType === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {message}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <button
            disabled={loading}
            onClick={() => handleAction("checkIn")}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <LogIn size={20} />
            Check In
          </button>
          <button
            disabled={true}
            className="bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 cursor-not-allowed"
          >
            <Coffee size={20} />
            Break In
          </button>
          <button
            disabled={true}
            className="bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 cursor-not-allowed"
          >
            <LogOut size={20} />
            Check Out
          </button>
          <button
            disabled={true}
            className="bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 cursor-not-allowed"
          >
            <Clock size={20} />
            Break Out
          </button>
        </div>
      </div>
    );
  }

  const status = attendance.status;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Attendance Tracking
          </h2>
          <span
            className={`px-4 py-2 rounded-full font-semibold text-sm ${
              status === "CHECKED_IN"
                ? "bg-blue-100 text-blue-800"
                : status === "ON_BREAK"
                  ? "bg-yellow-100 text-yellow-800"
                  : status === "BACK_TO_WORK"
                    ? "bg-purple-100 text-purple-800"
                    : status === "CHECKED_OUT"
                      ? "bg-green-100 text-green-800"
                      : status === "LATE"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-gray-100 text-gray-800"
            }`}
          >
            {status === "CHECKED_IN"
              ? "Checked In"
              : status === "ON_BREAK"
                ? "On Break"
                : status === "BACK_TO_WORK"
                  ? "Back to Work"
                  : status === "CHECKED_OUT"
                    ? "Checked Out"
                    : status === "LATE"
                      ? "Late Check In"
                      : status}
          </span>
        </div>
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg font-semibold ${
              messageType === "success"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {message}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <button
            disabled={loading || status !== "NOT_CHECKED_IN"}
            onClick={() => handleAction("checkIn")}
            className={`px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
              loading || status !== "NOT_CHECKED_IN"
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600 text-white cursor-pointer"
            }`}
          >
            <LogIn size={20} />
            Check In
          </button>
          <button
            disabled={
              loading || !["CHECKED_IN", "BACK_TO_WORK", "LATE"].includes(status)
            }
            onClick={() => handleAction("breakIn")}
            className={`px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
              loading || !["CHECKED_IN", "BACK_TO_WORK", "LATE"].includes(status)
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-yellow-500 hover:bg-yellow-600 text-white cursor-pointer"
            }`}
          >
            <Coffee size={20} />
            Break In
          </button>
          <button
            disabled={
              loading || !["CHECKED_IN", "BACK_TO_WORK", "LATE"].includes(status)
            }
            onClick={() => handleAction("checkOut")}
            className={`px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
              loading || !["CHECKED_IN", "BACK_TO_WORK", "LATE"].includes(status)
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-red-500 hover:bg-red-600 text-white cursor-pointer"
            }`}
          >
            <LogOut size={20} />
            Check Out
          </button>
          <button
            disabled={loading || status !== "ON_BREAK"}
            onClick={() => handleAction("breakOut")}
            className={`px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
              loading || status !== "ON_BREAK"
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-cyan-400 hover:bg-cyan-500 text-white cursor-pointer"
            }`}
          >
            <Clock size={20} />
            Break Out
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Attendance History
          </h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 grid grid-cols-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Date
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Entry Time
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Exit Time
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Breaks
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Total Break Time
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  Working Hours
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">
                  User Details
                </th>
              </tr>
            </thead>
            <tbody>
              {attendanceHistory.length > 0 ? (
                attendanceHistory.map((record, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">{record.date}</td>
                    <td className="py-3 px-4">{formatTime(record.checkIn)}</td>
                    <td className="py-3 px-4">{formatTime(record.checkOut)}</td>
                    <td className="py-3 px-4">
                      {record.breaks && record.breaks.length > 0 ? (
                        <div className="space-y-1">
                          {record.breaks.map((brk, idx) => (
                            <div key={idx} className="text-xs">
                              <span className="font-medium text-gray-700">Break {idx + 1}:</span>
                              <div className="ml-2">
                                <span className="text-green-600">In: {formatTime(brk.breakIn)}</span>
                                {" → "}
                                <span className="text-red-600">Out: {formatTime(brk.breakOut)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">No breaks</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {calculateBreakTime(record.breaks)}
                    </td>
                    <td className="py-3 px-4">
                      {calculateWorkingHours(
                        record.checkIn,
                        record.checkOut,
                        record.breaks,
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="text-blue-600 font-medium">
                        {record.userId?.email || "N/A"}
                      </div>
                      <div className="text-gray-600 text-xs">
                        {record.userId?.name || "N/A"}
                      </div>
                      <div className="text-gray-500 text-xs">
                        ID: {record.userId?._id || "N/A"}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="py-8 px-4 text-center text-gray-500"
                  >
                    No attendance records for this date
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

