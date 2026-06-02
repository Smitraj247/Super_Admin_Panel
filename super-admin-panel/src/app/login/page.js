"use client";

import { useState } from "react";
import { loginApi } from "../../services/authApi";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { ROLES, DEPARTMENTS } from "../../utils/constants";
import { Mail, Lock, ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const getDepartmentPath = (departmentData) => {
    if (!departmentData) return null;
    const departmentName = typeof departmentData === "object" ? departmentData.name : departmentData;
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
        const departmentName = typeof department === "object" ? department?.name : department;
        const departmentKey = departmentName?.toUpperCase().replace(/\s+/g, "_");
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
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] p-4 relative overflow-hidden">
      {/* Background blobs — navy with purple/teal glow */}
      <div className="absolute top-[-15%] left-[-5%] w-[500px] h-[500px] bg-[#7c6fff]/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[500px] h-[500px] bg-[#00d4aa]/6 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[#7c6fff]/4 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-[960px] flex overflow-hidden rounded-3xl border border-[var(--border)] animate-scale-in"
        style={{ boxShadow: "var(--shadow-lg)" }}
      >
        {/* Left panel */}
        <div className="hidden lg:flex w-1/2 relative bg-gradient-to-br from-[#7c6fff] via-[#4f46e5] to-[#00d4aa] overflow-hidden">
          <img src="/images/login.jpg" alt="Login" className="object-cover w-full h-full opacity-30 mix-blend-overlay" />
          <div className="absolute inset-0 flex flex-col justify-between p-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <span className="text-white font-semibold text-sm">HRMS Platform</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white leading-tight mb-3">
                Manage your team<br />with confidence
              </h1>
              <p className="text-indigo-200 text-sm leading-relaxed">
                A unified platform for HR, attendance, leaves, and team management — all in one place.
              </p>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 bg-[var(--bg-surface)] p-8 lg:p-12 flex flex-col justify-center">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6 lg:hidden">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <Sparkles size={14} className="text-white" />
              </div>
              <span className="text-[var(--text-primary)] font-semibold text-sm">HRMS Platform</span>
            </div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-1.5">Welcome back</h2>
            <p className="text-[var(--text-muted)] text-sm">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                <input
                  type="email"
                  placeholder="name@company.com"
                  className="input-base w-full pl-10 pr-4 py-3 rounded-xl text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="input-base w-full pl-10 pr-11 py-3 rounded-xl text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
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
                hover:shadow-[#7c6fff]/40 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign In <ArrowRight size={16} /></>
              )}
            </button>
          </form>

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
