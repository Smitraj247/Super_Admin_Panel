"use client";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/layout/Navbar";
import ChatWindow from "@/components/ui/ChatWindow";
import { User, UserCircle, Search } from "lucide-react";
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
    setEditingId,
    showPassword,
    setShowPassword,
    chatUser,
    setChatUser,
    form,
    setForm,
    handleChange,
    handleSubmit,
    deleteUser,
    startEdit,
    handlePermissionToggle,
    availableSidebarOptions,
    filteredUsers,
  } = useUsers({
    apiPrefix: "/admin",
    fetchDepartments: true,
  });

  return (
    <div className="min-h-screen">
      <Sidebar />
      <Navbar />

      <main className="md:pl-64 pt-16">
        <div className="p-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 py-3 gap-4 overflow-hidden">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                <User size={24} className="text-cyan-600" />
                User Directory
              </h1>
              <p className="text-cyan-600 text-sm">
                Manage user accounts and departments
              </p>
            </div>
            <div className="bg-white border rounded-lg px-4 py-2 flex items-center gap-2">
              <UserCircle size={16} />
              {users.length} Users
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
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
                isHr={true}
              />
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm({
                      name: "",
                      email: "",
                      password: "",
                      department: "",
                      sidebarPermissions: [],
                    });
                  }}
                  className="w-full text-sm text-blue-500 hover:text-blue-700"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white border border-blue-200 rounded-2xl p-4 flex items-center gap-2">
                <Search size={18} className="text-blue-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 outline-none bg-transparent"
                />
              </div>

              <UserTable
                users={filteredUsers}
                onEdit={startEdit}
                onDelete={deleteUser}
                onChat={setChatUser}
                isHr={true}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Chat Window */}
      {chatUser && (
        <ChatWindow user={chatUser} onClose={() => setChatUser(null)} />
      )}
    </div>
  );
}
