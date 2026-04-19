import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function useExpenses(filters = {}) {
  const { orgId, memberId } = useAuth();
  return useQuery({
    queryKey: ["expenses", orgId, filters],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from("expenses")
        .select(`
          *,
          organization_members (
            id,
            profiles:profiles!user_id ( id, full_name, avatar_url )
          ),
          transaction_categories ( id, name, emoji ),
          departments ( id, name ),
          expense_attachments ( id, storage_key, filename, mime_type )
        `)
        .eq("organization_id", orgId)
        .is("deleted_at", null)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (filters.status)     q = q.eq("status", filters.status);
      if (filters.memberId)   q = q.eq("member_id", filters.memberId);
      if (filters.deptId)     q = q.eq("department_id", filters.deptId);
      if (filters.dateFrom)   q = q.gte("expense_date", filters.dateFrom);
      if (filters.dateTo)     q = q.lte("expense_date", filters.dateTo);
      if (filters.search)     q = q.ilike("merchant_name", `%${filters.search}%`);
      if (filters.ownOnly)    q = q.eq("member_id", memberId);

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateExpense() {
  const { orgId, memberId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase
        .from("expenses")
        .insert({ ...values, organization_id: orgId, member_id: memberId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses", orgId] }),
  });
}

export function useUpdateExpense() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase
        .from("expenses")
        .update(values)
        .eq("id", id)
        .eq("organization_id", orgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses", orgId] }),
  });
}

/** Submit an expense for approval */
export function useSubmitExpense() {
  const updateExpense = useUpdateExpense();
  return useMutation({
    mutationFn: ({ id }) =>
      updateExpense.mutateAsync({
        id,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      }),
  });
}
