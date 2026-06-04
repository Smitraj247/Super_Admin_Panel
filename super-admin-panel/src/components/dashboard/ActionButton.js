"use client";

import { useRouter } from "next/navigation";

const COLOR_MAP = {
  green: {
    icon: "bg-gradient-to-br from-emerald-500 to-emerald-400 text-white border-transparent shadow-sm",
    glow:
      "hover:shadow-[0_10px_30px_-10px_rgba(16,185,129,0.6)] hover:scale-[1.03] hover:opacity-100",
  },
  orange: {
    icon: "bg-gradient-to-br from-orange-500 to-amber-500 text-white border-transparent shadow-sm",
    glow: "hover:shadow-[0_10px_30px_-10px_rgba(249,115,22,0.35)] hover:scale-[1.03] hover:opacity-100",
  },
  blue: {
    icon: "bg-gradient-to-br from-sky-500 to-blue-500 text-white border-transparent shadow-sm",
    glow:
      "hover:shadow-[0_10px_30px_-10px_rgba(59,130,246,0.35)] hover:scale-[1.03] hover:opacity-100",
  },
  red: {
    icon: "bg-gradient-to-br from-rose-500 to-red-500 text-white border-transparent shadow-sm",
    glow: "hover:shadow-[0_10px_30px_-10px_rgba(244,63,94,0.35)] hover:scale-[1.03] hover:opacity-100",
  },
  purple: {
    icon: "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white border-transparent shadow-sm",
    glow:
      "hover:shadow-[0_10px_30px_-10px_rgba(124,111,255,0.35)] hover:scale-[1.03] hover:opacity-100",
  },
  indigo: {
    icon: "bg-gradient-to-br from-indigo-500 to-blue-600 text-white border-transparent shadow-sm",
    glow: "hover:shadow-[0_10px_30px_-10px_rgba(79,70,229,0.35)] hover:scale-[1.03] hover:opacity-100",
  },
};

export default function QuickActionButton({
  icon,
  label,
  subtitle,
  color = "blue",
  onClick,
  path,
  disabled = false,
}) {
  const router = useRouter();

  const c = COLOR_MAP[color] ?? COLOR_MAP.blue;

  const handleClick = () => {
    if (disabled) return;

    if (onClick) {
      onClick();
    } else if (path) {
      router.push(path);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        group relative w-full text-left rounded-xl p-3 border border-[var(--border)]
        transition-all duration-300 ease-out
        hover:shadow-lg hover:-translate-y-1
        ${c.glow}
        ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
      `}
      style={{
        background: "var(--bg-surface)",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <div className="flex flex-col items-center text-center gap-2">
        <div
          className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-transform group-hover:scale-110 ${c.icon}`}
        >
          {icon}
        </div>

        <div>
          <p className="text-[12px] font-semibold text-[var(--text-primary)]">
            {label}
          </p>

          {subtitle && (
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}