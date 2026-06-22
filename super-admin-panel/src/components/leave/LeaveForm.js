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
  dlInfo,
  monthlyUsage,
  cycleUsage,
  formLoading,
  onSubmit,
  onCancel,
}) {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox" && name === "isHalfDay") {
      setForm((prev) => ({
        ...prev,
        isHalfDay: checked,
        toDate: checked && prev.fromDate ? prev.fromDate : prev.toDate,
      }));
      return;
    }

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

  const bal = leaveBalance?.leaveBalance ?? {};
  // CL is unlimited — backend may send "Unlimited" string or 9999 number
  const clDisplay =
    bal.CL === "Unlimited" || bal.CL >= 9999 ? "Unlimited" : (bal.CL ?? 0);

  // DL: use new dlInfo structure
  const dlBalance = dlInfo?.currentBalance ?? bal.DL ?? 0;
  const dlAvailable = dlBalance > 0;

  // Cycle usage: how many PL/SL used so far in current 6-month cycle (out of 6)
  const cycPL = cycleUsage?.PL ?? 0;
  const cycSL = cycleUsage?.SL ?? 0;

  const plLimitReached = monthlyUsage.PL >= 1;
  const slLimitReached = monthlyUsage.SL >= 1;

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-blue-200">
      <h3 className="text-xl font-bold mb-4">
        {editingLeave ? "Edit Leave" : "Apply for Leave"}
      </h3>

      {/* Monthly limit warnings */}
      {plLimitReached && slLimitReached && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
          ⚠️ Monthly limit reached for both PL and SL for {monthLabel()}. Only
          CL and DL are available.
        </div>
      )}
      {plLimitReached && !slLimitReached && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded text-sm">
          ⚠️ Monthly limit reached for PL for {monthLabel()} ({monthlyUsage.PL}
          /1 used).
        </div>
      )}
      {slLimitReached && !plLimitReached && (
        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded text-sm">
          ⚠️ Monthly limit reached for SL for {monthLabel()} ({monthlyUsage.SL}
          /1 used).
        </div>
      )}
      {!dlAvailable && (
        <div className="mb-4 p-3 bg-orange-100 border border-orange-400 text-orange-700 rounded text-sm">
          ⚠️ No DL balance. DL is credited from unused PL + SL at the start of
          each new month.
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

              {/* PL — disabled if monthly limit reached */}
              <option value="PL" disabled={plLimitReached}>
                Privilege Leave (PL) — Balance: {bal.PL ?? 0}
                {plLimitReached
                  ? ` (Limit reached for ${monthShort()})`
                  : ` (${monthlyUsage.PL}/1 used this month · ${cycPL}/6 this cycle)`}
              </option>

              {/* CL — always available, show "Unlimited" */}
              <option value="CL">
                Casual Leave (CL) — Balance: {clDisplay}
              </option>

              {/* SL — disabled if monthly limit reached */}
              <option value="SL" disabled={slLimitReached}>
                Sick Leave (SL) — Balance: {bal.SL ?? 0}
                {slLimitReached
                  ? ` (Limit reached for ${monthShort()})`
                  : ` (${monthlyUsage.SL}/1 used this month · ${cycSL}/6 this cycle)`}
              </option>

              {/* DL — disabled if no balance */}
              <option value="DL" disabled={!dlAvailable}>
                Duty Leave (DL) — Balance: {dlBalance}
                {dlAvailable
                  ? " (Available)"
                  : " (No balance — earn DL from unused PL/SL)"}
              </option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block font-semibold mb-2">Leave Duration</label>
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

        {/* Half Day Toggle */}
        {form.fromDate && (
          <div className="space-y-4">
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
                Half Day
                {form.isHalfDay
                  ? ` — ${new Date(form.fromDate).toLocaleDateString()}`
                  : ""}
              </span>
            </label>

            {/* Half-day Period Selector */}
            {form.isHalfDay && (
              <div>
                <label className="block font-semibold mb-2">
                  Half-day Period
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="halfDayPeriod"
                      value="FIRST_HALF"
                      checked={form.halfDayPeriod === "FIRST_HALF"}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">First Half (Morning)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="halfDayPeriod"
                      value="SECOND_HALF"
                      checked={form.halfDayPeriod === "SECOND_HALF"}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">Second Half (Afternoon)</span>
                  </label>
                </div>
              </div>
            )}
          </div>
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
            {formLoading
              ? "Submitting..."
              : editingLeave
                ? "Update Leave"
                : "Apply Leave"}
          </button>
        </div>
      </form>
    </div>
  );
}
