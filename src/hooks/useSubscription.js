import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// ── Active SaaS plans (public read; no org filter needed) ─────────────────────
export function useSaasPlans() {
  return useQuery({
    queryKey: ["saas_plans"],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saas_plans")
        .select("*")
        .eq("is_active", true)
        .order("price_monthly_usd_cents");
      if (error) throw error;
      return data;
    },
  });
}

// Open Paystack inline checkout. Returns a Promise that resolves with the
// transaction reference on success, or rejects on close/failure.
function openPaystack({ publicKey, email, amountCents, currency, metadata }) {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.PaystackPop) {
      reject(new Error("Paystack inline script not loaded"));
      return;
    }
    if (!publicKey) {
      reject(new Error("VITE_PAYSTACK_PUBLIC_KEY is not set"));
      return;
    }
    let settled = false;
    const handler = window.PaystackPop.setup({
      key:       publicKey,
      email,
      amount:    amountCents,            // Paystack expects subunit (cents for USD)
      currency:  currency ?? "USD",
      ref:       `ledge_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      metadata,
      callback: (response) => {
        settled = true;
        resolve(response.reference);
      },
      onClose: () => {
        if (!settled) reject(new Error("Payment cancelled"));
      },
    });
    handler.openIframe();
  });
}

// Subscribe (or upgrade) to a plan via Paystack + edge-function verification.
export function useSubscribePlan() {
  const { orgId, user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ plan }) => {
      if (!orgId) throw new Error("No active organization");
      if (!user?.email) throw new Error("Your account has no email on file");

      const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
      if (!publicKey) {
        throw new Error("Paystack is not configured. Set VITE_PAYSTACK_PUBLIC_KEY in .env");
      }

      // 1. Open Paystack popup → wait for the user to complete payment
      const reference = await openPaystack({
        publicKey,
        email:       user.email,
        amountCents: plan.price_monthly_usd_cents,
        currency:    "USD",
        metadata: {
          plan_id:         plan.id,
          plan_name:       plan.name,
          organization_id: orgId,
          user_id:         user.id,
        },
      });

      // 2. Server-side verify + activate the subscription
      const { data, error } = await supabase.functions.invoke(
        "verify-paystack-payment",
        {
          body: {
            reference,
            plan_id:         plan.id,
            organization_id: orgId,
          },
        },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["organization", orgId] });
      qc.invalidateQueries({ queryKey: ["saas_plans"] });
    },
  });
}
