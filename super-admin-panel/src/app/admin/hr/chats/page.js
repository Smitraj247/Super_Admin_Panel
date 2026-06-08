"use client";

import ChatsPage from "@/components/chat/ChatsPage";
import { getUsersApi, getAdminsApi } from "@/services/adminApi";

async function fetchUsers() {
  const [usersRes, adminsRes] = await Promise.all([getUsersApi(), getAdminsApi()]);
  const users = usersRes.data || [];
  const admins = adminsRes.data || [];
  return [...users, ...admins];
}

export default function HRAdminChatsPage() {
  return <ChatsPage fetchUsers={fetchUsers} canNewChat />;
}
