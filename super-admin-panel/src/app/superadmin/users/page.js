"use client";

import { ProtectedDashboardRoute } from "@/components/auth/ProtectedDashboardRoute";
import { ROLES } from "@/utils/constants";
import ChatWindow from "@/components/ui/ChatWindow";
import { Users, UserCircle, Search } from "lucide-react";
import { useUsers } from "@/hooks/useUsers";
import UserForm from "@/components/features/users/UserForm";
import UserTable from "@/components/features/users/UserTable";

export default function UsersPage() {
  const {
    users,
    departments,
    searchQuery,
    setSearchQuery,
    editingId,
    showPassword,
    setShowPassword,
    chatUser,
    setChatUser,
    form,
    handleChange,
    handleSubmit,
    deleteUser,
    startEdit,
    handlePermissionToggle,
    availableSidebarOptions,
    filteredUsers,
  } = useUsers({ apiPrefix: "/superadmin" });

  return (
    <ProtectedDashboardRoute requiredRole={ROLES.SUPER_ADMIN}>
      <main>
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center py-3 mb-8 gap-3">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Users className="text-indigo-600" size={28} />
                  User Directory
                </h1>
                <p className="text-gray-500 text-sm">
                  Manage user accounts and departments
                </p>
              </div>

              <div className="bg-[var(--bg-surface)] rounded-lg border p-2 flex items-center gap-4">
                <UserCircle size={16} />
                {users.length} Users
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <UserForm
                  form={form}
                  editingId={editingId}
                  departments={departments}
                  availableSidebarOptions={availableSidebarOptions}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  handleChange={handleChange}
                  handleSubmit={handleSubmit}
                  handlePermissionToggle={handlePermissionToggle}
                />
              </div>

              <div className="md:col-span-2">
                <div className="w-full relative mb-4">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users..."
                    className="bg-[var(--bg-surface)] border-none rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <UserTable
                  users={filteredUsers}
                  onEdit={startEdit}
                  onDelete={deleteUser}
                  onChat={setChatUser}
                />
              </div>
            </div>
          </div>
        {/* Chat Window */}
        {chatUser && (
          <ChatWindow user={chatUser} onClose={() => setChatUser(null)} />
        )}
      </main>
    </ProtectedDashboardRoute>
  );
}
