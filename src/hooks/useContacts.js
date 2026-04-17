import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// ── List contacts (optionally with invoice stats) ─────────────────────────────

export function useContacts(filters = {}) {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["contacts", orgId, filters],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from("contacts")
        .select(`
          *,
          invoices (
            id, status, total_amount, amount_due, issue_date, invoice_number
          )
        `)
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name");

      if (filters.search) q = q.ilike("name", `%${filters.search}%`);
      if (filters.type)   q = q.or(`type.eq.${filters.type},type.eq.both`);

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export function useCreateContact() {
  const { orgId } = useAuth();           // NOTE: contacts table has NO created_by col
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values) => {
      // Strip any accidental created_by that callers might pass in
      // eslint-disable-next-line no-unused-vars
      const { created_by, ...safe } = values;
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          name:          safe.name,
          email:         safe.email        ?? null,
          phone:         safe.phone        ?? null,
          address:       safe.address      ?? null,
          tax_id:        safe.tax_id       ?? null,
          notes:         safe.notes        ?? null,
          payment_terms: safe.payment_terms ?? "Net 30",
          type:          safe.type         ?? "customer",
          currency:      safe.currency     ?? "GHS",
          organization_id: orgId,
          is_active:     true,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts", orgId] }),
  });
}

export function useUpdateContact() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      // eslint-disable-next-line no-unused-vars
      const { created_by, organization_id, ...safe } = values;
      const { data, error } = await supabase
        .from("contacts")
        .update(safe)
        .eq("id", id)
        .eq("organization_id", orgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts", orgId] }),
  });
}

export function useArchiveContact() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase
        .from("contacts")
        .update({ is_active: false, deleted_at: new Date().toISOString() })
        .eq("id", id)
        .eq("organization_id", orgId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts", orgId] }),
  });
}
