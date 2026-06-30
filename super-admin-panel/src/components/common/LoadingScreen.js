"use client";

import { memo } from "react";

/**
 * LoadingScreen Component
 * Displays a centered loading spinner
 */
const LoadingScreen = memo(() => {
  return (
    <div className="sidebar-aware pt-14 flex items-center justify-center min-h-screen">
      <div className="text-center animate-fade-in">
        <div className="w-10 h-10 border-2 border-[var(--border-strong)] border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-[var(--text-muted)] text-sm">Loading dashboard…</p>
      </div>
    </div>  
  );
});

LoadingScreen.displayName = "LoadingScreen";

export default LoadingScreen;
