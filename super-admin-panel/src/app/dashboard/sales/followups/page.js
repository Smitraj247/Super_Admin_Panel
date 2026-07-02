"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { ProtectedDashboardRoute } from "@/components/auth/ProtectedDashboardRoute";
import { ROLES, DEPARTMENTS } from "@/utils/constants";

function SalesUserFollowUpsPage() {
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFollowUps();
  }, []);

  const fetchFollowUps = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/followups`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setFollowUps(data);
      }
    } catch (error) {
      toast.error("Failed to fetch follow-ups");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/followups/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      if (response.ok) {
        toast.success("Follow-up updated");
        fetchFollowUps();
      }
    } catch (error) {
      toast.error("Failed to update");
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-[80vh]">Loading...</div>;
  }

  return (
    <div className="p-6">
          <h1 className="text-3xl font-bold mb-6">My Follow-ups</h1>

          <div className="grid gap-4">
            {followUps.map((followUp) => (
              <div key={followUp._id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">{followUp.title}</h3>
                    <p className="text-gray-600">{followUp.description}</p>
                    {followUp.leadId && (
                      <p className="text-sm text-blue-600 mt-2">
                        Lead: {followUp.leadId.name}
                      </p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded text-sm ${
                    followUp.status === "Completed" ? "bg-green-100 text-green-800" :
                    followUp.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                    "bg-blue-100 text-blue-800"
                  }`}>
                    {followUp.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  Due: {new Date(followUp.dueDate).toLocaleString()}
                </div>
                {followUp.status !== "Completed" && (
                  <button
                    onClick={() => updateStatus(followUp._id, "Completed")}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Mark Complete
                  </button>
                )}
              </div>
            ))}
            {followUps.length === 0 && (
              <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
                No follow-ups found
              </div>
            )}
          </div>
    </div>
  );
}

export default function SalesUserFollowUpsPageWrapper() {
  return (
    <ProtectedDashboardRoute
      requiredRole={ROLES.USER}
      requiredDepartment={DEPARTMENTS.SALES.name}
    >
      <SalesUserFollowUpsPage />
    </ProtectedDashboardRoute>
  );
}
