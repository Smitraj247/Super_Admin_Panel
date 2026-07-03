"use client";

import { memo } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export const LegendItem = memo(({ color, label, value }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-[13px] text-[var(--text-secondary)]">{label}</span>
    </div>
    <span className="text-[13px] font-semibold text-[var(--text-primary)]">
      {value}
    </span>
  </div>
));
LegendItem.displayName = "LegendItem";

export const SystemMetric = memo(
  ({ icon, label, value, subtitle, trend, trendUp }) => (
    <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)]">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[var(--bg-surface)]">{icon}</div>
        <div>
          <p className="text-[11px] text-[var(--text-muted)]">{label}</p>
          <p className="text-[13px] font-bold text-[var(--text-primary)]">
            {value}
          </p>
          {subtitle && (
            <p className="text-[11px] text-[var(--text-muted)]">{subtitle}</p>
          )}
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1">
          {trendUp ? (
            <TrendingUp className="w-3 h-3 text-emerald-400" />
          ) : (
            <TrendingDown className="w-3 h-3 text-rose-400" />
          )}
          <span
            className={`text-[11px] font-semibold ${trendUp ? "text-emerald-400" : "text-rose-400"}`}
          >
            {trend}
          </span>
        </div>
      )}
    </div>
  ),
);
SystemMetric.displayName = "SystemMetric";

export const SectionCard = memo(
  ({ title, action, children, className = "" }) => (
    <div
      className={`rounded-xl p-3 border border-[var(--border)] ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  ),
);
SectionCard.displayName = "SectionCard";
