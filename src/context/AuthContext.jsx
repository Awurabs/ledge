import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession]     = useState(undefined); // undefined = not yet initialised
  const [profile, setProfile]     = useState(null);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading]     = useState(true);

  // Fetch profile + org membership for a given userId
  const loadUserData = useCallback(async (userId) => {
    try {
      const [{ data: profileData }, { data: memberData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, avatar_url, phone, job_title")
          .eq("id", userId)
          .single(),
        supabase
          .from("organization_members")
          .select(
            "id, role, organization_id, organizations(id, name, slug, base_currency, logo_url)"
          )
          .eq("user_id", userId)
          .is("deactivated_at", null)
          .limit(1)
          .maybeSingle(),
      ]);
      setProfile(profileData ?? null);
      setMembership(memberData ?? null);
    } catch (err) {
      console.error("loadUserData error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Bootstrap: check for existing session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        loadUserData(s.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, s) => {
        setSession(s);
        if (s?.user) {
          await loadUserData(s.user.id);
        } else {
          setProfile(null);
          setMembership(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // Convenience re-fetch (e.g. after org creation)
  const refreshUserData = useCallback(() => {
    if (session?.user) loadUserData(session.user.id);
  }, [session, loadUserData]);

  const value = {
    // Auth
    user:        session?.user ?? null,
    session,
    // Profile
    profile,
    displayName: profile?.full_name ?? session?.user?.email ?? "User",
    avatarInitials: initials(profile?.full_name ?? session?.user?.email),
    // Org
    orgId:       membership?.organization_id ?? null,
    orgName:     membership?.organizations?.name ?? null,
    orgSlug:     membership?.organizations?.slug ?? null,
    orgCurrency: membership?.organizations?.base_currency ?? "GHS",
    orgLogoUrl:  membership?.organizations?.logo_url ?? null,
    // Member
    memberId:    membership?.id ?? null,
    myRole:      membership?.role ?? null,
    // State
    loading,
    // Actions
    signOut,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// Helper: "Abena Owusu" → "AO"
function initials(name = "") {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
