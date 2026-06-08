"use client";

import ChatsPage from "@/components/chat/ChatsPage";
import { getUsersApi, getAdminsApi } from "@/services/superAdminApi";

async function fetchUsers() {
  const [usersRes, adminsRes] = await Promise.all([getUsersApi(), getAdminsApi()]);
  const users = usersRes.data.users || usersRes.data || [];
  const admins = adminsRes.data || [];
  return [...users, ...admins];
}

export default function SuperAdminChatsPage() {
  return <ChatsPage fetchUsers={fetchUsers} canNewChat canGroup />;
}
