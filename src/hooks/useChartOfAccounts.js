import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function useChartOfAccounts(filters = {}) {
  const { orgId, user } = useAuth();
  return useQuery({
    queryKey: ["chart_of_accounts", orgId, filters],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from("chart_of_accounts")
        .select("*, parent:chart_of_accounts!parent_id ( id, code, name )")
        .eq("organization_id", orgId)
        .order("code");

      if (filters.type)     q = q.eq("type", filters.type);
      if (filters.isActive !== undefined) q = q.eq("is_active", filters.isActive);
      if (filters.search)   q = q.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%`);

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateAccount() {
  const { orgId, user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .insert({ ...values, organization_id: orgId, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chart_of_accounts", orgId] }),
  });
}

export function useUpdateAccount() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .update(values)
        .eq("id", id)
        .eq("organization_id", orgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chart_of_accounts", orgId] }),
  });
}
