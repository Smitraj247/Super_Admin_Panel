import UserGuard from "@/components/auth/UserGuard";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function UserDashboardLayout({ children }) {
  return (
    <UserGuard>
      <DashboardLayout>{children}</DashboardLayout>
    </UserGuard>
  );
}
