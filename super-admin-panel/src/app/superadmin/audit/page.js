"use client";

import { ShieldCheck } from "lucide-react";
import { ProtectedDashboardRoute } from "@/components/auth/ProtectedDashboardRoute";
import { ROLES } from "@/utils/constants";

export default function AuditPage() {
  const logs = [
    { id: 1, action: "Created User", admin: "SuperAdmin", date: "2026-03-10" },
    {
      id: 2,
      action: "Deleted Department",
      admin: "SuperAdmin",
      date: "2026-03-09",
    },
  ];

  return (
    <ProtectedDashboardRoute requiredRole={ROLES.SUPER_ADMIN}>
      <div className="p-8">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                  <ShieldCheck className="text-indigo-600" size={30} />
                  Audit Logs
                </h1>
                <p className="mt-2 text-[var(--text-secondary)]">
                  Track all important system activities
                </p>
              </div>

              <div className="bg-[var(--bg-surface)] border border-[var(--border)] px-4 py-2 rounded-xl shadow-sm text-sm font-bold text-indigo-600">
                {logs.length} Logs
              </div>
            </div>

            <div className="bg-[var(--bg-surface)] rounded-[2rem] border border-[var(--border)] shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[var(--bg-elevated)]">
                    <th className="p-5 text-xs text-[var(--text-secondary)] font-bold uppercase">
                      ACTION
                    </th>
                    <th className="p-5 text-xs text-[var(--text-secondary)] font-bold uppercase">
                      ADMIN
                    </th>
                    <th className="p-5 text-xs text-[var(--text-secondary)] font-bold uppercase">
                      DATE
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-[var(--bg-elevated)] transition"
                    >
                      <td className="p-5 font-semibold text-[var(--text-primary)]">
                        {log.action}
                      </td>

                      <td className="p-5 text-[var(--text-secondary)]">
                        {log.admin}
                      </td>

                      <td className="p-5 text-[var(--text-secondary)]">
                        {log.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
      </div>
    </ProtectedDashboardRoute>
  );
}
