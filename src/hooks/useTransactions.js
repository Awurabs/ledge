import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function useTransactions(filters = {}) {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["transactions", orgId, filters],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from("transactions")
        .select(`
          *,
          bank_accounts ( id, name, type, color ),
          transaction_categories ( id, name, emoji, type )
        `)
        .eq("organization_id", orgId)
        .is("deleted_at", null)
        .order("txn_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters.status)      q = q.eq("status", filters.status);
      if (filters.direction)   q = q.eq("direction", filters.direction);
      if (filters.bankId)      q = q.eq("bank_account_id", filters.bankId);
      if (filters.categoryId)  q = q.eq("category_id", filters.categoryId);
      if (filters.dateFrom)    q = q.gte("txn_date", filters.dateFrom);
      if (filters.dateTo)      q = q.lte("txn_date", filters.dateTo);
      if (filters.search)      q = q.ilike("description", `%${filters.search}%`);
      if (filters.limit)       q = q.limit(filters.limit);

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateTransaction() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase
        .from("transactions")
        .update(values)
        .eq("id", id)
        .eq("organization_id", orgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions", orgId] }),
  });
}

export function useCreateTransaction() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase
        .from("transactions")
        .insert({ ...values, organization_id: orgId, source: "manual" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions", orgId] }),
  });
}

export function useTransactionCategories() {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["transaction_categories", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transaction_categories")
        .select("*")
        .or(`organization_id.eq.${orgId},organization_id.is.null`)
        .eq("is_active", true)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}
