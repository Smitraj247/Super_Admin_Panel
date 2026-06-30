"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import {
  getAllUsersWithLeavesApi,
  getUserLeaveHistoryApi,
  updateSuperAdminLeaveStatusApi,
} from "@/services/leaveApi";
import { uploadReportToDriveApi } from "@/services/superAdminApi";
import { useRealtime } from "@/hooks/useRealtime";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export const useLeaves = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userLeaves, setUserLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [userPendingLeaves, setUserPendingLeaves] = useState({});

  // Leave filters
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [statusFilter, setStatusFilter] = useState("");

  // Drive upload state
  const [uploadingToDrive, setUploadingToDrive] = useState(false);

  const usersAbortControllerRef = useRef(null);
  const leavesAbortControllerRef = useRef(null);

  const fetchUsers = useCallback(async () => {
    if (usersAbortControllerRef.current) {
      usersAbortControllerRef.current.abort();
    }
    usersAbortControllerRef.current = new AbortController();

    setLoading(true);
    try {
      const res = await getAllUsersWithLeavesApi(selectedYear, selectedMonth, {
        signal: usersAbortControllerRef.current.signal,
      });
      const data = res.data?.data || res.data || [];
      setUsers(data);
      setFilteredUsers(data);

      // Extract pending leave counts from user data
      const pendingCounts = {};
      data.forEach((user) => {
        pendingCounts[user._id] = user.pendingLeaveCount || 0;
      });
      setUserPendingLeaves(pendingCounts);
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log("Users fetch canceled");
      } else {
        console.error("Error fetching users:", error);
        toast.error("Failed to fetch users");
      }
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  const fetchUserLeaves = useCallback(
    async (userId) => {
      if (leavesAbortControllerRef.current) {
        leavesAbortControllerRef.current.abort();
      }
      leavesAbortControllerRef.current = new AbortController();

      setLoading(true);
      try {
        const res = await getUserLeaveHistoryApi(
          userId,
          selectedYear,
          selectedMonth,
          {
            signal: leavesAbortControllerRef.current.signal,
          },
        );
        const data = res.data?.data || res.data || {};
        setSelectedUser(data.user);
        setUserLeaves(data.leaves || []);
      } catch (error) {
        if (axios.isCancel(error)) {
          console.log("Leaves fetch canceled");
        } else {
          console.error("Error fetching user leaves:", error);
          toast.error("Failed to fetch leave history");
        }
      } finally {
        setLoading(false);
      }
    },
    [selectedYear, selectedMonth],
  );

  // Set up realtime event listeners
  const eventHandlers = useMemo(
    () => ({
      "user:deleted": () => fetchUsers(),
      "user:created": () => fetchUsers(),
      "user:updated": () => fetchUsers(),
      "leave:created": () => fetchUsers(),
      "leave:updated": () => {
        fetchUsers();
        if (selectedUser) {
          fetchUserLeaves(selectedUser._id);
        }
      },
    }),
    [fetchUsers, fetchUserLeaves, selectedUser],
  );

  useRealtime(eventHandlers);

  useEffect(() => {
    fetchUsers();
    return () => {
      if (usersAbortControllerRef.current) {
        usersAbortControllerRef.current.abort();
      }
    };
  }, [fetchUsers]);

  // Filter users based on query details
  useEffect(() => {
    let filtered = users;

    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    if (roleFilter) {
      filtered = filtered.filter((user) => user.role?.name === roleFilter);
    }

    if (departmentFilter) {
      filtered = filtered.filter(
        (user) => user.department?._id === departmentFilter,
      );
    }

    setFilteredUsers(filtered);
  }, [searchQuery, roleFilter, departmentFilter, users]);

  useEffect(() => {
    if (selectedUser) {
      fetchUserLeaves(selectedUser._id);
    }
    return () => {
      if (leavesAbortControllerRef.current) {
        leavesAbortControllerRef.current.abort();
      }
    };
  }, [fetchUserLeaves, selectedUser?._id]);

  const handleUserClick = useCallback(
    (user) => {
      setSelectedUser(user);
      fetchUserLeaves(user._id);
    },
    [fetchUserLeaves],
  );

  const handleBackToList = useCallback(() => {
    setSelectedUser(null);
    setUserLeaves([]);
    setStatusFilter("");
  }, []);

  const handleStatusUpdate = useCallback(
    async (leaveId, newStatus) => {
      if (!selectedUser) return;
      try {
        await updateSuperAdminLeaveStatusApi(leaveId, newStatus);
        toast.success(`Leave ${newStatus.toLowerCase()} successfully`);
        fetchUserLeaves(selectedUser._id);

        // Update pending count for the user
        if (newStatus !== "PENDING") {
          setUserPendingLeaves((prev) => ({
            ...prev,
            [selectedUser._id]: Math.max(0, (prev[selectedUser._id] || 0) - 1),
          }));
        }
      } catch (error) {
        console.error("Error updating leave status:", error);
        toast.error("Failed to update leave status");
      }
    },
    [selectedUser, fetchUserLeaves],
  );

  const filteredLeaves = useMemo(() => {
    return userLeaves.filter(
      (leave) => !statusFilter || leave.status === statusFilter,
    );
  }, [userLeaves, statusFilter]);

  const generateReport = useCallback(() => {
    const csvContent = [
      [
        "Name",
        "Email",
        "Department",
        "Leave Type",
        "From Date",
        "To Date",
        "Duration",
        "Reason",
        "Status",
        "Applied On",
      ],
      ...filteredLeaves.map((leave) => [
        leave.user?.name || "N/A",
        leave.user?.email || "N/A",
        leave.user?.department?.name || "N/A",
        leave.leaveType,
        new Date(leave.fromDate).toLocaleDateString(),
        new Date(leave.toDate).toLocaleDateString(),
        leave.isHalfDay ? "Half Day" : "Full Day",
        leave.reason,
        leave.status,
        new Date(leave.createdAt).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leave-report-${selectedUser?.name || "all"}-${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date())}.csv`;
    a.click();
  }, [filteredLeaves, selectedUser]);

  const uniqueDepartments = useMemo(() => {
    return Array.from(
      new Set(users.map((u) => u.department?._id).filter(Boolean)),
    ).map((id) => users.find((u) => u.department?._id === id)?.department);
  }, [users]);

  const uniqueRoles = useMemo(() => {
    return Array.from(new Set(users.map((u) => u.role?.name).filter(Boolean)));
  }, [users]);

  const leaveStats = useMemo(() => {
    return {
      total: filteredLeaves.length,
      pending: filteredLeaves.filter((l) => l.status === "PENDING").length,
      approved: filteredLeaves.filter((l) => l.status === "APPROVED").length,
      rejected: filteredLeaves.filter((l) => l.status === "REJECTED").length,
    };
  }, [filteredLeaves]);

  const years = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  }, []);

  const months = useMemo(() => {
    return [
      { value: 1, label: "January" },
      { value: 2, label: "February" },
      { value: 3, label: "March" },
      { value: 4, label: "April" },
      { value: 5, label: "May" },
      { value: 6, label: "June" },
      { value: 7, label: "July" },
      { value: 8, label: "August" },
      { value: 9, label: "September" },
      { value: 10, label: "October" },
      { value: 11, label: "November" },
      { value: 12, label: "December" },
    ];
  }, []);

  // Uploads a given file blob to Google Drive via the backend route
  const uploadReportToDrive = useCallback(async (fileBlob, fileName) => {
    const formData = new FormData();
    formData.append("file", fileBlob, fileName);
    formData.append("fileName", fileName);

    setUploadingToDrive(true);
    try {
      const res = await uploadReportToDriveApi(formData);
      toast.success("Report uploaded to Drive");
      return res.data?.webViewLink;
    } catch (error) {
      console.error("Drive upload failed:", error);
      toast.error("Failed to upload report to Drive");
      return null;
    } finally {
      setUploadingToDrive(false);
    }
  }, []);

  const downloadReport = useCallback(async () => {
    const reportData = filteredUsers.map((user) => ({
      Name: user.name || "-",
      "Total Office Hours": user.totalHour?.toFixed(1) || "0.0",
      "Total Worked Hours": user.workingHour?.toFixed(1) || "0.0",
      "Total Leaves Applied": user.totalLeavesApplied || 0,
      "PL (Monthly Used)": user.leaveBalance?.usedPL || 0,
      "SL (Monthly Used)": user.leaveBalance?.usedSL || 0,
      "CL (Used)": user.leaveBalance?.monthlyUsedCL || 0,
      "CL(PL Remaining Used)": user.leaveBalance?.monthlyUsedDL || 0,
      "PL (Remaining)": user.leaveBalance?.DL || 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employee Report");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });

    const fileData = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const fileName = `Employee_Leave_Report_${selectedMonth}_${selectedYear}_${new Date().toISOString().split("T")[0]}.xlsx`;

    // Local download (remove this line if you only want it uploaded to Drive)
    saveAs(fileData, fileName);

    // Upload the same file to Google Drive
    await uploadReportToDrive(fileData, fileName);
  }, [filteredUsers, selectedMonth, selectedYear, uploadReportToDrive]);

  const totalPendingLeavesCount = useMemo(() => {
    return Object.values(userPendingLeaves).reduce((a, b) => a + b, 0);
  }, [userPendingLeaves]);

  return {
    users,
    filteredUsers,
    selectedUser,
    setSelectedUser,
    userLeaves,
    loading,
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    departmentFilter,
    setDepartmentFilter,
    userPendingLeaves,
    selectedYear,
    setSelectedYear,
    selectedMonth,
    setSelectedMonth,
    statusFilter,
    setStatusFilter,
    handleUserClick,
    handleBackToList,
    handleStatusUpdate,
    generateReport,
    downloadReport,
    uploadingToDrive,
    uniqueDepartments,
    uniqueRoles,
    filteredLeaves,
    leaveStats,
    years,
    months,
    totalPendingLeavesCount,
  };
};
