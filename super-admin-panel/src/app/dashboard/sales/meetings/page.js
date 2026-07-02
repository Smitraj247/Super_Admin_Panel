"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { ProtectedDashboardRoute } from "@/components/auth/ProtectedDashboardRoute";
import { ROLES, DEPARTMENTS } from "@/utils/constants";

function SalesUserMeetingsPage() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeetings();
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

  if (loading) {
    return <div className="flex justify-center items-center min-h-[80vh]">Loading...</div>;
  }

  return (
    <div className="p-6">
          <h1 className="text-3xl font-bold mb-6">My Meetings</h1>

          <div className="grid gap-4">
            {meetings.map((meeting) => (
              <div key={meeting._id} className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold mb-2">{meeting.title}</h3>
                <p className="text-gray-600 mb-4">{meeting.description}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Start:</span>{" "}
                    <span className="font-medium">
                      {new Date(meeting.startTime).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Type:</span>{" "}
                    <span className="font-medium">{meeting.meetingType}</span>
                  </div>
                </div>
                {meeting.meetingLink && (
                  <div className="mt-4">
                    <a
                      href={meeting.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Join Meeting →
                    </a>
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

export default function SalesUserMeetingsPageWrapper() {
  return (
    <ProtectedDashboardRoute
      requiredRole={ROLES.USER}
      requiredDepartment={DEPARTMENTS.SALES.name}
    >
      <SalesUserMeetingsPage />
    </ProtectedDashboardRoute>
  );
}
