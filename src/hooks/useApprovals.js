import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function useApprovals(filters = {}) {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["approval_requests", orgId, filters],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from("approval_requests")
        .select(`
          *,
          requestor:profiles!requestor_id ( id, full_name, avatar_url ),
          assignee:profiles!assignee_id ( id, full_name, avatar_url ),
          decided_by:profiles!decided_by ( id, full_name ),
          approval_comments ( id, body, created_at,
            author:profiles!author_id ( id, full_name, avatar_url )
          )
        `)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (filters.decision)     q = q.eq("decision", filters.decision);
      if (filters.requestType)  q = q.eq("request_type", filters.requestType);
      if (filters.assigneeId)   q = q.eq("assignee_id", filters.assigneeId);

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useDecideApproval() {
  const { orgId, user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, decision, note }) => {
      const { data, error } = await supabase
        .from("approval_requests")
        .update({
          decision,
          decision_note: note ?? null,
          decided_by:    user?.id,
          decided_at:    new Date().toISOString(),
        })
        .eq("id", id)
        .eq("organization_id", orgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approval_requests", orgId] });
      qc.invalidateQueries({ queryKey: ["expenses", orgId] });
    },
  });
}

export function useAddApprovalComment() {
  const { orgId, user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ approvalId, body }) => {
      const { data, error } = await supabase
        .from("approval_comments")
        .insert({ approval_id: approvalId, author_id: user?.id, body })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["approval_requests", orgId] }),
  });
}
