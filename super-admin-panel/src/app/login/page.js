"use client";

import { useState } from "react";
import { loginApi } from "../../services/authApi";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { ROLES, DEPARTMENTS } from "../../utils/constants";
import {
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  Shield,
  BarChart3,
  Users,
  BarChart4,
  UserCog,
} from "lucide-react";

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const getDepartmentPath = (departmentData) => {
    if (!departmentData) return null;
    const departmentName =
      typeof departmentData === "object" ? departmentData.name : departmentData;
    if (!departmentName) return null;
    const departmentKey = departmentName.toUpperCase().replace(/\s+/g, "_");
    return DEPARTMENTS[departmentKey]?.path || null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await loginApi({ email, password });
      if (!res?.data?.user) throw new Error("Invalid response from server");
      login(res.data);

      const roleObj = res.data.user.role;
      const roleName = typeof roleObj === "object" ? roleObj?.name : roleObj;
      const department = res.data.user.department;

      if (roleName === "SUPER_ADMIN") {
        router.replace("/superadmin/dashboard");
      } else if (roleName === "ADMIN") {
        const departmentName =
          typeof department === "object" ? department?.name : department;
        const departmentKey = departmentName
          ?.toUpperCase()
          .replace(/\s+/g, "_");
        const adminPath = DEPARTMENTS[departmentKey]?.adminPath || null;
        router.replace(adminPath || "/admin/Employee");
      } else if (roleName === "USER") {
        const departmentPath = getDepartmentPath(department);
        router.replace(departmentPath || "/dashboard/Employee");
      } else {
        router.replace("/");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert(error?.response?.data?.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div
        className="relative w-full max-w-[1100px] w-full flex overflow-hidden rounded-3xl bg-white shadow-2xl"
        style={{
          boxShadow:
            "0 25px 80px rgba(15,23,42,0.12), 0 8px 24px rgba(15,23,42,0.08)",
        }}
      >
        <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-gradient-to-br from-[#14D8B4] via-[#0891B2] to-[#0F4CDE]">
          {/* Glow */}
          <div className="absolute bottom-[-100px] left-[-100px] w-[300px] h-[300px] rounded-full bg-white/5 blur-3xl" />

          <div className="absolute top-24 right-16 grid grid-cols-5 gap-2 opacity-20">
            {Array.from({ length: 25 }).map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-white" />
            ))}
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col h-full p-10 pb-72">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <UserCog className="text-white" size={22} />
              </div>

              <div>
                <h3 className="text-white font-bold text-2xl">Super Admin</h3>
                <p className="text-white/70 text-sm">Management System</p>
              </div>
            </div>

            {/* Main Text */}
            <div className=" flex flex-col  justify-center">
              <h1 className="text-4xl font-bold text-white mt-5">
                Welcome Back!
              </h1>

              <p className="mt-10 text-white/90 text-xl max-w-md leading-relaxed">
                Sign in to continue managing your organization and access
                powerful tools.
              </p>

              {/* Features */}
              <div className="mt-12 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
                    <Shield size={24} className="text-emerald-500" />
                  </div>

                  <div>
                    <h4 className="text-white font-semibold text-lg">
                      Secure & Reliable
                    </h4>
                    <p className="text-white/75">Enterprise-grade security</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
                    <BarChart3 size={24} className="text-emerald-500" />
                  </div>

                  <div>
                    <h4 className="text-white font-semibold text-lg">
                      Powerful Analytics
                    </h4>
                    <p className="text-white/75">
                      Real-time insights and reports
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
                    <Users size={24} className="text-emerald-500" />
                  </div>

                  <div>
                    <h4 className="text-white font-semibold text-lg">
                      Team Management
                    </h4>
                    <p className="text-white/75">
                      Manage users and permissions
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard Image */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[100%] ">
            <img
              src="/images/image.png"
              alt="Dashboard"
              className="w-full h-auto object-contain drop-shadow-[0_25px_50px_rgba(0,0,0,0.35)]"
            />
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 px-10 lg:px-14 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            <div className="flex items-center gap-2 mb-2 lg:hidden">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <Sparkles size={14} className="text-white" />
              </div>
              <span className="font-semibold text-sm">HRMS Platform</span>
            </div>
            <div className="mb-8">
              <h2 className="text-4xl font-bold ">Sign in to your account</h2>

              <p className="mt-2 text-slate-500">
                Enter your credentials to access your dashboard
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-900">
                Email Address
              </label>

              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7c6fff]"
                />

                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className=" w-full h-14 pl-12 pr-4 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-[#7c6fff] focus:ring-4 focus:ring-[#7c6fff]/10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-900">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00d4aa]"
                  size={16}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="input-base w-full pl-12 pr-11 py-3 rounded-xl text-sm transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg hover:bg-slate-500/10 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#7c6fff] to-[#00d4aa] hover:from-[#6b5fff] hover:to-[#00bfa0]
                text-white py-3 rounded-xl font-semibold text-sm transition-all duration-200
                flex items-center justify-center gap-2 shadow-lg shadow-[#7c6fff]/25
                hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center my-8 mt-10  ">
            <div className="flex-1 border-t border-slate-200"></div>

            <span className="px-5 text-sm font-medium text-slate-500 bg-white">
              Or continue with
            </span>

            <div className="flex-1 border-t border-slate-200"></div>
          </div>

          <p className="mt-6 text-center text-[13px] text-[var(--text-muted)]">
            Don&apos;t have an account?{" "}
            <button
              onClick={() => router.push("/register")}
              className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
            >
              Register Now
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
