import AdminGuard from "@/components/auth/AdminGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function AdminLayout({ children }) {
  return (
    <AdminGuard>
      <DashboardLayout>{children}</DashboardLayout>
    </AdminGuard>
  );
}
