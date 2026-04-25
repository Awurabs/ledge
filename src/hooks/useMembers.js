import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function useMembers(filters = {}) {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["members", orgId, filters],
    enabled: !!orgId,
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
      const { data, error } = await supabase
        .from("departments")
        .select(`
          *,
          manager:organization_members!manager_id (
            id,
            profiles ( id, full_name )
          )
        `)
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
