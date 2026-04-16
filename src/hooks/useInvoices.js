import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function useClients(filters = {}) {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["clients", orgId, filters],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from("clients")
        .select("*")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name");
      if (filters.search) q = q.ilike("name", `%${filters.search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useInvoices(filters = {}) {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["invoices", orgId, filters],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from("invoices")
        .select(`
          *,
          clients ( id, name, email ),
          invoice_line_items ( id, description, quantity, unit_price, amount, sort_order ),
          invoice_payments ( id, amount, payment_date, payment_method, reference )
        `)
        .eq("organization_id", orgId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (filters.status)     q = q.eq("status", filters.status);
      if (filters.clientId)   q = q.eq("client_id", filters.clientId);
      if (filters.dateFrom)   q = q.gte("invoice_date", filters.dateFrom);
      if (filters.dateTo)     q = q.lte("invoice_date", filters.dateTo);
      if (filters.overdue)    q = q.lt("due_date", new Date().toISOString().slice(0, 10))
                                    .not("status", "in", '("paid","void")');

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateInvoice() {
  const { orgId, user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoice, lineItems }) => {
      const { data: inv, error: invErr } = await supabase
        .from("invoices")
        .insert({ ...invoice, organization_id: orgId, created_by: user?.id })
        .select()
        .single();
      if (invErr) throw invErr;

      if (lineItems?.length) {
        const rows = lineItems.map((li, i) => ({
          ...li,
          invoice_id: inv.id,
          sort_order: i,
        }));
        const { error: liErr } = await supabase.from("invoice_line_items").insert(rows);
        if (liErr) throw liErr;
      }
      return inv;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices", orgId] }),
  });
}

export function useUpdateInvoice() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase
        .from("invoices")
        .update(values)
        .eq("id", id)
        .eq("organization_id", orgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices", orgId] }),
  });
}

export function useRecordInvoicePayment() {
  const { orgId, user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, payment }) => {
      // Insert payment record
      const { error: pmtErr } = await supabase
        .from("invoice_payments")
        .insert({ ...payment, invoice_id: invoiceId, organization_id: orgId, recorded_by: user?.id });
      if (pmtErr) throw pmtErr;

      // Update paid_amount and status on invoice
      const { data: inv } = await supabase
        .from("invoices")
        .select("total_amount, paid_amount")
        .eq("id", invoiceId)
        .single();

      const newPaid = (inv.paid_amount ?? 0) + payment.amount;
      const newStatus = newPaid >= inv.total_amount
        ? "paid"
        : newPaid > 0 ? "partially_paid" : inv.status;

      const { error: updErr } = await supabase
        .from("invoices")
        .update({
          paid_amount: newPaid,
          status: newStatus,
          paid_at: newStatus === "paid" ? new Date().toISOString() : null,
        })
        .eq("id", invoiceId);
      if (updErr) throw updErr;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices", orgId] }),
  });
}
