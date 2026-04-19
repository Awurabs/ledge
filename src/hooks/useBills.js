import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// ── Vendors for Bills ─────────────────────────────────────────────────────────
// Vendors live in the shared `contacts` table (type = 'vendor' | 'both').
// This is the same table used by the Customers & Vendors page, so anything
// added there appears here automatically.

export function useBillVendors() {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["bill_vendors", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, email, phone, address, payment_terms, currency")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .or("type.eq.vendor,type.eq.both")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

// Creates a vendor as a contact (type='vendor') so it shows up on both the
// Customers & Vendors page and the Bills vendor dropdown.
export function useCreateBillVendor() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, email, phone }) => {
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          name,
          email:           email  ?? null,
          phone:           phone  ?? null,
          type:            "vendor",
          organization_id: orgId,
          is_active:       true,
          currency:        "GHS",
          payment_terms:   "Net 30",
        })
        .select("id, name, email, phone")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bill_vendors", orgId] });
      qc.invalidateQueries({ queryKey: ["contacts",     orgId] });
    },
  });
}

// ── Bills ─────────────────────────────────────────────────────────────────────

export function useBillInbox() {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["bill_inbox", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bill_inbox")
        .select("*")
        .eq("organization_id", orgId)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useBills(filters = {}) {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["bills", orgId, filters],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from("bills")
        .select(`
          *,
          contact:contacts ( id, name, email, phone ),
          chart_of_accounts ( id, code, name ),
          approved_by_profile:profiles!approved_by ( id, full_name )
        `)
        .eq("organization_id", orgId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (filters.status)    q = q.eq("status", filters.status);
      if (filters.contactId) q = q.eq("contact_id", filters.contactId);
      if (filters.dateFrom)  q = q.gte("bill_date", filters.dateFrom);
      if (filters.dateTo)    q = q.lte("bill_date", filters.dateTo);
      if (filters.overdue)   q = q.lt("due_date", new Date().toISOString().slice(0, 10))
                                   .not("status", "in", '("paid","void")');

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

// Generate next sequential bill reference: BILL-2026-0001
async function nextBillNumber(orgId) {
  const year   = new Date().getFullYear();
  const prefix = `BILL-${year}-`;
  const { data } = await supabase
    .from("bills")
    .select("bill_number")
    .eq("organization_id", orgId)
    .like("bill_number", `${prefix}%`)
    .order("bill_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data?.bill_number) {
    const last = parseInt(data.bill_number.replace(prefix, ""), 10);
    return `${prefix}${String(last + 1).padStart(4, "0")}`;
  }
  return `${prefix}0001`;
}

export function useCreateBill() {
  const { orgId, user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values) => {
      const billNumber = values.bill_number?.trim() || await nextBillNumber(orgId);
      const { data, error } = await supabase
        .from("bills")
        .insert({
          ...values,
          bill_number:     billNumber,
          organization_id: orgId,
          created_by:      user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills",     orgId] });
      qc.invalidateQueries({ queryKey: ["bill_inbox", orgId] });
    },
  });
}

export function useUpdateBill() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase
        .from("bills")
        .update(values)
        .eq("id", id)
        .eq("organization_id", orgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bills", orgId] }),
  });
}

export function useApproveBill() {
  const { orgId, user } = useAuth();
  const updateBill = useUpdateBill();
  return useMutation({
    mutationFn: ({ id }) =>
      updateBill.mutateAsync({
        id,
        status:      "scheduled",
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      }),
  });
}

export function useMarkBillPaid() {
  const updateBill = useUpdateBill();
  return useMutation({
    mutationFn: ({ id, paymentMethod, paymentDate, reference }) =>
      updateBill.mutateAsync({
        id,
        status:         "paid",
        payment_method: paymentMethod,
        payment_date:   paymentDate ?? new Date().toISOString().slice(0, 10),
        reference,
      }),
  });
}
