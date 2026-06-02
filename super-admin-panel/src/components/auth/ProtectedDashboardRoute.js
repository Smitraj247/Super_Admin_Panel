/**
 * Re-exports the unified ProtectedRoute for backward compatibility.
 * Use ProtectedRoute directly for new code.
 */
export { default as ProtectedDashboardRoute } from "./ProtectedRoute";
export { default } from "./ProtectedRoute";

// Keep the hook for any consumers
export { useAuth as useDepartmentAccess } from "@/context/AuthContext";
