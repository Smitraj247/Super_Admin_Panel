"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { ProtectedDashboardRoute } from "@/components/auth/ProtectedDashboardRoute";
import { ROLES, DEPARTMENTS } from "@/utils/constants";
import {
  Mail,
  Send,
  Inbox,
  Star,
  Clock,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  Paperclip,
  MoreVertical,
  Reply,
  ChevronDown,
  Edit3,
  FileText,
  Download,
  Calendar,
  UserPlus,
  MessageSquare,
  Circle,
} from "lucide-react";

function SalesUserEmailsPage() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [activeTab, setActiveTab] = useState("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [newEmail, setNewEmail] = useState({
    subject: "",
    body: "",
    to: "",
    status: "Draft",
  });

  const mailboxes = [
    { id: "inbox", label: "Inbox", icon: Inbox, count: 24 },
    { id: "sent", label: "Sent", icon: Send, count: 16 },
    { id: "drafts", label: "Drafts", icon: FileText, count: 7 },
    { id: "starred", label: "Starred", icon: Star, count: 5 },
    { id: "snoozed", label: "Snoozed", icon: Clock, count: 3 },
    { id: "trash", label: "Trash", icon: Trash2, count: 2 },
  ];

  const labels = [
    { name: "Important", color: "red", count: 8 },
    { name: "Follow Up", color: "orange", count: 12 },
    { name: "Contacts", color: "blue", count: 19 },
    { name: "Projects", color: "green", count: 4 },
  ];

  useEffect(() => {
    fetchEmails();
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
        if (data.length > 0 && !selectedEmail) {
          setSelectedEmail(data[0]);
        }
      }
    } catch (error) {
      toast.error("Failed to fetch emails");
    } finally {
      setLoading(false);
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
        setNewEmail({ subject: "", body: "", to: "", status: "Draft" });
        fetchEmails();
      } else {
        toast.error("Failed to save email");
      }
    } catch (error) {
      toast.error("Error saving email");
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const filteredEmails = emails.filter(
    (email) =>
      email.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.to?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.body?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-white">
      <div className="flex h-full">
          {/* Email Sidebar */}
          <div className="w-64 bg-[#1e293b] text-white border-r border-gray-700 p-4 overflow-y-auto">
            <button
              onClick={() => setShowCompose(true)}
              className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 mb-6 font-medium shadow-lg"
            >
              <Edit3 size={18} />
              Compose Email
              <ChevronDown size={16} />
            </button>

            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">
                Mailbox
              </h3>
              <div className="space-y-1">
                {mailboxes.map((box) => {
                  const Icon = box.icon;
                  return (
                    <button
                      key={box.id}
                      onClick={() => setActiveTab(box.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${
                        activeTab === box.id
                          ? "bg-blue-600 text-white font-medium"
                          : "text-gray-300 hover:bg-[#2d3748]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon size={18} />
                        <span>{box.label}</span>
                      </div>
                      <span className="text-xs">{box.count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">
                Labels
              </h3>
              <div className="space-y-1">
                {labels.map((label) => (
                  <button
                    key={label.name}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-[#2d3748] transition"
                  >
                    <div className="flex items-center gap-2">
                      <Circle
                        size={10}
                        fill={label.color}
                        className={`text-${label.color}-500`}
                      />
                      <span>{label.name}</span>
                    </div>
                    <span className="text-xs">{label.count}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 p-4 bg-[#2d3748] rounded-lg">
              <h3 className="text-sm font-semibold mb-3 text-white">Email Overview</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Unread Emails</span>
                  <span className="font-semibold text-blue-400">24</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Sent Today</span>
                  <span className="font-semibold text-green-400">16</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Replies Received</span>
                  <span className="font-semibold text-orange-400">8</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Important</span>
                  <span className="font-semibold text-red-400">5</span>
                </div>
              </div>
            </div>
          </div>

          {/* Email List */}
          <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search in emails..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Filter size={18} />
                </button>
                <button
                  onClick={fetchEmails}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <RefreshCw size={18} />
                </button>
              </div>

              <div className="flex gap-4 text-sm">
                <button className="font-semibold text-blue-600 border-b-2 border-blue-600 pb-1">
                  Primary
                </button>
                <button className="text-gray-600 hover:text-gray-900 pb-1">All</button>
                <button className="text-gray-600 hover:text-gray-900 pb-1">
                  Unread ({filteredEmails.length})
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <Mail size={48} className="mb-3 text-gray-300" />
                  <p>No emails found</p>
                </div>
              ) : (
                filteredEmails.map((email) => (
                  <div
                    key={email._id}
                    onClick={() => setSelectedEmail(email)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition ${
                      selectedEmail?._id === email._id ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {getInitials(email.to || "Unknown")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-sm text-gray-900 truncate">
                            {email.to || "Unknown"}
                          </h4>
                          <span className="text-xs text-gray-500 ml-2">
                            {formatTime(email.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-700 truncate mb-1">
                          {email.subject || "No Subject"}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {email.body || "No content"}
                        </p>
                        {email.status === "Draft" && (
                          <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                            Draft
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Email Detail View */}
          <div className="flex-1 bg-white flex flex-col overflow-hidden">
            {selectedEmail ? (
              <>
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-gray-900 mb-1">
                        {selectedEmail.subject || "No Subject"}
                      </h2>
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md">
                        Inbox
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg">
                        <Star size={20} />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg">
                        <Reply size={20} />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg">
                        <MoreVertical size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {getInitials(selectedEmail.to || "Unknown")}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {selectedEmail.to || "Unknown Sender"}{" "}
                        <span className="text-gray-500 font-normal text-sm">
                          &lt;{selectedEmail.to}&gt;
                        </span>
                      </h3>
                      <p className="text-sm text-gray-600">
                        To: <span className="text-gray-900">{selectedEmail.to || "Unknown"}</span>
                      </p>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatTime(selectedEmail.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  <div className="prose max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {selectedEmail.body || "No content"}
                    </p>
                  </div>

                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold">Lead Information</h4>
                      <button className="text-blue-600 text-sm font-medium">View Lead</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Lead Name:</span>
                        <p className="font-medium">Acme Corporation</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Lead Status:</span>
                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                          Qualified
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Lead Owner:</span>
                        <p className="font-medium">John Smith</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Source:</span>
                        <p className="font-medium">Website</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 p-4">
                  <div className="flex gap-2 mb-3">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                      <Reply size={16} />
                      Reply
                    </button>
                    <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                      Internal Note
                    </button>
                  </div>
                  <textarea
                    placeholder="Write your reply..."
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                    rows={3}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded">
                        <Paperclip size={18} />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded">
                        <Mail size={18} />
                      </button>
                    </div>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                      Send Reply
                      <ChevronDown size={16} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Mail size={64} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">Select an email to read</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Compose Modal */}
        {showCompose && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-3xl shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">New Message</h2>
                <button
                  onClick={() => setShowCompose(false)}
                  className="p-1 hover:bg-gray-100 rounded text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="p-6 space-y-4">
                <input
                  type="email"
                  value={newEmail.to}
                  onChange={(e) => setNewEmail({ ...newEmail, to: e.target.value })}
                  className="w-full border-b border-gray-300 px-2 py-2 outline-none focus:border-blue-500"
                  placeholder="To"
                />
                <input
                  type="text"
                  value={newEmail.subject}
                  onChange={(e) => setNewEmail({ ...newEmail, subject: e.target.value })}
                  className="w-full border-b border-gray-300 px-2 py-2 outline-none focus:border-blue-500"
                  placeholder="Subject"
                />
                <textarea
                  value={newEmail.body}
                  onChange={(e) => setNewEmail({ ...newEmail, body: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  placeholder="Compose your email..."
                  rows={12}
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-gray-100 rounded">
                      <Paperclip size={18} />
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowCompose(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleComposeEmail(true)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                      Save Draft
                    </button>
                    <button
                      onClick={() => handleComposeEmail(false)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Send size={16} />
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SalesUserEmailsPageWrapper() {
  return (
    <ProtectedDashboardRoute
      requiredRole={ROLES.USER}
      requiredDepartment={DEPARTMENTS.SALES.name}
    >
      <SalesUserEmailsPage />
    </ProtectedDashboardRoute>
  );
}
