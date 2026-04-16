import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function useCopilotConversations() {
  const { orgId, user } = useAuth();
  return useQuery({
    queryKey: ["copilot_conversations", orgId, user?.id],
    enabled: !!orgId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("copilot_conversations")
        .select("id, title, model, is_archived, created_at, updated_at")
        .eq("organization_id", orgId)
        .eq("user_id", user.id)
        .eq("is_archived", false)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCopilotMessages(conversationId) {
  return useQuery({
    queryKey: ["copilot_messages", conversationId],
    enabled: !!conversationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("copilot_messages")
        .select("id, role, content, tool_name, tool_output, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateConversation() {
  const { orgId, user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (title) => {
      const { data, error } = await supabase
        .from("copilot_conversations")
        .insert({ organization_id: orgId, user_id: user?.id, title })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["copilot_conversations", orgId, user?.id] }),
  });
}

export function useSendMessage() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, role, content }) => {
      const { data, error } = await supabase
        .from("copilot_messages")
        .insert({ conversation_id: conversationId, organization_id: orgId, role, content })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, { conversationId }) =>
      qc.invalidateQueries({ queryKey: ["copilot_messages", conversationId] }),
  });
}
