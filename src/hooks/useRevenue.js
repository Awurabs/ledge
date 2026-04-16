import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function useRevenue(filters = {}) {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["revenue_records", orgId, filters],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from("revenue_records")
        .select(`
          *,
          transaction_categories ( id, name, emoji ),
          clients ( id, name ),
          invoices ( id, invoice_number )
        `)
        .eq("organization_id", orgId)
        .is("deleted_at", null)
        .order("revenue_date", { ascending: false });

      if (filters.status)     q = q.eq("status", filters.status);
      if (filters.categoryId) q = q.eq("category_id", filters.categoryId);
      if (filters.dateFrom)   q = q.gte("revenue_date", filters.dateFrom);
      if (filters.dateTo)     q = q.lte("revenue_date", filters.dateTo);
      if (filters.search)     q = q.ilike("payer_name", `%${filters.search}%`);

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateRevenue() {
  const { orgId, user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase
        .from("revenue_records")
        .insert({ ...values, organization_id: orgId, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["revenue_records", orgId] }),
  });
}

export function useUpdateRevenue() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase
        .from("revenue_records")
        .update(values)
        .eq("id", id)
        .eq("organization_id", orgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["revenue_records", orgId] }),
  });
}
