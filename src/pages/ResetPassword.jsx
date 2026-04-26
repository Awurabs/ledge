import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { refreshUserData } = useAuth();

  const [form, setForm]         = useState({ password: "", confirm: "" });
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState(false);
  const [validLink, setValidLink] = useState(false);
  // isInvite = true when user arrived via an invitation (not a normal password reset)
  const [isInvite, setIsInvite] = useState(false);

  useEffect(() => {
    // ── 1. Detect invite via URL hash ──────────────────────────────────────
    // Read the hash BEFORE Supabase JS clears it from the URL.
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (hashParams.get("type") === "invite") {
      setValidLink(true);
      setIsInvite(true);
    }

    // ── 2. Detect already-logged-in user who must change their password ────
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.must_change_password) {
        setValidLink(true);
        setIsInvite(true);
      }
    });

    // ── 3. Listen for auth events ──────────────────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Standard "forgot password" reset link
        if (event === "PASSWORD_RECOVERY") {
          setValidLink(true);
        }
        // Invite link: Supabase signs the user in then fires SIGNED_IN
        if (
          event === "SIGNED_IN" &&
          session?.user?.user_metadata?.must_change_password
        ) {
          setValidLink(true);
          setIsInvite(true);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      // Update the password; clear the invite flag if present
      const { error: err } = await supabase.auth.updateUser({
        password: form.password,
        ...(isInvite && { data: { must_change_password: false } }),
      });
      if (err) throw err;

      // For invite flow: create the org membership + mark invitation accepted
      if (isInvite) {
        await supabase.rpc("accept_my_invitation");
        refreshUserData();
      }

      setSuccess(true);
      setTimeout(() => navigate("/", { replace: true }), 1500);
    } catch (err) {
      setError(err.message ?? "Could not update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg leading-none">L</span>
          </div>
          <span className="text-gray-900 font-bold text-lg tracking-tight">Ledge</span>
        </div>

        {success ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {isInvite ? "You're all set!" : "Password updated!"}
            </h2>
            <p className="text-sm text-gray-500">Redirecting you to the dashboard…</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {isInvite ? "Welcome to Ledge!" : "Set new password"}
            </h1>
            <p className="text-sm text-gray-500 mb-8">
              {isInvite
                ? "You've been invited — create a password to access your account."
                : "Choose a strong password for your account."}
            </p>

            {!validLink && (
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 text-amber-700 text-sm rounded-lg p-3 mb-6">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>
                  This page is only accessible via the link in your invitation or reset email.{" "}
                  <Link to="/forgot-password" className="underline font-medium">
                    Request a new link
                  </Link>
                  .
                </span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg p-3 mb-6">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {isInvite ? "Create a password" : "New password"}{" "}
                  <span className="text-gray-400 font-normal">(min. 8 characters)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    required
                    disabled={!validLink}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirm password
                </label>
                <input
                  type={showPw ? "text" : "password"}
                  value={form.confirm}
                  onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                  required
                  disabled={!validLink}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !validLink}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {isInvite ? "Setting up your account…" : "Updating…"}
                  </>
                ) : (
                  isInvite ? "Create password & join" : "Update password"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
