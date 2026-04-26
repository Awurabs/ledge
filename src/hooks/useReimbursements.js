import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// ── Fetch ─────────────────────────────────────────────────────────────────────

export function useReimbursements(filters = {}) {
  const { orgId, memberId } = useAuth();
  return useQuery({
    queryKey: ["reimbursement_requests", orgId, filters],
    enabled: !!orgId,
    queryFn: async () => {
      let q = supabase
        .from("reimbursement_requests")
        .select(`
          *,
          organization_members (
            id,
            profiles:profiles!user_id ( id, full_name, avatar_url )
          ),
          reimbursement_items (
            id, description, merchant_name, amount, expense_date,
            receipt_storage_key,
            transaction_categories ( id, name, emoji )
          )
        `)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (filters.status)  q = q.eq("status", filters.status);
      if (filters.ownOnly) q = q.eq("member_id", memberId);

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

// ── Receipt upload ────────────────────────────────────────────────────────────

export async function uploadReceipt(file, orgId) {
  const ext  = file.name.split(".").pop().toLowerCase();
  const path = `${orgId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await supabase.storage
    .from("receipts")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return data.path;
}

export async function getReceiptUrl(key) {
  if (!key) return null;
  const { data, error } = await supabase.storage
    .from("receipts")
    .createSignedUrl(key, 60 * 60); // 1-hour signed URL
  if (error) return null;
  return data.signedUrl;
}

// ── Create ────────────────────────────────────────────────────────────────────

export function useCreateReimbursement() {
  const { orgId, memberId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ request, items, receiptFile }) => {
      // 1. Upload receipt if provided
      let receiptKey = null;
      if (receiptFile) {
        receiptKey = await uploadReceipt(receiptFile, orgId);
      }

      // 2. Insert the request — use "submitted" (the actual enum value)
      const total = (items ?? []).reduce((s, i) => s + (i.amount ?? 0), 0);
      const { data: req, error: reqErr } = await supabase
        .from("reimbursement_requests")
        .insert({
          title:           request.title,
          description:     request.notes ?? null,   // DB column is description
          status:          "submitted",
          total_amount:    total,
          submitted_at:    new Date().toISOString(),
          organization_id: orgId,
          member_id:       memberId,
        })
        .select()
        .single();
      if (reqErr) throw reqErr;

      // 3. Insert line items
      if (items?.length) {
        const rows = items.map((item) => ({
          ...item,
          reimbursement_id:    req.id,
          receipt_storage_key: receiptKey,
        }));
        const { error: itemsErr } = await supabase
          .from("reimbursement_items")
          .insert(rows);
        if (itemsErr) throw itemsErr;
      }
      return req;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reimbursement_requests", orgId] }),
  });
}

// ── Update (approve / decline / pay) ─────────────────────────────────────────

export function useUpdateReimbursement() {
  const { orgId, user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }) => {
      const { data, error } = await supabase
        .from("reimbursement_requests")
        .update(values)
        .eq("id", id)
        .eq("organization_id", orgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reimbursement_requests", orgId] }),
  });
}

export function useApproveReimbursement() {
  const { user } = useAuth();
  const update = useUpdateReimbursement();
  return useMutation({
    mutationFn: ({ id }) =>
      update.mutateAsync({
        id,
        status:      "approved",
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      }),
  });
}

export function useDeclineReimbursement() {
  const { user } = useAuth();
  const update = useUpdateReimbursement();
  return useMutation({
    mutationFn: ({ id, reason }) =>
      update.mutateAsync({
        id,
        status:           "rejected",
        rejected_by:      user?.id,
        rejected_at:      new Date().toISOString(),
        rejection_reason: reason ?? null,
      }),
  });
}

export function useMarkReimbursementPaid() {
  const update = useUpdateReimbursement();
  return useMutation({
    mutationFn: ({ id, paymentMethod, paymentReference }) =>
      update.mutateAsync({
        id,
        status:             "paid",
        paid_at:            new Date().toISOString(),
        payment_method:     paymentMethod ?? null,
        payment_reference:  paymentReference ?? null,
      }),
  });
}

/** Hard-delete a reimbursement request (table has no deleted_at column) */
export function useDeleteReimbursement() {
  const { orgId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => {
      const { error } = await supabase
        .from("reimbursement_requests")
        .delete()
        .eq("id", id)
        .eq("organization_id", orgId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reimbursement_requests", orgId] }),
  });
}
