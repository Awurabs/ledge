import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Build a YYYY-MM key from a date string */
function monthKey(dateStr) {
  return dateStr?.slice(0, 7) ?? "";
}

/** Generate last N month keys (oldest first) */
function lastNMonths(n) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (n - 1 - i));
    return d.toISOString().slice(0, 7);
  });
}

/** Sum a field over an array of records */
function sumField(rows, field) {
  return (rows ?? []).reduce((s, r) => s + (r[field] ?? 0), 0);
}

/**
 * Revenue amount to count for an invoice, matching Revenue.jsx normalise() logic:
 *   paid      → total_amount
 *   partial   → amount_paid (what's actually been received)
 *   others    → amount_due  (what's outstanding / expected)
 */
function invoiceRevAmount(inv) {
  if (inv.status === "paid") return inv.total_amount ?? 0;
  if (inv.status === "partial" || inv.status === "partially_paid") return inv.amount_paid ?? 0;
  return inv.amount_due ?? inv.total_amount ?? 0;
}

// ── Main hook ──────────────────────────────────────────────────────────────────

/**
 * Aggregated KPI data for the dashboard.
 * All monetary values are in minor units (e.g. GHS pesewas).
 *
 * Revenue = revenue_records (non-invoice-linked) + invoices + credit transactions
 * Expenses = expenses + bills + reimbursements
 * (matches the authoritative Revenue and Expenses pages)
 */
export function useDashboardKPIs() {
  const { orgId } = useAuth();

  return useQuery({
    queryKey: ["dashboard_kpis", orgId],
    enabled: !!orgId,
    staleTime: 1000 * 60 * 3, // 3-min cache
    queryFn: async () => {
      const now = new Date();
      const mtdStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const today    = now.toISOString().slice(0, 10);

      // 6-month window for the trend chart
      const trendStart = (() => {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - 5);
        return d.toISOString().slice(0, 10);
      })();

      const [
        bankAccounts,
        mtdRevenue,
        mtdExpenses,
        pendingInvoices,
        overdueBills,
        recentTxns,
        pendingApprovals,
        trendRevenue,
        trendExpenses,
        pendingReimbs,
        // ── Additional sources for consistent revenue/expense totals ──────────
        allRevInvoices,     // invoices issued since trendStart (for MTD + trend)
        allCreditTxns,      // credit transactions since trendStart
        allExpBills,        // bills since trendStart
        allExpReimbs,       // reimbursements since trendStart
      ] = await Promise.all([

        // ── Cash / bank balances ─────────────────────────────────────────────
        supabase
          .from("bank_accounts")
          .select("id, name, type, current_balance, currency, color, is_default")
          .eq("organization_id", orgId)
          .eq("is_active", true)
          .is("deleted_at", null)
          .order("is_default", { ascending: false }),

        // ── Revenue records this month (exclude invoice-linked to avoid double-count) ──
        supabase
          .from("revenue_records")
          .select("amount")
          .eq("organization_id", orgId)
          .gte("revenue_date", mtdStart)
          .is("invoice_id", null)
          .is("deleted_at", null),

        // ── Expense records this month ────────────────────────────────────────
        supabase
          .from("expenses")
          .select("amount")
          .eq("organization_id", orgId)
          .gte("expense_date", mtdStart)
          .is("deleted_at", null)
          .not("status", "eq", "rejected"),

        // ── Outstanding invoices (not paid/void) ─────────────────────────────
        supabase
          .from("invoices")
          .select("id, total_amount, paid_amount, due_date, status")
          .eq("organization_id", orgId)
          .not("status", "in", '("paid","void")')
          .is("deleted_at", null),

        // ── Overdue bills ────────────────────────────────────────────────────
        supabase
          .from("bills")
          .select("id, amount, due_date")
          .eq("organization_id", orgId)
          .lt("due_date", today)
          .not("status", "in", '("paid","void")')
          .is("deleted_at", null),

        // ── Recent 8 transactions ─────────────────────────────────────────────
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
          .limit(8),

        // ── Pending approvals count ──────────────────────────────────────────
        supabase
          .from("approval_requests")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .eq("decision", "pending"),

        // ── 6-month revenue records for trend chart (non-invoice-linked) ─────
        supabase
          .from("revenue_records")
          .select("amount, revenue_date")
          .eq("organization_id", orgId)
          .gte("revenue_date", trendStart)
          .is("invoice_id", null)
          .is("deleted_at", null),

        // ── 6-month expense records for trend chart ───────────────────────────
        supabase
          .from("expenses")
          .select("amount, expense_date")
          .eq("organization_id", orgId)
          .gte("expense_date", trendStart)
          .is("deleted_at", null)
          .not("status", "eq", "rejected"),

        // ── Pending reimbursements count ─────────────────────────────────────
        supabase
          .from("reimbursement_requests")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .in("status", ["submitted", "approved"]),

        // ── Invoices from trendStart (non-draft/void) — used for both MTD & trend ──
        supabase
          .from("invoices")
          .select("total_amount, amount_paid, amount_due, status, issue_date")
          .eq("organization_id", orgId)
          .gte("issue_date", trendStart)
          .not("status", "in", '("draft","void")')
          .is("deleted_at", null),

        // ── Credit transactions from trendStart — used for both MTD & trend ──
        supabase
          .from("transactions")
          .select("amount, txn_date")
          .eq("organization_id", orgId)
          .eq("direction", "credit")
          .gte("txn_date", trendStart)
          .is("deleted_at", null),

        // ── Bills from trendStart (non-void) — used for both MTD & trend ─────
        supabase
          .from("bills")
          .select("amount, bill_date")
          .eq("organization_id", orgId)
          .gte("bill_date", trendStart)
          .not("status", "eq", "void")
          .is("deleted_at", null),

        // ── Reimbursements from trendStart — used for both MTD & trend ───────
        supabase
          .from("reimbursement_requests")
          .select("total_amount, submitted_at, created_at")
          .eq("organization_id", orgId)
          .gte("created_at", trendStart),
      ]);

      // ── MTD: add invoice + credit-txn revenue ────────────────────────────────
      const mtdInvoiceRev = (allRevInvoices.data ?? [])
        .filter((inv) => (inv.issue_date ?? "") >= mtdStart)
        .reduce((s, inv) => s + invoiceRevAmount(inv), 0);

      const mtdCreditRev = (allCreditTxns.data ?? [])
        .filter((t) => (t.txn_date ?? "") >= mtdStart)
        .reduce((s, t) => s + (t.amount ?? 0), 0);

      // ── MTD: add bill + reimbursement expenses ────────────────────────────────
      const mtdBillExp = (allExpBills.data ?? [])
        .filter((b) => (b.bill_date ?? "") >= mtdStart)
        .reduce((s, b) => s + (b.amount ?? 0), 0);

      const mtdReimbExp = (allExpReimbs.data ?? [])
        .filter((r) => ((r.submitted_at ?? r.created_at ?? "") >= mtdStart))
        .reduce((s, r) => s + (r.total_amount ?? 0), 0);

      // ── Scalar KPIs ──────────────────────────────────────────────────────────
      const totalCash   = sumField(bankAccounts.data, "current_balance");
      const revenueMTD  = sumField(mtdRevenue.data,  "amount") + mtdInvoiceRev + mtdCreditRev;
      const expensesMTD = sumField(mtdExpenses.data, "amount") + mtdBillExp + mtdReimbExp;

      const outstandingAR = (pendingInvoices.data ?? []).reduce(
        (s, i) => s + Math.max(0, (i.total_amount ?? 0) - (i.paid_amount ?? 0)), 0
      );
      const overdueAP = sumField(overdueBills.data, "amount");

      // ── 6-month trend ────────────────────────────────────────────────────────
      const months = lastNMonths(6);

      const revenueByMonth  = {};
      const expensesByMonth = {};

      // Revenue records
      for (const r of trendRevenue.data ?? [])
        revenueByMonth[monthKey(r.revenue_date)]  = (revenueByMonth[monthKey(r.revenue_date)]  ?? 0) + r.amount;

      // Invoice revenue
      for (const inv of allRevInvoices.data ?? []) {
        const key = monthKey(inv.issue_date);
        if (key) revenueByMonth[key] = (revenueByMonth[key] ?? 0) + invoiceRevAmount(inv);
      }

      // Credit transaction revenue
      for (const t of allCreditTxns.data ?? []) {
        const key = monthKey(t.txn_date);
        if (key) revenueByMonth[key] = (revenueByMonth[key] ?? 0) + (t.amount ?? 0);
      }

      // Expense records
      for (const e of trendExpenses.data ?? [])
        expensesByMonth[monthKey(e.expense_date)] = (expensesByMonth[monthKey(e.expense_date)] ?? 0) + e.amount;

      // Bill expenses
      for (const b of allExpBills.data ?? []) {
        const key = monthKey(b.bill_date);
        if (key) expensesByMonth[key] = (expensesByMonth[key] ?? 0) + (b.amount ?? 0);
      }

      // Reimbursement expenses
      for (const r of allExpReimbs.data ?? []) {
        const key = monthKey((r.submitted_at ?? r.created_at ?? "").slice(0, 10));
        if (key) expensesByMonth[key] = (expensesByMonth[key] ?? 0) + (r.total_amount ?? 0);
      }

      const monthlyTrend = months.map((key) => ({
        month:    new Date(key + "-01").toLocaleDateString("en-GH", { month: "short" }),
        revenue:  (revenueByMonth[key]  ?? 0) / 100,
        expenses: (expensesByMonth[key] ?? 0) / 100,
        net:      ((revenueByMonth[key] ?? 0) - (expensesByMonth[key] ?? 0)) / 100,
      }));

      return {
        // scalars
        totalCash,
        revenueMTD,
        expensesMTD,
        netMTD:           revenueMTD - expensesMTD,
        outstandingAR,
        overdueAP,
        pendingApprovals: pendingApprovals.count ?? 0,
        pendingReimbs:    pendingReimbs.count    ?? 0,
        // collections
        bankAccounts:        bankAccounts.data        ?? [],
        recentTransactions:  recentTxns.data          ?? [],
        overdueInvoices:     (pendingInvoices.data    ?? []).filter(
          (i) => i.status === "overdue" || (i.due_date && i.due_date < today)
        ),
        // chart
        monthlyTrend,
      };
    },
  });
}
