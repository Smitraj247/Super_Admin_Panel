"use client";

import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { useRouter } from "next/router";
import {
  User,
  Mail,
  Shield,
  Settings,
  X,
  Save,
  Phone,
  Calendar,
  Heart,
  Briefcase,
  Users,
  MapPin,
  Palette,
  Folder,
} from "lucide-react";
import { useState, useEffect } from "react";
import { getProfile, updateProfile } from "@/services/userApi";

export default function ProfilePage() {
  const { user, login } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  const [messageType, setMessageType] = useState("");
  const [profileData, setProfileData] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    personalEmail: "",
    companyEmail: "",
    phone: "",
    gender: "Male",
    birthday: "",
    maritalStatus: "Unmarried",
    marriageAnniversary: "",
    designation: "",
    batch: "",
    joiningDate: "",
    probationEndDate: "",
    address: {
      street: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
    },
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setFetchLoading(true);

      const res = await getProfile();

      const data = res?.data?.data || res?.data;

      setProfileData(data);

      setFormData({
        name: data?.name || "",
        email: data?.email || "",
        personalEmail: data?.personalEmail || "",
        companyEmail: data?.companyEmail || "",
        phone: data?.phone || "",
        gender: data?.gender || "Male",
        birthday: data?.birthday ? data.birthday.split("T")[0] : "",
        maritalStatus: data?.maritalStatus || "Unmarried",
        marriageAnniversary: data?.marriageAnniversary
          ? data.marriageAnniversary.split("T")[0]
          : "",
        designation: data?.designation || "",
        batch: data?.batch || "",
        joiningDate: data?.joiningDate ? data.joiningDate.split("T")[0] : "",
        probationEndDate: data?.probationEndDate
          ? data.probationEndDate.split("T")[0]
          : "",
        address: {
          street: data?.address?.street || "",
          city: data?.address?.city || "",
          state: data?.address?.state || "",
          country: data?.address?.country || "",
          postalCode: data?.address?.postalCode || "",
        },
      });
    } catch (error) {
      console.log(error);
    } finally {
      setFetchLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setMessage("");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setMessage("");
    // Reset form data
    if (profileData) {
      setFormData({
        name: profileData.name || "",
        email: profileData.email || "",
        personalEmail: profileData.personalEmail || "",
        companyEmail: profileData.companyEmail || "",
        phone: profileData.phone || "",
        gender: profileData.gender || "Male",
        birthday: profileData.birthday
          ? new Date(profileData.birthday).toISOString().split("T")[0]
          : "",
        maritalStatus: profileData.maritalStatus || "Unmarried",
        marriageAnniversary: profileData.marriageAnniversary
          ? new Date(profileData.marriageAnniversary)
              .toISOString()
              .split("T")[0]
          : "",
        designation: profileData.designation || "",
        batch: profileData.batch || "",
        joiningDate: profileData.joiningDate
          ? new Date(profileData.joiningDate).toISOString().split("T")[0]
          : "",
        probationEndDate: profileData.probationEndDate
          ? new Date(profileData.probationEndDate).toISOString().split("T")[0]
          : "",
        address: {
          street: profileData?.address?.street || "",
          city: profileData?.address?.city || "",
          state: profileData?.address?.state || "",
          country: profileData?.address?.country || "",
          postalCode: profileData?.address?.postalCode || "",
        },
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Handle nested address fields
    if (name.startsWith("address.")) {
      const addressField = name.split(".")[1];
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          [addressField]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      console.log("=== SUBMITTING FORM ===");
      console.log("Form data:", formData);

      const res = await updateProfile(formData);
      console.log("Update response:", res.data);

      // Refresh profile data WITHOUT setting fetchLoading
      const profileRes = await getProfile();
      console.log("Fresh profile data:", profileRes.data);

      const freshData = profileRes.data.data || profileRes.data;
      console.log("Extracted fresh data:", freshData);
      console.log("Personal Email in fresh data:", freshData?.personalEmail);

      // Update profileData state
      setProfileData(freshData);

      // Update formData state
      setFormData({
        name: freshData.name || "",
        email: freshData.email || "",
        personalEmail: freshData.personalEmail || "",
        companyEmail: freshData.companyEmail || "",
        phone: freshData.phone || "",
        gender: freshData.gender || "Male",
        birthday: freshData.birthday
          ? new Date(freshData.birthday).toISOString().split("T")[0]
          : "",
        maritalStatus: freshData.maritalStatus || "Unmarried",
        marriageAnniversary: freshData.marriageAnniversary
          ? new Date(freshData.marriageAnniversary).toISOString().split("T")[0]
          : "",
        designation: freshData.designation || "",
        batch: freshData.batch || "",
        joiningDate: freshData.joiningDate
          ? new Date(freshData.joiningDate).toISOString().split("T")[0]
          : "",
        probationEndDate: freshData.probationEndDate
          ? new Date(freshData.probationEndDate).toISOString().split("T")[0]
          : "",
        address: {
          street: freshData?.address?.street || "",
          city: freshData?.address?.city || "",
          state: freshData?.address?.state || "",
          country: freshData?.address?.country || "",
          postalCode: freshData?.address?.postalCode || "",
        },
      });

      // Update the user context with new data
      const currentToken =
        sessionStorage.getItem("token") || localStorage.getItem("token");
      login({ token: currentToken, user: freshData });

      console.log("=== UPDATE COMPLETE ===");
      console.log("ProfileData state:", freshData);

      setMessage("Profile updated successfully!");
      setMessageType("success");
      setIsEditing(false);

      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Update profile error:", error);
      console.error("Error details:", error.response?.data);
      setMessage(error.response?.data?.message || "Failed to update profile");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const calculateWorkDuration = () => {
    if (!profileData?.joiningDate) return "N/A";
    const joining = new Date(profileData.joiningDate);
    const now = new Date();
    const diffTime = Math.abs(now - joining);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} Days`;
  };

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Navbar />
        <main className="md:pl-64 pt-16 flex items-center justify-center">
          <div className="text-center">
            <div className="h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading profile...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Navbar />

      <main className="md:pl-64 pt-16 min-h-screen">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          <div className="relative flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-6 rounded-2xl px-4 sm:px-10 py-6 sm:py-8 min-h-[180px] mb-6 shadow-sm bg-gradient-to-t from-white via-gray-50 to-gray-200">
            {/* EDIT BUTTON (TOP RIGHT) */}
            <div className="absolute top-4 right-4">
              {!isEditing ? (
                <button
                  onClick={handleEdit}
                  type="button"
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                >
                  <Settings size={18} />
                  Edit
                </button>
              ) : (
                <button
                  onClick={handleCancel}
                  type="button"
                  className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
                >
                  <X size={18} />
                  Cancel
                </button>
              )}
            </div>

            {/* Profile Image */}
            <div className="w-[90px] h-[90px] sm:w-[120px] sm:h-[120px] rounded-xl overflow-hidden border-4 border-white shadow-md flex-shrink-0">
              <img
                src="https://demos.themeselection.com/materio-mui-nextjs-admin-template/demo-1/images/avatars/1.png"
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>

            {/* User Info */}
            <div className="flex flex-col items-center sm:items-start gap-2 text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
                {user.name}
              </h1>

              <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-6 items-center sm:items-start">
                <div className="flex gap-2 items-center">
                  <Palette size={18} />
                  <p className="font-medium text-gray-500 text-sm sm:text-base">
                    {formData.designation}
                  </p>
                </div>

                <div className="flex gap-2 items-center">
                  <MapPin size={18} />
                  <p className="font-medium text-gray-500 text-sm sm:text-base">
                    {formData.address.street}
                  </p>
                </div>

                <div className="flex gap-2 items-center">
                  <Calendar size={18} />
                  <p className="font-medium text-gray-500 text-sm sm:text-base">
                    {formData.joiningDate}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 h-[44px] mb-10">
            {/* PROFILE */}
            <div
              className={`flex items-center p-4 rounded-lg cursor-pointer transition
              ${
                activeTab === "profile"
                  ? "bg-violet-500 text-white"
                  : "hover:bg-violet-100"
              }`}
              onClick={() => setActiveTab("profile")}
            >
              <User
                size={24}
                className={`mr-3 ${
                  activeTab === "profile" ? "text-white" : "text-indigo-600"
                }`}
              />
              <span className="text-lg font-medium">Profile</span>
            </div>

            {/* TEAMS */}
            <div
              className={`flex items-center p-4 rounded-lg cursor-pointer transition
               ${
                 activeTab === "teams"
                   ? "bg-violet-500 text-white"
                   : "hover:bg-violet-100"
               }`}
              onClick={() => setActiveTab("teams")}
            >
              <Users
                size={24}
                className={`mr-3 ${
                  activeTab === "teams" ? "text-white" : "text-indigo-600"
                }`}
              />
              <span className="text-lg font-medium">Teams</span>
            </div>

            {/* PROJECTS */}
            <div
              className={`flex items-center p-4 rounded-lg cursor-pointer transition
             ${
               activeTab === "projects"
                 ? "bg-violet-500 text-white"
                 : "hover:bg-violet-100"
             }`}
              onClick={() => setActiveTab("projects")}
            >
              <Folder
                size={24}
                className={`mr-3 ${
                  activeTab === "projects" ? "text-white" : "text-indigo-600"
                }`}
              />
              <span className="text-lg font-medium">Projects</span>
            </div>
          </div>

          {/* <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            {activeTab === 'profile' && (
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 ">
                My Profile
              </h1>
            )}
            {activeTab === 'teams' && (
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 ">
                Teams Overview
              </h1>
            )}
            {activeTab === 'projects' && (
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 ">
                Projects Overview
              </h1>
            )}
          </div> */}

          {message && (
            <div
              className={`mb-6 p-4 rounded-lg font-semibold ${
                messageType === "success"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Right Content - Profile Details */}
            <div className="lg:col-span-2">
              {activeTab === "profile" &&
                (isEditing ? (
                  <form
                    onSubmit={handleSubmit}
                    className="bg-white rounded-lg shadow-sm border border-slate-200"
                  >
                    <div className="p-6 border-b border-slate-200">
                      <h3 className="text-xl font-bold text-slate-900">
                        Edit Profile
                      </h3>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Basic Information */}
                      <div>
                        <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                          <User size={20} />
                          Basic Information
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Full Name
                            </label>
                            <input
                              type="text"
                              name="name"
                              value={user.name}
                              onChange={handleChange}
                              required
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Personal Email
                            </label>
                            <input
                              type="email"
                              name="personalEmail"
                              value={formData.personalEmail}
                              onChange={handleChange}
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Company Email
                            </label>
                            <input
                              type="email"
                              name="companyEmail"
                              value={formData.companyEmail}
                              onChange={handleChange}
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Gender
                            </label>
                            <select
                              name="gender"
                              value={formData.gender}
                              onChange={handleChange}
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Birthday
                            </label>
                            <input
                              type="date"
                              name="birthday"
                              value={formData.birthday}
                              onChange={handleChange}
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Marital Status
                            </label>
                            <select
                              name="maritalStatus"
                              value={formData.maritalStatus}
                              onChange={handleChange}
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="Single">Single</option>
                              <option value="Married">Married</option>
                              <option value="Unmarried">Unmarried</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Marriage Anniversary
                            </label>
                            <input
                              type="date"
                              name="marriageAnniversary"
                              value={formData.marriageAnniversary}
                              onChange={handleChange}
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Phone
                            </label>
                            <input
                              type="tel"
                              name="phone"
                              value={formData.phone}
                              onChange={handleChange}
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Company Information */}
                      <div>
                        <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                          <Briefcase size={20} />
                          Company Relation
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Designation
                            </label>
                            <input
                              type="text"
                              name="designation"
                              value={formData.designation}
                              onChange={handleChange}
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Batch
                            </label>
                            <input
                              type="text"
                              name="batch"
                              value={formData.batch}
                              onChange={handleChange}
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Joining Date
                            </label>
                            <input
                              type="date"
                              name="joiningDate"
                              value={formData.joiningDate}
                              onChange={handleChange}
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Probation End Date
                            </label>
                            <input
                              type="date"
                              name="probationEndDate"
                              value={formData.probationEndDate}
                              onChange={handleChange}
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Address Information */}
                      <div>
                        <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                          <Mail size={20} />
                          Address
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Street Address
                            </label>
                            <input
                              type="text"
                              name="address.street"
                              value={formData.address.street}
                              onChange={handleChange}
                              placeholder="Enter street address"
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              City
                            </label>
                            <input
                              type="text"
                              name="address.city"
                              value={formData.address.city}
                              onChange={handleChange}
                              placeholder="Enter city"
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              State
                            </label>
                            <input
                              type="text"
                              name="address.state"
                              value={formData.address.state}
                              onChange={handleChange}
                              placeholder="Enter state"
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Country
                            </label>
                            <input
                              type="text"
                              name="address.country"
                              value={formData.address.country}
                              onChange={handleChange}
                              placeholder="Enter country"
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Postal Code
                            </label>
                            <input
                              type="text"
                              name="address.postalCode"
                              value={formData.address.postalCode}
                              onChange={handleChange}
                              placeholder="Enter postal code"
                              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:bg-gray-400"
                        >
                          {loading ? (
                            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <>
                              <Save size={18} />
                              Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                    <div className="p-6 border-b border-slate-200">
                      <h3 className="text-xl font-bold text-slate-900">
                        About
                      </h3>
                    </div>

                    <div className="p-6 space-y-8">
                      {/* Basic Information */}
                      <div>
                        <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                          <User size={20} />
                          Basic Information
                        </h4>{" "}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">FullName</p>
                            <p className="font-medium text-gray-900">
                              {profileData?.name}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              Personal Email
                            </p>
                            <p className="font-medium text-blue-600">
                              {profileData?.personalEmail || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              Company Email
                            </p>
                            <p className="font-medium text-gray-900">
                              {profileData?.companyEmail || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Gender</p>
                            <p className="font-medium text-gray-900">
                              {profileData?.gender}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Birthday</p>
                            <p className="font-medium text-gray-900">
                              {profileData?.birthday
                                ? new Date(
                                    profileData.birthday,
                                  ).toLocaleDateString()
                                : "0000-00-00"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              Marital Status
                            </p>
                            <p className="font-medium text-gray-900">
                              {profileData?.maritalStatus}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              Marriage Anniversary
                            </p>
                            <p className="font-medium text-gray-900">
                              {profileData?.marriageAnniversary
                                ? new Date(
                                    profileData.marriageAnniversary,
                                  ).toLocaleDateString()
                                : "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Status</p>
                            <p className="font-medium">
                              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                                ✓{" "}
                                {profileData?.isActive ? "Active" : "Inactive"}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Company Relation */}
                      <div>
                        <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                          <Briefcase size={20} />
                          Company Relation
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Department</p>
                            <p className="font-medium text-gray-900">
                              {profileData?.department?.name || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Designation</p>
                            <p className="font-medium text-gray-900">
                              {profileData?.designation || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Batch</p>
                            <p className="font-medium text-gray-900">
                              {profileData?.batch || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Report To</p>
                            <p className="font-medium text-gray-900">
                              {profileData?.reportTo?.name || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              Joining Date
                            </p>
                            <p className="font-medium text-gray-900">
                              {profileData?.joiningDate
                                ? new Date(
                                    profileData.joiningDate,
                                  ).toLocaleDateString()
                                : "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              Probation End Date
                            </p>
                            <p className="font-medium text-gray-900">
                              {profileData?.probationEndDate
                                ? new Date(
                                    profileData.probationEndDate,
                                  ).toLocaleDateString()
                                : "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              Work Duration
                            </p>
                            <p className="font-medium text-gray-900">
                              {calculateWorkDuration()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div>
                        <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                          <Phone size={20} />
                          Contact Info
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Phone</p>
                            <p className="font-medium text-gray-900">
                              {profileData?.phone || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="font-medium text-gray-900">
                              {profileData?.email}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Address */}
                      <div>
                        <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                          <MapPin size={20} />
                          Address
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <p className="text-sm text-gray-500">
                              Street Address
                            </p>
                            <p className="font-medium text-gray-900">
                              {profileData?.address?.street || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">City</p>
                            <p className="font-medium text-gray-900">
                              {profileData?.address?.city || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">State</p>
                            <p className="font-medium text-gray-900">
                              {profileData?.address?.state || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Country</p>
                            <p className="font-medium text-gray-900">
                              {profileData?.address?.country || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Postal Code</p>
                            <p className="font-medium text-gray-900">
                              {profileData?.address?.postalCode || "-"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              {activeTab === "teams" && (
                <div className="p-6">
                  <h3 className="text-xl font-bold">Teams Overview</h3>
                  <p>Teams content placeholder.</p>
                </div>
              )}
              {activeTab === "projects" && (
                <div className="p-6">
                  <h3 className="text-xl font-bold">Projects Overview</h3>
                  <p>Projects content placeholder.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
