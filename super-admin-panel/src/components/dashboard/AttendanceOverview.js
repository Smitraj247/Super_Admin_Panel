"use client";

import { memo } from "react";
import {
  PieChart as RechartsPie,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { SectionCard, LegendItem } from "./SuperAdminSections";
import { COLORS, pct } from "./SuperAdminConstants";

const AttendanceOverview = memo(({ overview, attendanceRate, mounted }) => {
  const { present, absent, onLeave, late, total } = overview;

  const pieData = [
    { name: "Present", value: present },
    { name: "Absent", value: absent },
    { name: "On Leave", value: onLeave },
    { name: "Late", value: late },
  ];

  return (
    <SectionCard title="Attendance Overview">
      <div className="flex justify-center mb-5 text-cyan-600">
        <div className="relative w-44 h-44" style={{ minWidth: 0, minHeight: 0 }}>
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={72}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {COLORS.map((c, i) => (
                    <Cell key={i} fill={c} />
                  ))}
                </Pie>
              </RechartsPie>
            </ResponsiveContainer>
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-2xl font-bold text-[var(--text-primary)]">
              {total}
            </p>
            <p className="text-[11px] text-[var(--text-muted)]">Employees</p>
          </div>
        </div>
      </div>
      <div className="space-y-2.5">
        {[
          { color: "bg-emerald-500", label: "Present", val: present },
          { color: "bg-amber-500", label: "Absent", val: absent },
          { color: "bg-violet-500", label: "On Leave", val: onLeave },
          { color: "bg-blue-500", label: "Late", val: late },
        ].map(({ color, label, val }) => (
          <LegendItem
            key={label}
            color={color}
            label={label}
            value={`${val} (${pct(val, total)}%)`}
          />
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between text-md">
        <span className="text-[var(--text-secondary)]">Attendance Rate</span>
        <span className="font-bold text-[var(--text-primary)]">
          {attendanceRate}%
        </span>
      </div>
    </SectionCard>
  );
});

AttendanceOverview.displayName = "AttendanceOverview";
export default AttendanceOverview;
