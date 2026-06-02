"use client";

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/Sidebar";
import { Users, DollarSign, TrendingUp, XCircle } from "lucide-react";

export default function LeadsPage() {
  const [leads, setLeads] = useState([
    {
      id: 1,
      name: "Rahul Sharma",
      email: "rahul@gmail.com",
      phone: "9876543210",
      company: "Tech Solutions",
      value: 50000,
      status: "New",
      assignedTo: "Amit",
      followUp: "2026-03-25",
    },
    {
      id: 2,
      name: "Priya Patel",
      email: "priya@gmail.com",
      phone: "9998887776",
      company: "Digital World",
      value: 75000,
      status: "Qualified",
      assignedTo: "Neha",
      followUp: "2026-03-26",
    },
    {
      id: 3,
      name: "John Doe",
      email: "john@gmail.com",
      phone: "8887776665",
      company: "Global Corp",
      value: 120000,
      status: "Won",
      assignedTo: "Raj",
      followUp: "Closed",
    },
    {
      id: 4,
      name: "Meena Singh",
      email: "meena@gmail.com",
      phone: "7776665554",
      company: "Startup Hub",
      value: 30000,
      status: "Lost",
      assignedTo: "Amit",
      followUp: "-",
    },
  ]);

  const total = leads.length;
  const newLeads = leads.filter((l) => l.status === "New").length;
  const won = leads.filter((l) => l.status === "Won").length;
  const lost = leads.filter((l) => l.status === "Lost").length;

  return (
    <main className=" min-h-screen bg-gradient-to-br from-purple-50 to-purple-100">
      <Sidebar />

      <Navbar />
      <div className="lg:ml-64 pt-20">
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">Leads Management</h1>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card title="Total Leads" value={total} icon={<Users />} />
            <Card title="New Leads" value={newLeads} icon={<TrendingUp />} />
            <Card title="Converted" value={won} icon={<DollarSign />} />
            <Card title="Lost Leads" value={lost} icon={<XCircle />} />
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="text-lg font-semibold mb-4">All Leads</h2>

            <table className="w-full text-left">
              <thead>
                <tr className="border-b">
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Company</th>
                  <th>Value (₹)</th>
                  <th>Status</th>
                  <th>Assigned</th>
                  <th>Follow-up</th>
                </tr>
              </thead>

              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b hover:bg-gray-50">
                    <td>{lead.name}</td>
                    <td>
                      <div>{lead.email}</div>
                      <div className="text-sm text-gray-500">{lead.phone}</div>
                    </td>
                    <td>{lead.company}</td>
                    <td>₹{lead.value}</td>
                    <td>
                      <span
                        className={`px-2 py-1 text-sm rounded text-white ${
                          lead.status === "New"
                            ? "bg-blue-500"
                            : lead.status === "Qualified"
                              ? "bg-yellow-500"
                              : lead.status === "Won"
                                ? "bg-green-500"
                                : "bg-red-500"
                        }`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td>{lead.assignedTo}</td>
                    <td>{lead.followUp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

function Card({ title, value, icon }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow flex items-center gap-4">
      <div className="bg-green-100 p-3 rounded-full">{icon}</div>
      <div>
        <p className="text-gray-500">{title}</p>
        <h2 className="text-xl font-bold">{value}</h2>
      </div>
    </div>
  );
}
