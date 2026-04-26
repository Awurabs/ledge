import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function useMembers(filters = {}) {
  const { orgId } = useAuth();
  const qc = useQueryClient();

  // Real-time: invalidate cache whenever organization_members changes so the
  // People page updates immediately when a new member accepts an invitation.
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`org-members-${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "organization_members", filter: `organization_id=eq.${orgId}` },
        () => qc.invalidateQueries({ queryKey: ["members", orgId] }),
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [orgId, qc]);

  return useQuery({
    queryKey: ["members", orgId, filters],
    enabled: !!orgId,
    staleTime: 0,          // always re-fetch on mount (real-time sub handles in-page updates)
    queryFn: async () => {
      let q = supabase
        .from("organization_members")
        .select(`
          *,
          profiles ( id, full_name, avatar_url, phone, job_title, last_seen_at ),
          departments ( id, name, code )
        `)
        .eq("organization_id", orgId)
        .order("created_at");

      if (filters.role)          q = q.eq("role", filters.role);
      if (filters.departmentId)  q = q.eq("department_id", filters.departmentId);
      if (filters.activeOnly)    q = q.is("deactivated_at", null);

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useDepartments() {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["departments", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      // NOTE: the manager_id FK uses a non-standard constraint name
      // (`fk_dept_manager`) which makes the embedded manager join unreliable
      // through PostgREST. Fetch departments flat; manager name (if needed)
      // can be looked up separately via useMembers.
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .eq("organization_id", orgId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useTeams() {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["teams", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select(`
          *,
          lead:organization_members!lead_id (
            id,
            profiles ( id, full_name, avatar_url )
          ),
          team_members (
            id,
            member:organization_members (
              id,
              profiles ( id, full_name, avatar_url )
            )
          )
        `)
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateMember() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase
        .from("organization_members")
        .update(values)
        .eq("id", id)
        .eq("organization_id", orgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members", orgId] }),
  });
}

export function useDeactivateMember() {
  const updateMember = useUpdateMember();
  return useMutation({
    mutationFn: ({ id }) =>
      updateMember.mutateAsync({ id, deactivated_at: new Date().toISOString() }),
  });
}

export function useReactivateMember() {
  const updateMember = useUpdateMember();
  return useMutation({
    mutationFn: ({ id }) =>
      updateMember.mutateAsync({ id, deactivated_at: null }),
  });
}

// ── Department CRUD ──────────────────────────────────────────────────────────
export function useCreateDepartment() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase
        .from("departments")
        .insert({ ...values, organization_id: orgId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments", orgId] }),
  });
}

export function useUpdateDepartment() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase
        .from("departments")
        .update(values)
        .eq("id", id)
        .eq("organization_id", orgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments", orgId] }),
  });
}

export function useDeleteDepartment() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", id)
        .eq("organization_id", orgId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments", orgId] }),
  });
}

// ── Team CRUD ────────────────────────────────────────────────────────────────
export function useCreateTeam() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, lead_id }) => {
      const { data, error } = await supabase
        .from("teams")
        .insert({ name, lead_id: lead_id || null, organization_id: orgId, is_active: true })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teams", orgId] }),
  });
}

export function useAddTeamMember() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ team_id, member_id }) => {
      const { data, error } = await supabase
        .from("team_members")
        .insert({ team_id, member_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teams", orgId] }),
  });
}

export function useRemoveTeamMember() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teams", orgId] }),
  });
}

// ── Pending Invitations ──────────────────────────────────────────────────────
export function usePendingInvitations() {
  const { orgId } = useAuth();
  const qc = useQueryClient();

  // Real-time: invalidate when invitations table changes
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`org-invitations-${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "member_invitations", filter: `organization_id=eq.${orgId}` },
        () => qc.invalidateQueries({ queryKey: ["pending_invitations", orgId] }),
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [orgId, qc]);

  return useQuery({
    queryKey: ["pending_invitations", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_invitations")
        .select("id, email, role, department_id, created_at, expires_at")
        .eq("organization_id", orgId)
        .is("accepted_at", null)
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ── Revoke Invitation ────────────────────────────────────────────────────────
export function useRevokeInvitation() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ invitation_id }) => {
      const { data, error } = await supabase.functions.invoke("revoke-invitation", {
        body: { invitation_id },
      });
      if (error) {
        let message = "Failed to revoke invitation.";
        try {
          const body = await error.context?.json?.();
          if (body?.error) message = body.error;
        } catch (_) { /* fall through */ }
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pending_invitations", orgId] }),
  });
}

// ── Invite ───────────────────────────────────────────────────────────────────
export function useInviteMember() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, role, department_id }) => {
      const { data, error } = await supabase.functions.invoke("invite-member", {
        body: { email, role, department_id: department_id || null },
      });
      if (error) {
        // supabase-js wraps non-2xx as a generic FunctionsHttpError.
        // Try to extract the real message from the response body.
        let message = "Failed to send invite. Please try again.";
        try {
          const body = await error.context?.json?.();
          if (body?.error) message = body.error;
        } catch (_) { /* fall through to generic */ }
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pending_invitations", orgId] }),
  });
}
