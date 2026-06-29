/**
 * Timezone and Date Helper Utilities (IST = UTC+5:30)
 */

/**
 * Returns today's date string in YYYY-MM-DD format using IST timezone.
 * Prevents the UTC midnight shift that would return yesterday for IST users.
 */
export const getToday = () => {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date(),
  );
};

/**
 * Builds a YYYY-MM-DD string for the 1st of a given month.
 */
export const monthFirstDay = (year, month) =>
  `${year}-${String(month).padStart(2, "0")}-01`;

/**
 * Builds a YYYY-MM-DD string for the last day of a given month.
 */
export const monthLastDay = (year, month) => {
  const d = new Date(year, month, 0); // day 0 of next month = last day of `month`
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Converts a YYYY-MM-DD string to a local midnight Date without any UTC shift.
 */
export const localDate = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/**
 * Returns the YYYY-MM-DD string for a local Date without UTC conversion.
 */
export const toDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * First day the employee should be counted for attendance (IST).
 * Uses joiningDate when set, otherwise account creation date.
 */
export const getUserEmploymentStartStr = (user) => {
  if (!user) return null;
  const raw = user.joiningDate || user.createdAt;
  if (!raw) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date(raw));
};

/**
 * Empty summary template.
 */
export const emptySummary = () => ({
  totalDays: 0,
  present: 0,
  pending: 0,
  absent: 0,
  halfDay: 0,
  totalOffice: 0,
  totalWorkHours: 0,
  totalOfficeHours: 0,
  productivity: 0,
  leaves: 0,
  lateCount: 0,
  attendanceRate: 0,
  avgWorkHours: 0,
  expectedWorkingDays: 0,
});

/**
 * Returns the date string (YYYY-MM-DD) of the last Saturday in a given month and year.
 */
export const getLastSaturday = (year, month) => {
  const lastDay = new Date(year, month, 0);
  while (lastDay.getDay() !== 6) {
    lastDay.setDate(lastDay.getDate() - 1);
  }
  return toDateStr(lastDay);
};
