"use client";

/**
 * Shared leave application form used by both HR admin and Employee pages.
 * Handles: leave type, date range, half-day toggle, reason, and all warnings.
 */
export default function LeaveForm({
  form,
  setForm,
  editingLeave,
  leaveBalance,
  dlEligibility,
  monthlyUsage,
  formLoading,
  onSubmit,
  onCancel,
}) {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox" && name === "isHalfDay") {
      // When toggling half-day on, set toDate = fromDate
      setForm((prev) => ({
        ...prev,
        isHalfDay: checked,
        toDate: checked && prev.fromDate ? prev.fromDate : prev.toDate,
      }));
      return;
    }

    // When fromDate changes while half-day is on, keep toDate in sync
    if (name === "fromDate" && form.isHalfDay) {
      setForm((prev) => ({ ...prev, fromDate: value, toDate: value }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const monthLabel = (fallback = new Date()) => {
    const d = form.fromDate ? new Date(form.fromDate) : fallback;
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const monthShort = (fallback = new Date()) => {
    const d = form.fromDate ? new Date(form.fromDate) : fallback;
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-blue-200">
      <h3 className="text-xl font-bold mb-4">
        {editingLeave ? "Edit Leave" : "Apply for Leave"}
      </h3>

      {/* Monthly limit warnings */}
      {monthlyUsage.PL >= 1 && monthlyUsage.SL >= 1 && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          ⚠️ Monthly limit reached for both PL and SL for {monthLabel()}. Only CL and DL are available.
        </div>
      )}
      {monthlyUsage.PL >= 1 && monthlyUsage.SL < 1 && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded text-sm">
          ⚠️ Monthly limit reached for PL for {monthLabel()} ({monthlyUsage.PL}/1 used).
        </div>
      )}
      {monthlyUsage.SL >= 1 && monthlyUsage.PL < 1 && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded text-sm">
          ⚠️ Monthly limit reached for SL for {monthLabel()} ({monthlyUsage.SL}/1 used).
        </div>
      )}
      {dlEligibility && !dlEligibility.eligible && (
        <div className="mb-4 p-3 bg-orange-100 border border-orange-400 text-orange-700 rounded text-sm">
          ⚠️ DL not available — {dlEligibility.reason}.
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Leave Type */}
          <div>
            <label className="block font-semibold mb-2">Leave Type</label>
            <select
              name="leaveType"
              value={form.leaveType}
              onChange={handleChange}
              className="w-full border p-2 rounded focus:outline-none focus:border-blue-500"
              required
            >
              <option value="">Select Leave Type</option>
              <option value="PL" disabled={monthlyUsage.PL >= 1}>
                Privilege Leave (PL) — Balance: {leaveBalance?.leaveBalance?.PL ?? 0}
                {monthlyUsage.PL >= 1
                  ? ` (Limit reached for ${monthShort()})`
                  : ` (${monthlyUsage.PL}/1 used)`}
              </option>
              <option value="CL">
                Casual Leave (CL) — Balance: {leaveBalance?.leaveBalance?.CL ?? 0}
              </option>
              <option value="SL" disabled={monthlyUsage.SL >= 1}>
                Sick Leave (SL) — Balance: {leaveBalance?.leaveBalance?.SL ?? 0}
                {monthlyUsage.SL >= 1
                  ? ` (Limit reached for ${monthShort()})`
                  : ` (${monthlyUsage.SL}/1 used)`}
              </option>
              <option value="DL" disabled={dlEligibility && !dlEligibility.eligible}>
                Duty Leave (DL) — Balance: {leaveBalance?.leaveBalance?.DL ?? 0}
                {dlEligibility?.eligible ? " (Eligible)" : " (Not eligible — PL/CL taken last month)"}
              </option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block font-semibold mb-2">
              Leave Duration
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="date"
                name="fromDate"
                value={form.fromDate}
                onChange={handleChange}
                className="flex-1 border p-2 rounded focus:outline-none focus:border-blue-500"
                required
              />
              {!form.isHalfDay && (
                <>
                  <span className="text-gray-400">→</span>
                  <input
                    type="date"
                    name="toDate"
                    value={form.toDate}
                    onChange={handleChange}
                    min={form.fromDate}
                    className="flex-1 border p-2 rounded focus:outline-none focus:border-blue-500"
                    required
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Half Day Toggle — only shown when a single date is selected */}
        {form.fromDate && (
          <label className="flex items-center gap-3 cursor-pointer select-none w-fit">
            <div className="relative">
              <input
                type="checkbox"
                name="isHalfDay"
                checked={form.isHalfDay || false}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-300 rounded-full peer-checked:bg-blue-500 transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              Half Day{form.isHalfDay ? ` — ${new Date(form.fromDate).toLocaleDateString()}` : ""}
            </span>
          </label>
        )}

        {/* Reason */}
        <div>
          <label className="block font-semibold mb-2">Reason</label>
          <textarea
            name="reason"
            value={form.reason}
            onChange={handleChange}
            className="w-full border p-2 rounded focus:outline-none focus:border-blue-500"
            rows="3"
            placeholder="Enter reason for leave..."
            required
          />
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={formLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
          >
            {formLoading ? "Submitting..." : editingLeave ? "Update Leave" : "Apply Leave"}
          </button>
        </div>
      </form>
    </div>
  );
}
