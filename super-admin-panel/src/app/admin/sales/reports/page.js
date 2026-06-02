"use client";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/Sidebar";
import { BarChart3 } from "lucide-react";

export default function ReportsPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <Navbar />

      <div className="md:pl-64 pt-16">
        <div className="p-8">
          <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
            <BarChart3 size={24} className="text-purple-600" />
            Reports
          </h1>

          <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
            <p className="text-slate-600 text-center py-12">
              Reports coming soon...
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
