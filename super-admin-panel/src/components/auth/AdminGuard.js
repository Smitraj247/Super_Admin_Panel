"use client";

import ProtectedRoute from "./ProtectedRoute";

/**
 * Wraps all /admin/* pages with ADMIN-level auth protection.
 * Used by the admin layout so every sub-page is automatically guarded.
 */
export default function AdminGuard({ children }) {
  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      {children}
    </ProtectedRoute>
  );
}
