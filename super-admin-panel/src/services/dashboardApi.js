import API from "@/lib/api";

export const getDashboardStatsApi = () =>
  API.get("/attendance/dashboard-stats");

export const getWeeklyAttendanceApi = () => API.get("/attendance/weekly-stats");


export const getAttendanceHistoryApi = (
  startDate,
  endDate,
  page = 1,
  limit = 10,
) => {
  const params = new URLSearchParams();
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  params.append("page", page);
  params.append("limit", limit);

  return API.get(`/attendance?${params.toString()}`);
};
