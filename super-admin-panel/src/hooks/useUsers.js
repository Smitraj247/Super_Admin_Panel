import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import API from "@/lib/api";
import { useRealtime } from "@/hooks/useRealtime";
import { toast } from "react-toastify";

export const useUsers = ({
  apiPrefix = "/superadmin",
  fetchDepartments = true,
  defaultFormValues = {},
} = {}) => {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [chatUser, setChatUser] = useState(null);

  const initialForm = useMemo(
    () => ({
      name: "",
      email: "",
      password: "",
      role: "USER",
      department: "",
      totalHour: 0,
      workingHour: 0,
      birthday: "",
      sidebarPermissions: [
        "Dashboard",
        "Profile",
        "Chats",
        "Attendance",
        "Meetings",
        "Apply Leave",
      ],
      ...defaultFormValues,
    }),
    [defaultFormValues],
  );

  const [form, setForm] = useState(initialForm);

  const abortControllerRef = useRef(null);

  const fetchData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    try {
      const requests = [
        API.get(`${apiPrefix}/users`, {
          signal: abortControllerRef.current.signal,
        }),
      ];

      if (fetchDepartments) {
        requests.push(
          API.get(`${apiPrefix}/departments`, {
            signal: abortControllerRef.current.signal,
          }).catch(() => ({ data: [] })),
        );
      } else {
        requests.push(Promise.resolve({ data: [] }));
      }

      const [usersRes, deptsRes] = await Promise.all(requests);

      setUsers(usersRes.data.users || usersRes.data.data || usersRes.data || []);
      setDepartments(deptsRes.data || []);
    } catch (err) {
      if (axios.isCancel(err)) {
        console.log("Fetch canceled");
      } else {
        console.error("Fetch Error:", err);
      }
    } finally {
      setLoading(false);
    }
  }, [apiPrefix, fetchDepartments]);

  // Set up real-time event listeners
  const eventHandlers = useMemo(
    () => ({
      "user:deleted": () => fetchData(),
      "user:created": () => fetchData(),
      "user:updated": () => fetchData(),
    }),
    [fetchData],
  );

  useRealtime(eventHandlers);

  useEffect(() => {
    fetchData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  // Derived values
  const selectedDepartment = useMemo(
    () => departments.find((dept) => dept._id === form.department),
    [departments, form.department],
  );

  const deptName = useMemo(
    () => selectedDepartment?.name?.toLowerCase() || "",
    [selectedDepartment],
  );

  const getAvailableSidebarOptions = useCallback(() => {
    const baseOptions = [
      "Dashboard",
      "Profile",
      "Chats",
      "Attendance",
      "Meetings",
      "Apply Leave",
      "Leads",
      "Emails",
      "Followups",
      "Reports",
    ];

    if (deptName === "sales") {
      return [...baseOptions, "Leads", "Emails", "Followups", "Reports"];
    }

    if (deptName === "it") {
      return [...baseOptions, "Help Desk", "Network Monitor", "Projects"];
    }

    return baseOptions;
  }, [deptName]);

  const availableSidebarOptions = useMemo(
    () => getAvailableSidebarOptions(),
    [getAvailableSidebarOptions],
  );

  const handlePermissionToggle = useCallback((permission) => {
    setForm((prev) => ({
      ...prev,
      sidebarPermissions: prev.sidebarPermissions.includes(permission)
        ? prev.sidebarPermissions.filter((p) => p !== permission)
        : [...prev.sidebarPermissions, permission],
    }));
  }, []);

  const handleChange = useCallback(
    (e) => {
      const { name, type, value, checked } = e.target;
      const val = type === "checkbox" ? checked : value;

      if (name === "department") {
        const selectedDept = departments.find((dept) => dept._id === value);
        const selectedDeptName = selectedDept?.name?.toLowerCase() || "";

        if (selectedDeptName === "sales") {
          setForm((prev) => ({
            ...prev,
            [name]: value,
            sidebarPermissions: [
              "Dashboard",
              "Profile",
              "Chats",
              "Attendance",
              "Meetings",
              "Leads",
              "Emails",
              "Followups",
              "Reports",
              "Apply Leave",
            ],
          }));
        } else {
          setForm((prev) => ({ ...prev, [name]: value }));
        }
      } else {
        setForm((prev) => ({ ...prev, [name]: val }));
      }
    },
    [departments],
  );

  const startEdit = useCallback((user) => {
    setEditingId(user._id);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role?.name || "USER",
      department: user.department?._id || "",
      totalHour: user.totalHour || 0,
      workingHour: user.workingHour || 0,
      birthday: user.birthday ? user.birthday.split("T")[0] : "",
      sidebarPermissions: user.sidebarPermissions || [],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const deleteUser = useCallback(
    async (id) => {
      if (!confirm("Are you sure you want to remove this user?")) return;
      try {
        await API.delete(`${apiPrefix}/users/${id}`);
        setUsers((prev) => prev.filter((u) => u._id !== id));
        toast.success("User deleted successfully");
      } catch (err) {
        console.error(err.response?.data);
        toast.error("Failed to delete user");
      }
    },
    [apiPrefix],
  );

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!form.name || !form.email) {
        toast.error("Please fill all required fields");
        return;
      }

      try {
        const payload = {
          name: form.name,
          email: form.email,
          sidebarPermissions: form.sidebarPermissions,
        };

        if (form.password) payload.password = form.password;
        if (form.role) payload.role = form.role;
        if (form.department) payload.department = form.department;
        if (form.totalHour !== undefined) payload.totalHour = Number(form.totalHour);
        if (form.workingHour !== undefined) payload.workingHour = Number(form.workingHour);
        if (form.birthday) payload.birthday = form.birthday;

        if (editingId) {
          const res = await API.put(`${apiPrefix}/users/${editingId}`, payload);
          setUsers((prev) =>
            prev.map((u) => (u._id === editingId ? res.data?.data || res.data : u)),
          );
          setEditingId(null);
          toast.success("User updated successfully");
        } else {
          // Supply default password if none is provided
          if (!payload.password) payload.password = "123456";
          const res = await API.post(`${apiPrefix}/users`, payload);
          setUsers((prev) => [...prev, res.data?.data || res.data]);
          toast.success("User created successfully");
        }

        // Reset form
        setForm(initialForm);
      } catch (err) {
        toast.error(err.response?.data?.message || "Operation failed");
      }
    },
    [form, editingId, apiPrefix, initialForm],
  );

  // Memoized search filtering
  const filteredUsers = useMemo(() => {
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.role?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.department?.name?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [users, searchQuery]);

  return {
    users,
    departments,
    searchQuery,
    setSearchQuery,
    loading,
    editingId,
    setEditingId,
    showPassword,
    setShowPassword,
    chatUser,
    setChatUser,
    form,
    setForm,
    handleChange,
    handleSubmit,
    deleteUser,
    startEdit,
    handlePermissionToggle,
    availableSidebarOptions,
    filteredUsers,
  };
};
