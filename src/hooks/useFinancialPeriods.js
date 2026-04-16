import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function useFinancialPeriods() {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["financial_periods", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_periods")
        .select("*")
        .eq("organization_id", orgId)
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useClosePeriods() {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["close_periods", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("close_periods")
        .select(`
          *,
          financial_periods ( id, name, period_year, period_month ),
          closed_by_profile:profiles!closed_by ( id, full_name ),
          close_checklist_items (
            id, stage, title, description, status, sort_order,
            assignee_id, due_date, completed_at,
            assignee:organization_members!assignee_id (
              id,
              profiles ( id, full_name )
            )
          ),
          close_issues ( id, title, severity, is_resolved ),
          close_activity_log (
            id, action_text, created_at,
            actor:profiles!actor_id ( id, full_name )
          )
        `)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateChecklistItem() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase
        .from("close_checklist_items")
        .update(values)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["close_periods", orgId] }),
  });
}
