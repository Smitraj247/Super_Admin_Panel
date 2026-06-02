"use client";

import UnifiedDashboard from "@/components/pages/UnifiedDashboard";
import { ProtectedDashboardRoute } from "@/components/auth/ProtectedDashboardRoute";
import { ROLES, DEPARTMENTS } from "@/utils/constants";

export default function EmployeeUserDashboard() {
  return (
    <ProtectedDashboardRoute
      requiredRole={ROLES.USER}
      requiredDepartment={DEPARTMENTS.EMPLOYEE.name}
    >
      <UnifiedDashboard
        userRole={ROLES.USER}
        department={DEPARTMENTS.EMPLOYEE.name}
      />
    </ProtectedDashboardRoute>
  );
}
