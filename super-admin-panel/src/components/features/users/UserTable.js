import React from "react";
import { MessageCircle, Edit3, Trash2 } from "lucide-react";

const UserTable = React.memo(({
  users = [],
  onEdit,
  onDelete,
  onChat,
  isHr = false,
  isSales = false,
}) => {
  // Styling adjustments based on role/department
  const headerRowClass = isHr
    ? "bg-blue-50 border-b border-blue-100"
    : isSales
    ? "bg-gray-50 border-b border-gray-100"
    : "bg-[var(--bg-elevated)]";

  const tableHeaderCellClass = isHr
    ? "p-4 text-left text-xs font-semibold text-blue-800 uppercase tracking-wider"
    : isSales
    ? "p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
    : "p-5 text-xs text-[var(--text-secondary)] font-bold uppercase";

  const containerClass = isHr
    ? "bg-white rounded-2xl border border-blue-100 shadow-sm overflow-hidden"
    : isSales
    ? "bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
    : "bg-[var(--bg-surface)] rounded-[2rem] border border-[var(--border)] shadow-sm overflow-y-auto";

  const tableRowClass = isHr
    ? "hover:bg-blue-50/50 transition border-b border-blue-100 last:border-b-0"
    : isSales
    ? "hover:bg-gray-50 transition border-b last:border-b-0"
    : "hover:bg-slate-200 transition";

  const nameClass = isHr || isSales
    ? "font-medium text-gray-900"
    : "text-[var(--text-primary)]";

  const emailClass = isHr || isSales
    ? "text-xs text-gray-500"
    : "text-xs text-[var(--text-secondary)]";

  const departmentBadgeClass = isHr
    ? "px-2.5 py-1 bg-cyan-50 text-cyan-700 rounded-full text-xs font-medium border border-cyan-100 uppercase"
    : isSales
    ? "px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100 uppercase"
    : "px-3 py-1 bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded-lg text-xs font-bold uppercase";

  const roleBadgeClass = isHr
    ? "px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium border border-indigo-100 uppercase"
    : isSales
    ? "px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium uppercase"
    : "px-3 py-1 bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold uppercase";

  return (
    <div className={containerClass}>
      <table className="w-full text-left">
        <thead className={!isHr && !isSales ? "sticky top-0 bg-[var(--bg-elevated)] z-20" : ""}>
          <tr className={headerRowClass}>
            <th className={tableHeaderCellClass}>USER</th>
            {isSales && <th className={tableHeaderCellClass}>EMAIL</th>}
            {!isSales && <th className={tableHeaderCellClass}>DEPARTMENT</th>}
            <th className={tableHeaderCellClass}>ROLE</th>
            <th className={tableHeaderCellClass}>ACTIONS</th>
          </tr>
        </thead>
        <tbody className={!isHr && !isSales ? "divide-y" : "divide-y divide-gray-100"}>
          {users.map((user) => (
            <tr
              key={user._id}
              className={tableRowClass}
            >
              <td className="p-5">
                <div className="flex items-center gap-3">
                  <div className={isHr ? "w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold" : isSales ? "w-8 h-8 bg-purple-100 rounded flex items-center justify-center text-purple-600 font-bold" : "w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold"}>
                    {user.name?.charAt(0)}
                  </div>
                  <div>
                    <p className={nameClass}>{user.name}</p>
                    {!isSales && <p className={emailClass}>{user.email}</p>}
                  </div>
                </div>
              </td>
              {isSales && <td className="p-5 text-gray-700">{user.email}</td>}
              {!isSales && (
                <td className="p-5">
                  <span className={departmentBadgeClass}>
                    {user.department?.name || "Unassigned"}
                  </span>
                </td>
              )}
              <td className="p-5">
                <span className={roleBadgeClass}>
                  {user.role?.name || "USER"}
                </span>
              </td>
              <td className="p-5">
                <div className="flex items-center gap-2 justify-start">
                  {onChat && (
                    <button
                      onClick={() => onChat(user)}
                      className={isHr ? "p-2 text-blue-600 hover:bg-blue-100 rounded-lg" : "p-2 text-green-600 hover:bg-green-50 rounded-lg"}
                      title="Chat with user"
                    >
                      <MessageCircle size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => onEdit(user)}
                    className={isHr ? "p-2 text-cyan-600 hover:bg-cyan-100 rounded-lg" : isSales ? "p-2 text-blue-600 hover:bg-blue-50 rounded-lg" : "p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"}
                    title="Edit user"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button
                    onClick={() => onDelete(user._id)}
                    className={isHr ? "p-2 text-red-600 hover:bg-red-100 rounded-lg" : isSales ? "p-2 text-red-600 hover:bg-red-50 rounded-lg" : "p-2 text-rose-600 hover:bg-rose-50 rounded-lg"}
                    title="Delete user"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={isSales ? 4 : 4} className="p-8 text-center text-gray-500">
                No users found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
});

UserTable.displayName = "UserTable";
export default UserTable;
