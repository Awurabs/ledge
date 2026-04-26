import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// Re-export contact hooks so callers that import from useInvoices still work
export { useContacts, useCreateContact, useUpdateContact } from "./useContacts";

// Keep backwards-compat alias
export { useContacts as useClients } from "./useContacts";

// ── Invoices ──────────────────────────────────────────────────────────────────

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
          contacts ( id, name, email, phone, address, tax_id, payment_terms ),
          invoice_line_items ( id, description, quantity, unit_price, line_total, tax_rate, sort_order ),
          invoice_payments ( id, amount, payment_date, payment_method, reference, note )
        `)
        .eq("organization_id", orgId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (filters.status)   q = q.eq("status", filters.status);
      if (filters.contactId) q = q.eq("contact_id", filters.contactId);
      if (filters.dateFrom) q = q.gte("issue_date", filters.dateFrom);
      if (filters.dateTo)   q = q.lte("issue_date", filters.dateTo);
      if (filters.overdue)  q = q.lt("due_date", new Date().toISOString().slice(0, 10))
                                   .not("status", "in", '("paid","void")');
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

// Generate next sequential invoice number: INV-2026-0001
async function nextInvoiceNumber(orgId) {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const { data } = await supabase
    .from("invoices")
    .select("invoice_number")
    .eq("organization_id", orgId)
    .like("invoice_number", `${prefix}%`)
    .order("invoice_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  let next = 1;
  if (data?.invoice_number) {
    const last = parseInt(data.invoice_number.replace(prefix, ""), 10);
    if (!isNaN(last)) next = last + 1;
  }
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export function useCreateInvoice() {
  const { orgId, user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoice, lineItems }) => {
      const invoiceNumber = await nextInvoiceNumber(orgId);

      const { data: inv, error: invErr } = await supabase
        .from("invoices")
        .insert({
          organization_id: orgId,
          created_by:      user?.id,
          invoice_number:  invoiceNumber,
          contact_id:      invoice.contact_id,
          issue_date:      invoice.issue_date,
          due_date:        invoice.due_date ?? null,
          currency:        invoice.currency ?? "GHS",
          subtotal:        invoice.subtotal,
          tax_rate:        invoice.tax_rate ?? 0,
          tax_breakdown:   invoice.tax_breakdown ?? [],
          tax_amount:      invoice.tax_amount ?? 0,
          discount_amount: invoice.discount_amount ?? 0,
          total_amount:    invoice.total_amount,
          amount_paid:     0,
          amount_due:      invoice.total_amount,
          payment_terms:   invoice.payment_terms ?? "Net 30",
          notes:           invoice.notes ?? null,
          footer:          invoice.footer ?? null,
          status:          "draft",
        })
        .select()
        .single();
      if (invErr) throw invErr;

      if (lineItems?.length) {
        const rows = lineItems.map((li, i) => ({
          invoice_id:  inv.id,
          description: li.description,
          quantity:    li.quantity,
          unit_price:  li.unit_price,
          line_total:  li.line_total,
          tax_rate:    li.tax_rate ?? 0,
          sort_order:  i,
        }));
        const { error: liErr } = await supabase.from("invoice_line_items").insert(rows);
        if (liErr) throw liErr;
      }
      return inv;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices", orgId] });
    },
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

// Mark as sent → create revenue_record (ACCRUAL basis)
export function useMarkInvoiceSent() {
  const { orgId, user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      // 1. Fetch invoice for amounts / dates
      const { data: inv, error: fetchErr } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", id)
        .single();
      if (fetchErr) throw fetchErr;

      // 2. Mark invoice sent
      const { error: updErr } = await supabase
        .from("invoices")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", id)
        .eq("organization_id", orgId);
      if (updErr) throw updErr;

      // 3. Accrual: create revenue_record when invoice is sent (earned)
      const { error: revErr } = await supabase
        .from("revenue_records")
        .insert({
          organization_id: orgId,
          payer_name:      `Invoice ${inv.invoice_number}`,
          ref_number:      `INV-${inv.invoice_number}`,
          description:     `Invoice ${inv.invoice_number}`,
          amount:          inv.total_amount,
          currency:        inv.currency ?? "GHS",
          status:          "pending",
          revenue_date:    inv.issue_date,
          invoice_id:      id,
          created_by:      user?.id,
        });
      // Revenue insert is best-effort — don't fail the whole send if it errors
      if (revErr) console.error("revenue_record insert error:", revErr);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices", orgId] });
      qc.invalidateQueries({ queryKey: ["revenue", orgId] });
    },
  });
}

// Record a payment against an invoice
export function useRecordInvoicePayment() {
  const { orgId, user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, amount, paymentDate, paymentMethod, reference, note }) => {
      // Fetch current invoice totals
      const { data: inv, error: fetchErr } = await supabase
        .from("invoices")
        .select("total_amount, amount_paid, amount_due, status, invoice_number, currency")
        .eq("id", invoiceId)
        .single();
      if (fetchErr) throw fetchErr;

      // Insert payment record
      const { error: pmtErr } = await supabase.from("invoice_payments").insert({
        invoice_id:      invoiceId,
        organization_id: orgId,
        amount,
        currency:        inv.currency ?? "GHS",
        payment_date:    paymentDate ?? new Date().toISOString().slice(0, 10),
        payment_method:  paymentMethod ?? "bank_transfer",
        reference:       reference ?? null,
        note:            note ?? null,
        created_by:      user?.id,
      });
      if (pmtErr) throw pmtErr;

      // Update invoice paid/due amounts and status
      const newPaid = (inv.amount_paid ?? 0) + amount;
      const newDue  = Math.max(0, (inv.total_amount ?? 0) - newPaid);
      const newStatus = newPaid >= inv.total_amount
        ? "paid"
        : newPaid > 0 ? "partially_paid" : inv.status;

      const { error: updErr } = await supabase
        .from("invoices")
        .update({
          amount_paid: newPaid,
          amount_due:  newDue,
          status:      newStatus,
          paid_at:     newStatus === "paid" ? new Date().toISOString() : null,
        })
        .eq("id", invoiceId);
      if (updErr) throw updErr;

      // If fully paid, update the linked revenue_record to 'received'
      if (newStatus === "paid") {
        await supabase
          .from("revenue_records")
          .update({ status: "received" })
          .eq("invoice_id", invoiceId)
          .eq("organization_id", orgId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices", orgId] });
      qc.invalidateQueries({ queryKey: ["revenue", orgId] });
    },
  });
}

// Void an invoice
export function useVoidInvoice() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase
        .from("invoices")
        .update({ status: "void", voided_at: new Date().toISOString() })
        .eq("id", id)
        .eq("organization_id", orgId);
      if (error) throw error;
      // Also void the linked revenue_record
      await supabase
        .from("revenue_records")
        .update({ status: "void" })
        .eq("invoice_id", id)
        .eq("organization_id", orgId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices", orgId] });
      qc.invalidateQueries({ queryKey: ["revenue", orgId] });
    },
  });
}

// Soft-delete a draft invoice
export function useDeleteInvoice() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase
        .from("invoices")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id)
        .eq("organization_id", orgId)
        .eq("status", "draft"); // only drafts can be deleted
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices", orgId] }),
  });
}
