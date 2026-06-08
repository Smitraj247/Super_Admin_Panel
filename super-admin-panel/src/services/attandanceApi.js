import API from "@/lib/api";

export const getAttendanceApi = (date) => API.get(`/attendance?date=${date}`);

export const checkInApi = (data) => API.post("/attendance/check-in", data);
export const breakInApi = (data) => API.post("/attendance/break-in", data);
export const breakOutApi = (data) => API.post("/attendance/break-out", data);
export const checkOutApi = (data) => API.post("/attendance/check-out", data);

export const getMonthlyAttendanceApi = (startDate, endDate) => {
  if (startDate && endDate) {
    return API.get(`/attendance?startDate=${startDate}&endDate=${endDate}`);
  }

  return API.get(`/attendance?startDate=${startDate}&endDate=${endDate}`);
};


export const getAllUsersAttendanceApi = (startDate, endDate) => {
  if (startDate && endDate) {
    return API.get(`/attendance/all?startDate=${startDate}&endDate=${endDate}`);
  }
  return API.get("/attendance/all");
};

export const updateAttendanceApi = (id, data) =>
  API.put(`/attendance/${id}`, data);


export const getAttendanceSummary = (startDate, endDate) => {
  if (!startDate || !endDate) {
    throw new Error("startDate and endDate are required");
  }

  return API.get(
    `/attendance/summary?startDate=${startDate}&endDate=${endDate}`,
  );
};



