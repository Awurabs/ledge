import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function useCards(filters = {}) {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["cards", orgId, filters],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from("cards")
        .select(`
          *,
          organization_members (
            id,
            profiles ( id, full_name, avatar_url, job_title )
          ),
          departments ( id, name )
        `)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (filters.status)   q = q.eq("status", filters.status);
      if (filters.type)     q = q.eq("type", filters.type);
      if (filters.memberId) q = q.eq("member_id", filters.memberId);

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCardTransactions(cardId, filters = {}) {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["card_transactions", orgId, cardId, filters],
    enabled: !!orgId && !!cardId,
    queryFn: async () => {
      let q = supabase
        .from("card_transactions")
        .select(`
          *,
          transaction_categories ( id, name, emoji )
        `)
        .eq("organization_id", orgId)
        .eq("card_id", cardId)
        .order("txn_date", { ascending: false });

      if (filters.status) q = q.eq("status", filters.status);
      if (filters.limit)  q = q.limit(filters.limit);

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateCard() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase
        .from("cards")
        .update(values)
        .eq("id", id)
        .eq("organization_id", orgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cards", orgId] }),
  });
}

/** Freeze a card */
export function useFreezeCard() {
  const { user } = useAuth();
  const updateCard = useUpdateCard();
  return useMutation({
    mutationFn: ({ id, reason }) =>
      updateCard.mutateAsync({
        id,
        status: "frozen",
        frozen_at: new Date().toISOString(),
        frozen_by: user?.id,
        frozen_reason: reason ?? null,
      }),
  });
}

/** Unfreeze a card */
export function useUnfreezeCard() {
  const updateCard = useUpdateCard();
  return useMutation({
    mutationFn: ({ id }) =>
      updateCard.mutateAsync({
        id,
        status: "active",
        frozen_at: null,
        frozen_by: null,
        frozen_reason: null,
      }),
  });
}

/** Issue a new card */
export function useIssueCard() {
  const { orgId, user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase
        .from("cards")
        .insert({
          ...values,
          organization_id: orgId,
          created_by: user?.id,
          status: "active",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cards", orgId] }),
  });
}
