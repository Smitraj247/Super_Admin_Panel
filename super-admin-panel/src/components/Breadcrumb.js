"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export function Breadcrumb({ items = [] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-2 text-sm text-slate-600 mb-6"
    >
      <Link
        href="/"
        className="flex items-center gap-1 hover:text-slate-900 transition-colors"
      >
        <Home size={16} />
        <span>Home</span>
      </Link>

      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <ChevronRight size={16} className="text-slate-400" />
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-slate-900 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-900 font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
