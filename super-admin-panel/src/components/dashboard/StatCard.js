import { TrendingUp, TrendingDown } from "lucide-react";

/* Icon + bar colors — semi-transparent so they work on the navy bg */
const ICON_MAP = {
  purple: "text-[#a78bfa] bg-[#7c6fff]/20 border-[#7c6fff]/80",
  blue: "text-[#60a5fa] bg-[#3b82f6]/20 border-[#3b82f6]/80",
  green: "text-[#34d399] bg-[#10b981]/20 border-[#10b981]/80",
  orange: "text-[#fb923c] bg-[#f97316]/20 border-[#f97316]/80",
  cyan: "text-[#00d4aa] bg-[#00d4aa]/20 border-[#00d4aa]/80",
  indigo: "text-[#818cf8] bg-[#6366f1]/20 border-[#6366f1]/80",
};

const BAR_MAP = {
  purple: "bg-[#7c6fff]",
  blue: "bg-[#3b82f6]",
  green: "bg-[#10b981]",
  orange: "bg-[#f97316]",
  cyan: "bg-[#00d4aa]",
  indigo: "bg-[#6366f1]",
};

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendUp,
  color = "indigo",
  sparkline,
}) {
  const iconCls = ICON_MAP[color] ?? ICON_MAP.indigo;
  const barCls = BAR_MAP[color] ?? BAR_MAP.indigo;

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 border border-[var(--border)] transition-all duration-200 hover:-translate-y-0.5 group"
      style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-sm)" }}
    >
      {/* Subtle top glow */}
      <div
        className="absolute top-0 left-0 right-0 h-px opacity-60"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(124,111,255,0.4), transparent)",
        }}
      />

      <div className="flex items-start justify-between mb-4">
        <div
          className={`p-2.5 rounded-xl border ${iconCls} transition-transform group-hover:scale-110`}
        >
          {icon}
        </div>
        {sparkline && (
          <div className="flex items-end gap-0.5 h-8">
            {sparkline.map((val, i) => (
              <div
                key={i}
                className={`w-1.5 rounded-t-sm ${barCls} opacity-100`}
                style={{
                  height: `${(val / Math.max(...sparkline)) * 100}%`,
                  minHeight: "4px",
                }}
              />
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">
        {title}
      </p>
      <p className="text-2xl font-bold text-[var(--text-primary)] mb-1 tabular-nums">
        {value}
      </p>
      {subtitle && (
        <p className="text-[12px] text-[var(--text-muted)]">{subtitle}</p>
      )}

      {trend && (
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[var(--border)]">
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${trendUp ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}
          >
            {trendUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {trend}
          </div>
          <span className="text-[11px] text-[var(--text-muted)]">
            vs last month
          </span>
        </div>
      )}
    </div>
  );
}
