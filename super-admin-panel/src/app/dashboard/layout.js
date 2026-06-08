import UserGuard from "@/components/auth/UserGuard";

export default function DashboardLayout({ children }) {
  return <UserGuard>{children}</UserGuard>;
}
