"use client";
import { ClipboardList } from "lucide-react";

export default function TargetsPage() {
  return (
    <div className="p-8">
          <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
            <ClipboardList size={24} className="text-purple-600" />
            Targets
          </h1>

          <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
            <p className="text-slate-600 text-center py-12">
              Targets management system coming soon...
            </p>
          </div>
        </div>
    </div>
  );
}
