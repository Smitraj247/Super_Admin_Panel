"use client";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { useUsers } from "@/hooks/useUsers";
import UserForm from "@/components/features/users/UserForm";
import UserTable from "@/components/features/users/UserTable";
import { Users, Search } from "lucide-react";

export default function UsersPage() {
  const {
    users,
    searchQuery,
    setSearchQuery,
    editingId,
    setEditingId,
    showPassword,
    setShowPassword,
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
    fetchDepartments: false,
    defaultFormValues: {
      sidebarPermissions: [],
    },
  });

  return (
    <div className="min-h-screen">
      <Sidebar />
      <Navbar />

      <main className="md:pl-64 pt-16">
        <div className="p-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 py-3 gap-4 overflow-hidden">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
                <Users size={24} className="text-gray-600" />
                User Directory
              </h1>
              <p className="text-gray-500 text-sm">
                Manage user accounts and permissions
              </p>
            </div>
            <div className="bg-white border rounded-lg px-4 py-2 flex items-center gap-2 text-gray-700 text-sm">
              <Users size={16} />
              {users.length} Users
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <UserForm
                form={form}
                editingId={editingId}
                availableSidebarOptions={availableSidebarOptions}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                handleChange={handleChange}
                handleSubmit={handleSubmit}
                handlePermissionToggle={handlePermissionToggle}
                isSales={true}
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
                      sidebarPermissions: [],
                    });
                  }}
                  className="w-full text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-2">
                <Search size={18} className="text-gray-400" />
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
                isSales={true}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
