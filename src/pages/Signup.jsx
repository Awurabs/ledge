import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const navigate = useNavigate();
  const { refreshUserData } = useAuth();

  const [form, setForm] = useState({
    fullName:    "",
    orgName:     "",
    email:       "",
    password:    "",
    confirmPw:   "",
  });
  const [showPw, setShowPw]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [step, setStep]             = useState("form"); // "form" | "confirm"

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPw) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      // 1. Create auth user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email:    form.email.trim(),
        password: form.password,
        options: {
          data: { full_name: form.fullName.trim() },
        },
      });
      if (signUpError) throw signUpError;

      // 2a. If email confirmation required → show confirm screen
      if (!data.session) {
        setStep("confirm");
        return;
      }

      // 2b. Immediately authenticated → create org via RPC
      const { error: rpcError } = await supabase.rpc("setup_new_organization", {
        p_org_name:  form.orgName.trim(),
        p_full_name: form.fullName.trim(),
      });
      if (rpcError) throw rpcError;

      refreshUserData();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message ?? "Sign-up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Email confirmation pending ──────────────────────────────────────────────
  if (step === "confirm") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
          <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Check your email</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">
            We sent a confirmation link to{" "}
            <span className="font-medium text-gray-700">{form.email}</span>.
            Click it to activate your account, then come back here to sign in.
          </p>
          <Link
            to="/login"
            className="inline-block bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  // ── Signup form ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex w-[420px] shrink-0 bg-white border-r border-gray-100 flex-col justify-between p-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-xl leading-none">L</span>
          </div>
          <span className="text-gray-900 font-bold text-xl tracking-tight">Ledge</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-gray-900 leading-snug mb-4">
            Your business's<br />financial operating system.
          </h2>
          <ul className="space-y-2.5 text-sm text-gray-500">
            {[
              "Multi-account banking dashboard",
              "Smart expense & approval workflows",
              "Invoicing, bills & revenue tracking",
              "AI-powered financial copilot",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} BTV Ledge. All rights reserved.</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg leading-none">L</span>
            </div>
            <span className="text-gray-900 font-bold text-lg tracking-tight">Ledge</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create your workspace</h1>
          <p className="text-sm text-gray-500 mb-8">
            Free forever. No credit card required.
          </p>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg p-3 mb-6">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Your full name
              </label>
              <input
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                required
                autoComplete="name"
                placeholder="Abena Owusu"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              />
            </div>

            {/* Org name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Organisation name
              </label>
              <input
                type="text"
                name="orgName"
                value={form.orgName}
                onChange={handleChange}
                required
                placeholder="Acme Ltd"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Work email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
                placeholder="you@company.com"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password <span className="text-gray-400 font-normal">(min. 8 characters)</span>
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Confirm password
              </label>
              <input
                type={showPw ? "text" : "password"}
                name="confirmPw"
                value={form.confirmPw}
                onChange={handleChange}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating workspace…
                </>
              ) : (
                "Create free account"
              )}
            </button>

            <p className="text-xs text-center text-gray-400 mt-1">
              By signing up you agree to our{" "}
              <a href="#" className="underline hover:text-gray-600">Terms</a> &{" "}
              <a href="#" className="underline hover:text-gray-600">Privacy Policy</a>
            </p>
          </form>

          <p className="text-sm text-center text-gray-500 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-green-600 hover:text-green-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
