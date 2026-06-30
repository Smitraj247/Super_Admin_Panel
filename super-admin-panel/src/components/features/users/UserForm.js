import React from "react";
import { Edit3, UserPlus, Eye, EyeOff } from "lucide-react";

const UserForm = React.memo(({
  form,
  editingId,
  departments = [],
  availableSidebarOptions = [],
  showPassword,
  setShowPassword,
  handleChange,
  handleSubmit,
  handlePermissionToggle,
  isHr = false,
  isSales = false,
}) => {
  // Styles based on HR vs Admin vs SuperAdmin
  const containerClass = isHr
    ? "backdrop-blur-xl rounded-3xl border border-blue-200 p-6 shadow-lg h-fit"
    : isSales
    ? "bg-white border rounded-lg p-6 shadow-sm h-fit"
    : "bg-[var(--bg-surface)] rounded-[2rem] border border-[var(--border)] shadow-sm max-h-[700px] overflow-y-auto no-scrollbar p-6";

  const headerClass = isHr
    ? "font-semibold mb-4 flex items-center gap-2 text-blue-600"
    : isSales
    ? "font-semibold mb-4 flex items-center gap-2 text-gray-700"
    : "font-semibold mb-4 flex items-center gap-2 sticky top-0 bg-[var(--bg-surface)] pb-2";

  const labelClass = isHr
    ? "block text-sm font-medium mb-1 text-cyan-600"
    : isSales
    ? "block text-sm font-medium mb-1 text-gray-600"
    : "hidden"; // SuperAdmin doesn't use visible labels above the inputs, just placeholders

  const inputClass = isHr
    ? "w-full border border-blue-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 bg-white text-gray-800"
    : isSales
    ? "w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-100"
    : "w-full bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400";

  const checkboxLabelClass = isHr
    ? "flex items-center gap-2 cursor-pointer hover:bg-blue-50 p-2 rounded"
    : isSales
    ? "flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
    : "flex items-center gap-2 cursor-pointer hover:bg-[var(--bg-elevated)] p-2 rounded";

  const checkboxClass = isHr
    ? "w-4 h-4 text-cyan-600 rounded focus:ring-2 focus:ring-cyan-600"
    : isSales
    ? "w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
    : "w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500";

  const permissionHeadingClass = isHr
    ? "block text-sm font-semibold text-cyan-700 mb-3"
    : isSales
    ? "block text-sm font-semibold text-gray-700 mb-3"
    : "block text-sm font-semibold text-[var(--text-primary)] mb-3";

  const buttonClass = isHr
    ? "w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
    : isSales
    ? "w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition"
    : "w-full bg-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer";

  return (
    <div className={containerClass}>
      <h3 className={headerClass}>
        {editingId ? <Edit3 size={18} /> : <UserPlus size={18} />}
        {editingId ? "Edit User" : "Add User"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          {isHr && <label className={labelClass}>Full Name *</label>}
          {isSales && <label className={labelClass}>Full Name *</label>}
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder={isHr ? "e.g., John Doe" : isSales ? "e.g. John Doe" : "Full Name"}
            className={inputClass}
            required
          />
        </div>

        {/* Email Address */}
        <div>
          {isHr && <label className={labelClass}>Email Address *</label>}
          {isSales && <label className={labelClass}>Email *</label>}
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder={isHr ? "e.g., admin@company.com" : isSales ? "e.g. john@company.com" : "Email"}
            className={inputClass}
            required
          />
        </div>

        {/* Password */}
        {(!editingId || !isHr) && (
          <div>
            {isHr && <label className={labelClass}>Password *</label>}
            {isSales && <label className={labelClass}>Password</label>}
            <div className="relative">
              <input
                name="password"
                type={showPassword || isHr ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                placeholder={isHr ? "Enter secure password" : isSales ? "Password" : "Password (optional)"}
                className={inputClass}
                required={isHr && !editingId}
              />
              {!isHr && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[var(--text-secondary)]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Department (Omitted for Sales Admin) */}
        {!isSales && (
          <div>
            {isHr && <label className={labelClass}>Department *</label>}
            <select
              name="department"
              value={form.department}
              onChange={handleChange}
              className={inputClass}
              required
            >
              <option value="">{isHr ? " -- Select Department --" : "Select Department"}</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sidebar Permissions */}
        <div className={isHr ? "border border-blue-300 rounded-lg p-4" : isSales ? "border rounded-lg p-4 bg-gray-50" : "border border-[var(--border-strong)] rounded-lg p-4"}>
          <label className={permissionHeadingClass}>
            Sidebar Permissions
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {availableSidebarOptions.map((option) => (
              <label
                key={option}
                className={checkboxLabelClass}
              >
                <input
                  type="checkbox"
                  checked={form.sidebarPermissions.includes(option)}
                  onChange={() => handlePermissionToggle(option)}
                  className={checkboxClass}
                />
                <span className={isHr ? "text-sm text-cyan-700" : isSales ? "text-sm text-gray-700" : "text-sm text-[var(--text-primary)]"}>
                  {option}
                </span>
              </label>
            ))}
          </div>
          <p className={isHr ? "text-xs text-cyan-600 mt-2" : isSales ? "text-xs text-gray-500 mt-2" : "text-xs text-[var(--text-secondary)] mt-2"}>
            {form.sidebarPermissions.length === 0
              ? "No permissions selected - user will see all options"
              : `${form.sidebarPermissions.length} permission(s) selected`}
          </p>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          className={buttonClass}
        >
          {editingId ? "Update User" : "Create User"}
        </button>
      </form>
    </div>
  );
});

UserForm.displayName = "UserForm";
export default UserForm;
