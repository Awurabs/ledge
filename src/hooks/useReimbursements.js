import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function useReimbursements(filters = {}) {
  const { orgId, memberId } = useAuth();
  return useQuery({
    queryKey: ["reimbursement_requests", orgId, filters],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from("reimbursement_requests")
        .select(`
          *,
          organization_members (
            id,
            profiles ( id, full_name, avatar_url )
          ),
          reimbursement_items (
            id, description, merchant_name, amount, expense_date,
            transaction_categories ( id, name, emoji )
          )
        `)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (filters.status)   q = q.eq("status", filters.status);
      if (filters.ownOnly)  q = q.eq("member_id", memberId);

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateReimbursement() {
  const { orgId, memberId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ request, items }) => {
      const { data: req, error: reqErr } = await supabase
        .from("reimbursement_requests")
        .insert({ ...request, organization_id: orgId, member_id: memberId })
        .select()
        .single();
      if (reqErr) throw reqErr;

      if (items?.length) {
        const rows = items.map((item) => ({
          ...item,
          reimbursement_id: req.id,
        }));
        const { error: itemsErr } = await supabase
          .from("reimbursement_items")
          .insert(rows);
        if (itemsErr) throw itemsErr;
      }
      return req;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reimbursement_requests", orgId] }),
  });
}

export function useUpdateReimbursement() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase
        .from("reimbursement_requests")
        .update(values)
        .eq("id", id)
        .eq("organization_id", orgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reimbursement_requests", orgId] }),
  });
}
