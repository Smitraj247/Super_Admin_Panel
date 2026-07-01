"use client";

import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }) {
  return (
    <main className="min-h-screen">
      <Sidebar />
      <Navbar />
      <div className="lg:ml-64 pt-14">
        <div className="p-6 space-y-6 min-h-screen">{children}</div>
      </div>
    </main>
  );
}
