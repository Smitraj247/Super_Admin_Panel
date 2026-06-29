export const toDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

export const getMonthRange = (month, year) => ({
  firstDay: `${year}-${String(month).padStart(2, "0")}-01`,
  lastDay: toDateStr(new Date(year, month, 0)),
});

export const formatDateTimeLocal = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}T${String(
    date.getHours(),
  ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

export const formatTime = (dateString) => {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const calculateBreakMinutes = (breaks = []) => {
  return breaks.reduce((total, brk) => {
    if (brk.breakIn && brk.breakOut) {
      return (
        total + (new Date(brk.breakOut) - new Date(brk.breakIn)) / (1000 * 60)
      );
    }
    return total;
  }, 0);
};

export const formatBreakTime = (breaks = []) => {
  const mins = calculateBreakMinutes(breaks);
  const hours = Math.floor(mins / 60);
  const remaining = Math.floor(mins % 60);
  return hours ? `${hours}h ${remaining}m` : `${remaining}m`;
};

export const calculateWorkingHours = (checkIn, checkOut, breaks = []) => {
  if (!checkIn || !checkOut) return "-";
  const totalMinutes = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60);
  const workMinutes = totalMinutes - calculateBreakMinutes(breaks);
  const hours = Math.floor(workMinutes / 60);
  const mins = Math.floor(workMinutes % 60);
  return `${hours}h ${mins}m`;
};

export const getTodayStr = () => {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date(),
  );
};
