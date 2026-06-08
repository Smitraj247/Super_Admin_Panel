"use client";

import ProtectedRoute from "./ProtectedRoute";

/**
 * Wraps all /dashboard/* pages with USER-level auth protection.
 * Used by the dashboard layout so every sub-page is automatically guarded.
 */
export default function UserGuard({ children }) {
  return (
    <ProtectedRoute allowedRoles={["USER"]}>
      {children}
    </ProtectedRoute>
  );
}

