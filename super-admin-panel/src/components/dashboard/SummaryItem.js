"use client";

import { memo } from "react";
import { COLOR_MAP } from "@/constants/dashboardConstants";

/**
 * SummaryItem Component
 * Displays a label-value pair with color-coded text
 */
const SummaryItem = memo(({ label, value, color = "blue" }) => {
  const colorClass = COLOR_MAP[color]?.text || COLOR_MAP.blue.text;

  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-[var(--text-secondary)]">{label}</span>
      <span className={`text-base font-bold ${colorClass}`}>{value}</span>
    </div>
  );
});

SummaryItem.displayName = "SummaryItem";

export default SummaryItem;
