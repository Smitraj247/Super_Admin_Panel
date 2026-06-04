import { TrendingUp, TrendingDown } from "lucide-react";

/* Icon + bar colors — vivid dashboard stat card token colors */
const ICON_MAP = {
  purple: "text-white bg-gradient-to-br from-violet-500 to-fuchsia-500 border-transparent shadow-sm",
  blue: "text-white bg-gradient-to-br from-sky-500 to-blue-500 border-transparent shadow-sm",
  green: "text-white bg-gradient-to-br from-emerald-500 to-emerald-400 border-transparent shadow-sm",
  orange: "text-white bg-gradient-to-br from-orange-500 to-amber-500 border-transparent shadow-sm",
  cyan: "text-white bg-gradient-to-br from-cyan-500 to-sky-400 border-transparent shadow-sm",
  indigo: "text-white bg-gradient-to-br from-indigo-500 to-blue-600 border-transparent shadow-sm",
  red: "text-white bg-gradient-to-br from-rose-500 to-red-500 border-transparent shadow-sm",
};

const BAR_MAP = {
  purple: "bg-violet-500",
  blue: "bg-sky-500",
  green: "bg-emerald-500",
  orange: "bg-orange-500",
  cyan: "bg-cyan-500",
  indigo: "bg-indigo-500",
  red: "bg-rose-500",
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
      className="relative overflow-hidden rounded-xl p-3 border border-[var(--border)] transition-all duration-200 hover:-translate-y-0.5 group"
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

      <div className="flex items-start justify-between mb-2.5">
        <div
          className={`p-2 rounded-lg border ${iconCls} transition-transform group-hover:scale-110`}
        >
          {icon}
        </div>
        {sparkline && (
          <div className="flex items-end gap-0.5 h-6">
            {sparkline.map((val, i) => (
              <div
                key={i}
                className={`w-1 rounded-t-sm ${barCls} opacity-100`}
                style={{
                  height: `${(val / Math.max(...sparkline)) * 100}%`,
                  minHeight: "3px",
                }}
              />
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-wider mb-0.5">
        {title}
      </p>
      <p className="text-xl font-bold text-[var(--text-primary)] mb-0.5 tabular-nums">
        {value}
      </p>
      {subtitle && (
        <p className="text-[11px] text-[var(--text-muted)]">{subtitle}</p>
      )}

      {trend && (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-[var(--border)]">
          <div
            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${trendUp ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}
          >
            {trendUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
            {trend}
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">
            vs last month
          </span>
        </div>
      )}
    </div>
  );
}
