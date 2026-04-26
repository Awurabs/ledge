import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// ─────────────────────────────────────────────────────────────────────────────
// STRATEGY: never use PostgREST nested-join syntax for profiles.
// organization_members has two FKs to profiles (user_id + invited_by), so any
// embedded select risks an HTTP 300 "Multiple Choices" error.
//
// Instead every hook that needs profile data:
//   1. Fetches the base table with simple filters (no embed for profiles)
//   2. Collects the relevant user_id list
//   3. Fetches profiles separately with .in("id", [...])
//   4. Merges in JavaScript
// ─────────────────────────────────────────────────────────────────────────────

// ── Members ───────────────────────────────────────────────────────────────────
export function useMembers(filters = {}) {
  const { orgId } = useAuth();
  const qc = useQueryClient();

  // Real-time: invalidate whenever any member row changes for this org
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`org-members-rt-${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "organization_members",
          filter: `organization_id=eq.${orgId}`,
        },
        () => qc.invalidateQueries({ queryKey: ["members", orgId] }),
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [orgId, qc]);

  return useQuery({
    queryKey: ["members", orgId, filters],
    enabled: !!orgId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      // ── Step 1: fetch members (flat — no profile embed) ───────────────────
      let q = supabase
        .from("organization_members")
        .select(`
          id, role, department_id, invited_by, accepted_at, deactivated_at,
          created_at, updated_at, organization_id, user_id,
          departments ( id, name, code )
        `)
        .eq("organization_id", orgId)
        .order("created_at");

      if (filters.role)         q = q.eq("role", filters.role);
      if (filters.departmentId) q = q.eq("department_id", filters.departmentId);
      if (filters.activeOnly)   q = q.is("deactivated_at", null);

      const { data: members, error: membersError } = await q;
      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      // ── Step 2: collect unique user_ids ───────────────────────────────────
      const userIds = [...new Set(members.map((m) => m.user_id).filter(Boolean))];
      if (userIds.length === 0) return members.map((m) => ({ ...m, profiles: null }));

      // ── Step 3: fetch profiles separately ────────────────────────────────
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, phone, job_title, last_seen_at")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // ── Step 4: merge profiles into members by user_id ────────────────────
      const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
      return members.map((m) => ({
        ...m,
        profiles: m.user_id ? (profileMap[m.user_id] ?? null) : null,
      }));
    },
  });
}

// ── Departments ───────────────────────────────────────────────────────────────
export function useDepartments() {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["departments", orgId],
    enabled: !!orgId,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .eq("organization_id", orgId)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ── Teams ─────────────────────────────────────────────────────────────────────
export function useTeams() {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["teams", orgId],
    enabled: !!orgId,
    staleTime: 0,
    queryFn: async () => {
      // ── Step 1: fetch teams (flat) ────────────────────────────────────────
      const { data: teams, error: teamsError } = await supabase
        .from("teams")
        .select("id, name, description, lead_id, is_active, created_at")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .order("name");

      if (teamsError) throw teamsError;
      if (!teams || teams.length === 0) return [];

      const teamIds = teams.map((t) => t.id);

      // ── Step 2: fetch team_members for all these teams ────────────────────
      const { data: teamMembers, error: tmError } = await supabase
        .from("team_members")
        .select("id, team_id, member_id")
        .in("team_id", teamIds);

      if (tmError) throw tmError;

      // ── Step 3: collect all org-member ids we need (leads + members) ──────
      const leadOrgMemberIds = teams.map((t) => t.lead_id).filter(Boolean);
      const memberOrgMemberIds = (teamMembers ?? []).map((tm) => tm.member_id).filter(Boolean);
      const allOrgMemberIds = [...new Set([...leadOrgMemberIds, ...memberOrgMemberIds])];

      if (allOrgMemberIds.length === 0) {
        // No members at all — return teams with empty member lists
        return teams.map((t) => ({ ...t, lead: null, team_members: [] }));
      }

      // ── Step 4: fetch org members (just id + user_id) ────────────────────
      const { data: orgMembers, error: omError } = await supabase
        .from("organization_members")
        .select("id, user_id")
        .in("id", allOrgMemberIds);

      if (omError) throw omError;

      // ── Step 5: collect unique user_ids ───────────────────────────────────
      const userIds = [...new Set((orgMembers ?? []).map((om) => om.user_id).filter(Boolean))];

      // ── Step 6: fetch profiles ────────────────────────────────────────────
      let profileMap = {};
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);

        if (profilesError) throw profilesError;
        profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
      }

      // ── Step 7: build org-member → profile lookup ─────────────────────────
      const orgMemberProfileMap = Object.fromEntries(
        (orgMembers ?? []).map((om) => [
          om.id,
          {
            id: om.id,
            profiles: om.user_id ? (profileMap[om.user_id] ?? null) : null,
          },
        ])
      );

      // ── Step 8: assemble final shape ──────────────────────────────────────
      return teams.map((team) => {
        const lead = team.lead_id ? (orgMemberProfileMap[team.lead_id] ?? null) : null;
        const members = (teamMembers ?? [])
          .filter((tm) => tm.team_id === team.id)
          .map((tm) => ({
            id: tm.id,
            member: orgMemberProfileMap[tm.member_id] ?? null,
          }));

        return { ...team, lead, team_members: members };
      });
    },
  });
}

// ── Pending Invitations ───────────────────────────────────────────────────────
export function usePendingInvitations() {
  const { orgId } = useAuth();
  const qc = useQueryClient();

  // Real-time: invalidate when invitations table changes
  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`org-invitations-rt-${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "member_invitations",
          filter: `organization_id=eq.${orgId}`,
        },
        () => qc.invalidateQueries({ queryKey: ["pending_invitations", orgId] }),
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [orgId, qc]);

  return useQuery({
    queryKey: ["pending_invitations", orgId],
    enabled: !!orgId,
    staleTime: 0,
    refetchOnWindowFocus: true,
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

// ── Member mutations ──────────────────────────────────────────────────────────
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

// ── Department mutations ──────────────────────────────────────────────────────
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

// ── Team mutations ────────────────────────────────────────────────────────────
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

// ── Invite member ─────────────────────────────────────────────────────────────
export function useInviteMember() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, role, department_id }) => {
      const { data, error } = await supabase.functions.invoke("invite-member", {
        body: { email, role, department_id: department_id || null },
      });
      if (error) {
        let message = "Failed to send invite. Please try again.";
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

// ── Revoke invitation ─────────────────────────────────────────────────────────
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
