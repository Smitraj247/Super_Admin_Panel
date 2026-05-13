"use client";

import { useState } from "react";
import { registerApi } from "../../services/authApi";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, UserPlus, Shield } from "lucide-react";

export default function Register() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await registerApi({ name, email, password, role });
      alert("Account created successfully");
      router.push("/login");
    } catch (error) {
      alert(error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <div className="max-w-[1100px] w-full bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-100/50 flex overflow-hidden border border-slate-100">
        <div className="hidden lg:flex w-[45%] bg-indigo-600 p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-40 -mt-40"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -ml-40 -mb-40"></div>

          <div className="relative z-10 flex items-center gap-3">
            <div className="h-10 w-10 text-indigo-600  flex items-center justify-center font-bold text-xl shadow-lg">
              <img src="/images/edit.png" alt="Super Admin Panel Logo"></img>
            </div>
            <span className="font-bold text-xl text-white tracking-tight">
              Register Page
            </span>
          </div>

          <div className="relative z-10">
            <h1 className="text-4xl font-bold text-white mb-6 leading-tight">
              Start your journey with{" "}
              <span className="text-indigo-200">us.</span>
            </h1>
            <p className="text-indigo-100 text-lg">
              Join thousands of administrators managing their systems with our
              modern platform.
            </p>
          </div>

          <div className="relative z-10 flex -space-x-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-12 h-12 rounded-full border-4 border-indigo-600 bg-indigo-400 flex items-center justify-center text-white font-bold text-xs"
              >
                U{i}
              </div>
            ))}
            <div className="w-12 h-12 rounded-full border-4 border-indigo-600 bg-white flex items-center justify-center text-indigo-600 font-bold text-xs">
              +99
            </div>
          </div>
        </div>

        <div className="flex-1 p-8 lg:p-14 flex flex-col justify-center">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              Create Account
            </h2>
            <p className="text-slate-500 font-medium">
              Get started with your free account today.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-sm font-bold text-slate-700 tracking-wide">
                Full Name
              </label>
              <div className="relative group">
                <User
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="John Doe"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700 placeholder:text-slate-400"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-sm font-bold text-slate-700 tracking-wide">
                Email Address
              </label>
              <div className="relative group">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"
                  size={20}
                />
                <input
                  type="email"
                  placeholder="name@company.com"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700 placeholder:text-slate-400"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-sm font-bold text-slate-700 tracking-wide">
                Password
              </label>
              <div className="relative group">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"
                  size={20}
                />
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700 placeholder:text-slate-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-sm font-bold text-slate-700 tracking-wide">
                Access Role
              </label>
              <div className="relative group">
                <Shield
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors"
                  size={20}
                />
                <select
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700 appearance-none"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="USER">USER</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="col-span-2 w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-lg hover:bg-slate-800 shadow-xl shadow-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Create Account <UserPlus size={20} />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-slate-500 font-medium">
            Already have an account?{" "}
            <button
              onClick={() => router.push("/login")}
              className="text-indigo-600 font-bold hover:underline underline-offset-4"
            >
              Log In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
