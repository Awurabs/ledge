import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function useJournalEntries(filters = {}) {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["journal_entries", orgId, filters],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from("journal_entries")
        .select(`
          *,
          financial_periods ( id, name, period_year, period_month ),
          posted_by_profile:profiles!posted_by ( id, full_name ),
          created_by_profile:profiles!created_by ( id, full_name )
        `)
        .eq("organization_id", orgId)
        .order("entry_date", { ascending: false });

      if (filters.status)   q = q.eq("status", filters.status);
      if (filters.periodId) q = q.eq("period_id", filters.periodId);
      if (filters.type)     q = q.eq("type", filters.type);
      if (filters.dateFrom) q = q.gte("entry_date", filters.dateFrom);
      if (filters.dateTo)   q = q.lte("entry_date", filters.dateTo);

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useJournalEntryLines(journalId) {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["journal_entry_lines", journalId],
    enabled: !!journalId && !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("journal_entry_lines")
        .select(`*, chart_of_accounts ( id, code, name, type )`)
        .eq("journal_id", journalId)
        .order("line_number");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateJournalEntry() {
  const { orgId, user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ entry, lines }) => {
      // Insert entry
      const { data: je, error: jeErr } = await supabase
        .from("journal_entries")
        .insert({ ...entry, organization_id: orgId, created_by: user?.id })
        .select()
        .single();
      if (jeErr) throw jeErr;

      // Insert lines
      const lineRows = lines.map((l, i) => ({
        ...l,
        journal_id: je.id,
        organization_id: orgId,
        line_number: i + 1,
      }));
      const { error: linesErr } = await supabase
        .from("journal_entry_lines")
        .insert(lineRows);
      if (linesErr) throw linesErr;

      return je;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["journal_entries", orgId] }),
  });
}

export function usePostJournalEntry() {
  const { orgId, user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data, error } = await supabase
        .from("journal_entries")
        .update({
          status:    "posted",
          posted_by: user?.id,
          posted_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("organization_id", orgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["journal_entries", orgId] }),
  });
}
