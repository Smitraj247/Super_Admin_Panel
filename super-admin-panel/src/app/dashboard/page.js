"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function DashboardRedirect() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    // Get user's department and redirect to correct dashboard
    const userRole = (user?.role?.name || user?.role || "")
      .toUpperCase()
      .replace(" ", "_");
    const userDept = (
      typeof user?.department === "object"
        ? user?.department?.name
        : user?.department || "employee"
    ).toLowerCase();

    if (userRole === "SUPER_ADMIN") {
      router.replace("/superadmin/dashboard");
    } else if (userRole === "ADMIN") {
      router.replace(`/admin/${userDept}`);
    } else {
      router.replace(`/dashboard/${userDept}`);
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
