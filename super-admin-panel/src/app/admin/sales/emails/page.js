"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

export default function SalesEmailsPage() {
  const [emails, setEmails] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [newEmail, setNewEmail] = useState({
    subject: "",
    body: "",
    to: "",
    cc: "",
    status: "Draft",
  });

  useEffect(() => {
    fetchEmails();
    fetchStats();
  }, []);

  const fetchEmails = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/emails`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEmails(data);
      }
    } catch (error) {
      toast.error("Failed to fetch emails");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/emails/stats`,
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

  const handleComposeEmail = async (isDraft = true) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/emails`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...newEmail,
            status: isDraft ? "Draft" : "Sent",
          }),
        }
      );

      if (response.ok) {
        toast.success(isDraft ? "Email saved as draft" : "Email sent successfully");
        setShowCompose(false);
        setNewEmail({ subject: "", body: "", to: "", cc: "", status: "Draft" });
        fetchEmails();
        fetchStats();
      } else {
        toast.error("Failed to save email");
      }
    } catch (error) {
      toast.error("Error saving email");
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      Draft: "bg-gray-200 text-gray-800",
      Sent: "bg-blue-100 text-blue-800",
      Replied: "bg-green-100 text-green-800",
      Failed: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-200 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">Loading emails...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Email Inbox</h1>
          <p className="text-gray-600">Manage your email communications with leads</p>
        </div>
        <button
          onClick={() => setShowCompose(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Compose Email
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-600 text-sm">Total</div>
            <div className="text-2xl font-bold">{stats.totalEmails}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-600 text-sm">Drafts</div>
            <div className="text-2xl font-bold text-gray-600">{stats.draftEmails}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-600 text-sm">Sent</div>
            <div className="text-2xl font-bold text-blue-600">{stats.sentEmails}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-600 text-sm">Replied</div>
            <div className="text-2xl font-bold text-green-600">{stats.repliedEmails}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-600 text-sm">Unread</div>
            <div className="text-2xl font-bold text-orange-600">{stats.unreadEmails}</div>
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Compose Email</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">To</label>
                <input
                  type="email"
                  value={newEmail.to}
                  onChange={(e) => setNewEmail({ ...newEmail, to: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="recipient@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CC (Optional)</label>
                <input
                  type="text"
                  value={newEmail.cc}
                  onChange={(e) => setNewEmail({ ...newEmail, cc: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="cc@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <input
                  type="text"
                  value={newEmail.subject}
                  onChange={(e) => setNewEmail({ ...newEmail, subject: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Email subject"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Message</label>
                <textarea
                  value={newEmail.body}
                  onChange={(e) => setNewEmail({ ...newEmail, body: e.target.value })}
                  className="w-full border rounded px-3 py-2 h-48"
                  placeholder="Write your message..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCompose(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleComposeEmail(true)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Save Draft
                </button>
                <button
                  onClick={() => handleComposeEmail(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Emails List */}
      <div className="bg-white rounded-lg shadow">
        <div className="divide-y">
          {emails.map((email) => (
            <div
              key={email._id}
              className={`p-4 hover:bg-gray-50 cursor-pointer ${
                !email.isRead ? "bg-blue-50" : ""
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{email.subject}</span>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(email.status)}`}>
                      {email.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    To: {email.to}
                    {email.leadId && (
                      <span className="ml-2 text-blue-600">
                        Lead: {email.leadId.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(email.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="text-sm text-gray-600 line-clamp-2">{email.body}</div>
            </div>
          ))}
        </div>
        {emails.length === 0 && (
          <div className="text-center py-12 text-gray-500">No emails found</div>
        )}
      </div>
    </div>
  );
}
