import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// ── Current user's profile ────────────────────────────────────────────────────
export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, phone, job_title, last_seen_at")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProfile() {
  const { user, refreshUserData } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase
        .from("profiles")
        .update(values)
        .eq("id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
      refreshUserData?.();
    },
  });
}

export function useOrgSettings() {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["org_settings", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_settings")
        .select("*")
        .eq("organization_id", orgId)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateOrgSettings() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase
        .from("organization_settings")
        .update(values)
        .eq("organization_id", orgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["org_settings", orgId] }),
  });
}

export function useOrganization() {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["organization", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*, org_subscriptions ( *, saas_plans ( * ) )")
        .eq("id", orgId)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateOrganization() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase
        .from("organizations")
        .update(values)
        .eq("id", orgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["organization", orgId] }),
  });
}
