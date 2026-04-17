import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export function useCreateBillVendor() {
  const { orgId, user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase
        .from("bill_vendors")
        .insert({ ...values, organization_id: orgId, created_by: user?.id, is_active: true })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bill_vendors", orgId] }),
  });
}

export function useBillVendors() {
  const { orgId } = useAuth();
  return useQuery({
    queryKey: ["bill_vendors", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bill_vendors")
        .select("*")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

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
          bill_vendors ( id, name, email, category ),
          chart_of_accounts ( id, code, name ),
          approved_by_profile:profiles!approved_by ( id, full_name )
        `)
        .eq("organization_id", orgId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (filters.status)   q = q.eq("status", filters.status);
      if (filters.vendorId) q = q.eq("vendor_id", filters.vendorId);
      if (filters.dateFrom) q = q.gte("bill_date", filters.dateFrom);
      if (filters.dateTo)   q = q.lte("bill_date", filters.dateTo);
      if (filters.overdue)  q = q.lt("due_date", new Date().toISOString().slice(0, 10))
                                   .not("status", "in", '("paid","void")');

      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateBill() {
  const { orgId, user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values) => {
      const { data, error } = await supabase
        .from("bills")
        .insert({ ...values, organization_id: orgId, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills", orgId] });
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
