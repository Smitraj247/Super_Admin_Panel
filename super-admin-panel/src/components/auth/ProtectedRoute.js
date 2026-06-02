"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/**
 * Unified protected route guard.
 *
 * Props:
 *  - allowedRoles        string[]  — if set, only these roles may access
 *  - requiredDepartment  string    — if set, user's dept must match (case-insensitive)
 *
 * Auth state is read synchronously from storage in AuthContext, so there is
 * no loading flash for authenticated users — the spinner only shows on a
 * cold load where no token exists yet.
 */
export default function ProtectedRoute({
  children,
  allowedRoles = [],
  requiredDepartment = null,
}) {
  const { user, loading, isAuthenticated, getRole, getDepartment } = useAuth();
  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    if (loading || redirected.current) return;

    if (!isAuthenticated()) {
      redirected.current = true;
      router.replace("/login");
      return;
    }

    const role = (getRole() || "").toUpperCase().replace(/\s+/g, "_");
    const dept = (getDepartment() || "").toLowerCase();

    // Role check
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      redirected.current = true;
      if (role === "SUPER_ADMIN") {
        router.replace("/superadmin/dashboard");
      } else if (role === "ADMIN") {
        router.replace(`/admin/${dept || "ce"}`);
      } else {
        router.replace(`/dashboard/${dept || "ce"}`);
      }
      return;
    }

    // Department check
    if (requiredDepartment && role !== "SUPER_ADMIN") {
      if (!dept) {
        redirected.current = true;
        router.replace("/login");
        return;
      }
      if (dept !== requiredDepartment.toLowerCase()) {
        redirected.current = true;
        if (role === "ADMIN") {
          router.replace(`/admin/${dept}`);
        } else {
          router.replace(`/dashboard/${dept}`);
        }
        return;
      }
    }
  }, [loading, user, isAuthenticated, getRole, getDepartment, allowedRoles, requiredDepartment, router]);

  if (loading || !isAuthenticated()) {
    return (
      <div suppressHydrationWarning className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        {loading && <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />}
      </div>
    );
  }

  return <>{children}</>;
}
