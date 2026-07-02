import { SuperAdminGuard } from "@/components/auth/UserGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function SuperAdminLayout({ children }) {
  return (
    <SuperAdminGuard>
      <DashboardLayout>{children}</DashboardLayout>
    </SuperAdminGuard>
  );
}
