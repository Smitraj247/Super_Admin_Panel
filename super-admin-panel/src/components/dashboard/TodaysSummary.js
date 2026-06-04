"use client";

import { memo } from "react";
import { Coffee } from "lucide-react";
import SummaryItem from "./SummaryItem";
import { WORK_GOAL_HOURS } from "@/constants/dashboardConstants";

/**
 * TodaySummary Component
 * Displays today's attendance summary with break details and goal progress
 */
const TodaySummary = memo(({ stats = {} }) => {
  const {
    checkInTime = "—",
    checkOutTime = "—",
    totalBreakTime = "0:00",
    workingHours = "—",
    goalProgress = 0,
    breaks = [],
  } = stats;

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-3 sm:p-4 overflow-y-auto"
      style={{
        background: "var(--bg-surface)",
        boxShadow: "var(--shadow-sm)",
        maxHeight: "360px",
      }}
    >
      <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-3">
        Today's Summary
      </h3>

      <div className="space-y-2">
        <SummaryItem label="Check In" value={checkInTime} color="green" />
        <SummaryItem label="Check Out" value={checkOutTime} color="red" />
        <SummaryItem
          label="Total Break"
          value={totalBreakTime}
          color="orange"
        />
        <SummaryItem label="Working Hours" value={workingHours} color="blue" />
      </div>

      {/* Break Details */}
      {breaks.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-[var(--border)]">
          <h4 className="text-[10px] font-semibold text-[var(--text-secondary)] mb-2 flex items-center gap-1">
            <Coffee className="w-2.5 h-2.5 text-orange-400" />
            Break Details
          </h4>

          <div className="space-y-1.5">
            {breaks.map((b) => (
              <div
                key={b.index}
                className={`p-2 rounded-lg border text-xs ${
                  b.isActive
                    ? "bg-orange-500/10 border-orange-500/20"
                    : "bg-[var(--bg-elevated)] border-[var(--border)]"
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-semibold text-[var(--text-secondary)] text-[10px]">
                    Break #{b.index}
                  </span>

                  {b.isActive && (
                    <span className="bg-orange-500 text-white text-[8px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
                      Active
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1">
                    <span className="text-emerald-400 font-medium">
                      {b.breakStart}
                    </span>

                    <span className="text-[var(--text-muted)]">→</span>

                    <span
                      className={`font-medium ${
                        b.isActive ? "text-orange-400" : "text-rose-400"
                      }`}
                    >
                      {b.breakEnd}
                    </span>
                  </div>

                  <span className="font-semibold text-[var(--text-secondary)]">
                    {b.duration}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goal Progress */}
      <div className="mt-3 pt-2.5 border-t border-[var(--border)]">
        <div className="flex items-center justify-between mb-1 text-[10px]">
          <span className="text-[var(--text-muted)]">
            {goalProgress}% of {WORK_GOAL_HOURS}h goal
          </span>

          <span className="font-semibold text-[var(--text-primary)]">
            {workingHours} / {WORK_GOAL_HOURS}h
          </span>
        </div>

        <div className="w-full bg-[var(--bg-elevated)] rounded-full h-1.5">
          <div
            className="bg-gradient-to-r from-indigo-500 to-violet-500 h-1.5 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(goalProgress, 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
});

TodaySummary.displayName = "TodaySummary";

export default TodaySummary;
