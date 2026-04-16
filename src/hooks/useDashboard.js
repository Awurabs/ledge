import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

/**
 * Aggregated KPI data for the dashboard.
 * Runs multiple targeted queries in parallel and returns a single object.
 */
export function useDashboardKPIs() {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["dashboard_kpis", orgId],
    enabled: !!orgId,
    staleTime: 1000 * 60 * 5, // 5-min cache — KPIs don't need to be live
    queryFn: async () => {
      const now    = new Date();
      const mtdStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const today  = now.toISOString().slice(0, 10);

      const [
        bankAccounts,
        mtdRevenue,
        mtdExpenses,
        pendingInvoices,
        overdueBills,
        recentTxns,
        pendingApprovals,
      ] = await Promise.all([
        // Cash / bank balances
        supabase
          .from("bank_accounts")
          .select("id, name, type, current_balance, currency, color, is_default")
          .eq("organization_id", orgId)
          .eq("is_active", true)
          .is("deleted_at", null)
          .order("is_default", { ascending: false }),

        // MTD revenue
        supabase
          .from("revenue_records")
          .select("amount")
          .eq("organization_id", orgId)
          .gte("revenue_date", mtdStart)
          .is("deleted_at", null),

        // MTD expenses
        supabase
          .from("expenses")
          .select("amount")
          .eq("organization_id", orgId)
          .gte("expense_date", mtdStart)
          .is("deleted_at", null)
          .not("status", "eq", "rejected"),

        // Outstanding invoices (not paid/void)
        supabase
          .from("invoices")
          .select("id, total_amount, paid_amount, due_date, status")
          .eq("organization_id", orgId)
          .not("status", "in", '("paid","void")')
          .is("deleted_at", null),

        // Overdue bills
        supabase
          .from("bills")
          .select("id, amount, due_date")
          .eq("organization_id", orgId)
          .lt("due_date", today)
          .not("status", "in", '("paid","void")')
          .is("deleted_at", null),

        // Recent 10 transactions
        supabase
          .from("transactions")
          .select(`
            id, description, amount, direction, txn_date, status,
            bank_accounts ( name, color ),
            transaction_categories ( name, emoji )
          `)
          .eq("organization_id", orgId)
          .is("deleted_at", null)
          .order("txn_date", { ascending: false })
          .limit(10),

        // Pending approvals count
        supabase
          .from("approval_requests")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .eq("decision", "pending"),
      ]);

      const totalCash     = (bankAccounts.data ?? []).reduce((s, a) => s + (a.current_balance ?? 0), 0);
      const revenueMTD    = (mtdRevenue.data ?? []).reduce((s, r) => s + r.amount, 0);
      const expensesMTD   = (mtdExpenses.data ?? []).reduce((s, e) => s + e.amount, 0);
      const outstandingAR = (pendingInvoices.data ?? []).reduce((s, i) => s + (i.total_amount - i.paid_amount), 0);
      const overdueAP     = (overdueBills.data ?? []).reduce((s, b) => s + b.amount, 0);

      return {
        totalCash,
        revenueMTD,
        expensesMTD,
        netMTD:            revenueMTD - expensesMTD,
        outstandingAR,
        overdueAP,
        pendingApprovals:  pendingApprovals.count ?? 0,
        bankAccounts:      bankAccounts.data ?? [],
        recentTransactions: recentTxns.data ?? [],
        overdueInvoices:   (pendingInvoices.data ?? []).filter(
          (i) => i.status === "overdue" || (i.due_date && i.due_date < today)
        ),
      };
    },
  });
}
