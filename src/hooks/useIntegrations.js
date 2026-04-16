import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function useIntegrations() {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["integrations", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integrations")
        .select(`
          *,
          integration_sync_logs (
            id, status, records_synced, records_failed, started_at, completed_at
          )
        `)
        .eq("organization_id", orgId)
        .order("provider");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateIntegration() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase
        .from("integrations")
        .update(values)
        .eq("id", id)
        .eq("organization_id", orgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations", orgId] }),
  });
}

export function useDisconnectIntegration() {
  const { user } = useAuth();
  const updateIntegration = useUpdateIntegration();
  return useMutation({
    mutationFn: ({ id }) =>
      updateIntegration.mutateAsync({
        id,
        status:           "disconnected",
        disconnected_by:  user?.id,
        disconnected_at:  new Date().toISOString(),
      }),
  });
}
