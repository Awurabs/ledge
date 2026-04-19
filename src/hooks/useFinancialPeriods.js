import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// ── Standard checklist template used when opening a new close period ──────────
export const STANDARD_CHECKLIST = [
  // ── Transaction Review ─────────────────────────────────────────────────────
  { stage: "transaction_review", title: "Review and categorize all uncategorized transactions",     sort_order: 0 },
  { stage: "transaction_review", title: "Confirm all expense reports are submitted and approved",   sort_order: 1 },
  { stage: "transaction_review", title: "Reconcile card charges against statements",                sort_order: 2 },
  { stage: "transaction_review", title: "Verify all invoices issued this period are recorded",      sort_order: 3 },

  // ── Reconciliations ────────────────────────────────────────────────────────
  { stage: "reconciliations",    title: "Reconcile bank and mobile money accounts",                 sort_order: 0 },
  { stage: "reconciliations",    title: "Reconcile accounts receivable aging",                      sort_order: 1 },
  { stage: "reconciliations",    title: "Reconcile accounts payable and verify outstanding bills",  sort_order: 2 },

  // ── Accruals & Adjustments ─────────────────────────────────────────────────
  { stage: "accruals_adjustments", title: "Post accrued revenue journal entries",                   sort_order: 0 },
  { stage: "accruals_adjustments", title: "Post accrued expense journal entries",                   sort_order: 1 },
  { stage: "accruals_adjustments", title: "Amortize prepaid expenses",                              sort_order: 2 },
  { stage: "accruals_adjustments", title: "Record depreciation for fixed assets",                   sort_order: 3 },

  // ── Financial Review ───────────────────────────────────────────────────────
  { stage: "financial_review",   title: "Review P&L for variances vs prior period",                 sort_order: 0 },
  { stage: "financial_review",   title: "Review balance sheet for unusual items",                   sort_order: 1 },
  { stage: "financial_review",   title: "Confirm accounting equation balances (Assets = L + E)",    sort_order: 2 },
  { stage: "financial_review",   title: "Document and address any flagged issues",                  sort_order: 3 },

  // ── Close & Lock ───────────────────────────────────────────────────────────
  { stage: "close_lock",         title: "Obtain finance lead sign-off",                             sort_order: 0 },
  { stage: "close_lock",         title: "Archive P&L, Balance Sheet, and journal reports",          sort_order: 1 },
  { stage: "close_lock",         title: "Lock period to prevent further journal entries",           sort_order: 2 },
];

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

export function useCreateFinancialPeriod() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ year, month, name }) => {
      const periodName = name || new Date(year, month - 1, 1)
        .toLocaleString("default", { month: "long", year: "numeric" });
      const { data, error } = await supabase
        .from("financial_periods")
        .insert({ organization_id: orgId, name: periodName, period_year: year, period_month: month })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["financial_periods", orgId] }),
  });
}

export function useStartClosePeriod() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ periodId, targetClose }) => {
      // 1. Create the close period
      const { data: cp, error: cpErr } = await supabase
        .from("close_periods")
        .insert({
          organization_id: orgId,
          period_id:       periodId,
          status:          "in_progress",
          target_close:    targetClose || null,
        })
        .select()
        .single();
      if (cpErr) throw cpErr;

      // 2. Seed it with the standard checklist
      const rows = STANDARD_CHECKLIST.map((item) => ({
        ...item,
        close_period_id: cp.id,
        organization_id: orgId,
        status:          "pending",
      }));
      const { error: itemsErr } = await supabase
        .from("close_checklist_items")
        .insert(rows);
      if (itemsErr) throw itemsErr;

      return cp;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["close_periods",      orgId] });
      qc.invalidateQueries({ queryKey: ["financial_periods",  orgId] });
    },
  });
}

export function useUpdateClosePeriod() {
  const { orgId, user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const payload = { ...values };
      if (values.status === "locked") {
        payload.closed_at = new Date().toISOString();
        payload.closed_by = user?.id;
      }
      const { data, error } = await supabase
        .from("close_periods")
        .update(payload)
        .eq("id", id)
        .eq("organization_id", orgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["close_periods", orgId] }),
  });
}

export function useCreateCloseIssue() {
  const { orgId, user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ closePeriodId, title, description, severity }) => {
      const { data, error } = await supabase
        .from("close_issues")
        .insert({
          close_period_id: closePeriodId,
          organization_id: orgId,
          title,
          description:     description || null,
          severity:        severity ?? "medium",
          created_by:      user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["close_periods", orgId] }),
  });
}

export function useResolveCloseIssue() {
  const { orgId, user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, resolutionNote }) => {
      const { data, error } = await supabase
        .from("close_issues")
        .update({
          is_resolved:     true,
          resolved_at:     new Date().toISOString(),
          resolved_by:     user?.id,
          resolution_note: resolutionNote || null,
        })
        .eq("id", id)
        .eq("organization_id", orgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["close_periods", orgId] }),
  });
}
