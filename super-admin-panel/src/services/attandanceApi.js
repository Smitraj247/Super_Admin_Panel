import API from "@/lib/api";

export const getAttendanceApi = (date) => API.get(`/attendance?date=${date}`);

export const checkInApi  = (data) => API.post("/attendance/check-in",  data);
export const breakInApi  = (data) => API.post("/attendance/break-in",  data);
export const breakOutApi = (data) => API.post("/attendance/break-out", data);
export const checkOutApi = (data) => API.post("/attendance/check-out", data);

export const getMonthlyAttendanceApi = (startDate, endDate) =>
  API.get(`/attendance?startDate=${startDate}&endDate=${endDate}`);

export const getAllUsersAttendanceApi = (startDate, endDate) =>
  startDate && endDate
    ? API.get(`/attendance/all?startDate=${startDate}&endDate=${endDate}`)
    : API.get("/attendance/all");

export const updateAttendanceApi = (id, data) => API.put(`/attendance/${id}`, data);

export const getUserAttendanceByIdApi = (userId, startDate, endDate) => {
  let url = `/attendance/user/${userId}`;
  if (startDate && endDate) url += `?startDate=${startDate}&endDate=${endDate}`;
  return API.get(url);
};

export const getAttendanceSummary = (startDate, endDate) => {
  if (!startDate || !endDate) throw new Error("startDate and endDate are required");
  return API.get(`/attendance/summary?startDate=${startDate}&endDate=${endDate}`);
};

// Returns { period, todayStats, userStats } — all calculations done on the backend
export const getAllUsersSummaryApi = (year, month) =>
  API.get(`/attendance/all-summary?year=${year}&month=${month}`);

// Returns computeSummary result for a specific user (admin use)
export const getUserSummaryByIdApi = (userId, year, month) =>
  API.get(`/attendance/user/${userId}/summary?year=${year}&month=${month}`);

// Admin: Add breaks to an existing attendance record
export const addBreaksToRecordApi = (recordId, breaks) =>
  API.post(`/attendance/${recordId}/breaks`, { breaks });

// Admin: Create a new break entry for any user (optionally creates attendance record)
export const adminCreateBreakEntryApi = (userId, date, breaks) =>
  API.post(`/attendance/user/${userId}/create-break`, { userId, date, breaks });
