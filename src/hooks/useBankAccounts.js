import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function useBankAccounts() {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["bank_accounts", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("is_default", { ascending: false })
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateBankAccount() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .insert({ ...values, organization_id: orgId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bank_accounts", orgId] }),
  });
}

export function useUpdateBankAccount() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .update(values)
        .eq("id", id)
        .eq("organization_id", orgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bank_accounts", orgId] }),
  });
}
