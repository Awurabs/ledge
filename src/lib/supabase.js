import { createClient } from "@supabase/supabase-js";

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const supabaseMisconfigured = !supabaseUrl || !supabaseAnonKey;

if (supabaseMisconfigured) {
  console.error(
    "[Ledge] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set.\n" +
    "Add these to your Netlify environment variables and redeploy."
  );
}

// Use real values when present; fall back to no-op placeholders so the
// app renders the login page rather than crashing with a blank screen.
export const supabase = createClient(
  supabaseUrl     || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  {
    auth: {
      persistSession:    true,
      autoRefreshToken:  true,
      detectSessionInUrl: true,
    },
  }
);
