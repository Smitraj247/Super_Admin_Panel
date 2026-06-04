"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

export default function SalesMeetingsPage() {
  const [meetings, setMeetings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    meetingType: "Virtual",
    meetingLink: "",
    agenda: "",
  });

  useEffect(() => {
    fetchMeetings();
    fetchStats();
  }, []);

  const fetchMeetings = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/meetings`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMeetings(data);
      }
    } catch (error) {
      toast.error("Failed to fetch meetings");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/meetings/stats`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats");
    }
  };

  const handleScheduleMeeting = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/meetings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newMeeting),
        }
      );

      if (response.ok) {
        toast.success("Meeting scheduled successfully");
        setShowSchedule(false);
        setNewMeeting({
          title: "",
          description: "",
          startTime: "",
          endTime: "",
          meetingType: "Virtual",
          meetingLink: "",
          agenda: "",
        });
        fetchMeetings();
        fetchStats();
      } else {
        toast.error("Failed to schedule meeting");
      }
    } catch (error) {
      toast.error("Error scheduling meeting");
    }
  };

  const updateMeetingStatus = async (meetingId, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/meetings/${meetingId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        toast.success("Meeting status updated");
        fetchMeetings();
        fetchStats();
      } else {
        toast.error("Failed to update meeting");
      }
    } catch (error) {
      toast.error("Error updating meeting");
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      Scheduled: "bg-blue-100 text-blue-800",
      Completed: "bg-green-100 text-green-800",
      Cancelled: "bg-red-100 text-red-800",
      Rescheduled: "bg-yellow-100 text-yellow-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getMeetingTypeIcon = (type) => {
    switch (type) {
      case "Virtual":
        return "🎥";
      case "In-person":
        return "👤";
      case "Phone Call":
        return "📞";
      default:
        return "📅";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading meetings...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Meetings</h1>
          <p className="text-gray-600">Schedule and manage your meetings with leads</p>
        </div>
        <button
          onClick={() => setShowSchedule(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Schedule Meeting
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-600 text-sm">Total</div>
            <div className="text-2xl font-bold">{stats.totalMeetings}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-600 text-sm">Scheduled</div>
            <div className="text-2xl font-bold text-blue-600">{stats.scheduledMeetings}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-600 text-sm">Completed</div>
            <div className="text-2xl font-bold text-green-600">{stats.completedMeetings}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-600 text-sm">Today</div>
            <div className="text-2xl font-bold text-orange-600">{stats.upcomingToday}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-600 text-sm">Cancelled</div>
            <div className="text-2xl font-bold text-red-600">{stats.cancelledMeetings}</div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Schedule Meeting</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={newMeeting.title}
                  onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Meeting title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Meeting Type</label>
                <select
                  value={newMeeting.meetingType}
                  onChange={(e) => setNewMeeting({ ...newMeeting, meetingType: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="Virtual">Virtual</option>
                  <option value="In-person">In-person</option>
                  <option value="Phone Call">Phone Call</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    value={newMeeting.startTime}
                    onChange={(e) => setNewMeeting({ ...newMeeting, startTime: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    value={newMeeting.endTime}
                    onChange={(e) => setNewMeeting({ ...newMeeting, endTime: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              {newMeeting.meetingType === "Virtual" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Meeting Link</label>
                  <input
                    type="url"
                    value={newMeeting.meetingLink}
                    onChange={(e) => setNewMeeting({ ...newMeeting, meetingLink: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    placeholder="https://meet.google.com/..."
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Agenda</label>
                <textarea
                  value={newMeeting.agenda}
                  onChange={(e) => setNewMeeting({ ...newMeeting, agenda: e.target.value })}
                  className="w-full border rounded px-3 py-2 h-24"
                  placeholder="Meeting agenda..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={newMeeting.description}
                  onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
                  className="w-full border rounded px-3 py-2 h-24"
                  placeholder="Additional details..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowSchedule(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScheduleMeeting}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Meetings List */}
      <div className="grid gap-4">
        {meetings.map((meeting) => (
          <div key={meeting._id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{getMeetingTypeIcon(meeting.meetingType)}</span>
                  <h3 className="text-xl font-semibold">{meeting.title}</h3>
                  <span className={`px-3 py-1 rounded text-sm ${getStatusColor(meeting.status)}`}>
                    {meeting.status}
                  </span>
                </div>
                <p className="text-gray-600 mb-2">{meeting.description}</p>
                {meeting.leadId && (
                  <p className="text-sm text-blue-600 mb-2">
                    Lead: {meeting.leadId.name} ({meeting.leadId.company})
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <span className="text-gray-600">Start:</span>{" "}
                <span className="font-medium">
                  {new Date(meeting.startTime).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-600">End:</span>{" "}
                <span className="font-medium">
                  {new Date(meeting.endTime).toLocaleString()}
                </span>
              </div>
            </div>
            {meeting.meetingLink && (
              <div className="mb-4">
                <a
                  href={meeting.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  Join Meeting →
                </a>
              </div>
            )}
            {meeting.status === "Scheduled" && (
              <div className="flex gap-2">
                <button
                  onClick={() => updateMeetingStatus(meeting._id, "Completed")}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                >
                  Mark Complete
                </button>
                <button
                  onClick={() => updateMeetingStatus(meeting._id, "Cancelled")}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
        {meetings.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            No meetings scheduled
          </div>
        )}
      </div>
    </div>
  );
}
