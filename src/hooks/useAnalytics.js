import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// ── Helpers ────────────────────────────────────────────────────────────────────

function monthKey(dateStr) {
  return dateStr?.slice(0, 7) ?? "";
}

function lastNMonths(n) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (n - 1 - i));
    return d.toISOString().slice(0, 7);
  });
}

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

function getRangeForPeriod(period) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const year = now.getFullYear();

  switch (period) {
    case "30d": {
      const from = new Date(now);
      from.setDate(from.getDate() - 29);
      return { from: from.toISOString().slice(0, 10), to: today };
    }
    case "90d": {
      const from = new Date(now);
      from.setDate(from.getDate() - 89);
      return { from: from.toISOString().slice(0, 10), to: today };
    }
    case "6m": {
      const from = new Date(now);
      from.setDate(1);
      from.setMonth(from.getMonth() - 5);
      return { from: from.toISOString().slice(0, 10), to: today };
    }
    case "12m": {
      const from = new Date(now);
      from.setDate(1);
      from.setMonth(from.getMonth() - 11);
      return { from: from.toISOString().slice(0, 10), to: today };
    }
    case "ytd": {
      return { from: `${year}-01-01`, to: today };
    }
    default:
      return { from: `${year - 1}-01-01`, to: today };
  }
}

function prevPeriodRange(period) {
  // Returns the equivalent prior period for comparison
  const now = new Date();
  switch (period) {
    case "30d": {
      const to = new Date(now); to.setDate(to.getDate() - 30);
      const from = new Date(to); from.setDate(from.getDate() - 29);
      return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
    }
    case "90d": {
      const to = new Date(now); to.setDate(to.getDate() - 90);
      const from = new Date(to); from.setDate(from.getDate() - 89);
      return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
    }
    case "6m": {
      const to = new Date(now); to.setDate(1); to.setMonth(to.getMonth() - 6);
      const from = new Date(to); from.setMonth(from.getMonth() - 5);
      return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
    }
    case "12m": {
      const to = new Date(now); to.setDate(1); to.setMonth(to.getMonth() - 12);
      const from = new Date(to); from.setMonth(from.getMonth() - 11);
      return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
    }
    case "ytd": {
      const year = now.getFullYear();
      return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
    }
    default:
      return { from: `${now.getFullYear() - 2}-01-01`, to: `${now.getFullYear() - 1}-12-31` };
  }
}

// ── Main analytics hook ────────────────────────────────────────────────────────

/**
 * All monetary aggregations use the same three-source logic as the authoritative pages:
 *   Revenue  = revenue_records (non-invoice-linked) + invoices + credit transactions
 *   Expenses = expenses + bills + reimbursements
 */
export function useAnalytics(period = "6m") {
  const { orgId } = useAuth();
  const range = getRangeForPeriod(period);
  const prevRange = prevPeriodRange(period);

  return useQuery({
    queryKey: ["analytics", orgId, period],
    enabled: !!orgId,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const [
        revenue,
        prevRevenue,
        expenses,
        prevExpenses,
        invoices,           // all non-void/draft invoices — filtered by issue_date in JS for revenue
        bills,              // all non-void bills — filtered by bill_date in JS for expenses
        bankAccounts,
        expensesWithCategory,
        revenueWithCategory,
        contacts,
        // ── Additional sources ───────────────────────────────────────────────
        creditTxns,         // credit transactions in current range
        prevCreditTxns,     // credit transactions in prior range
        reimbursements,     // reimbursements in current range
        prevReimbursements, // reimbursements in prior range
      ] = await Promise.all([

        // Current-period revenue records (exclude invoice-linked to avoid double-count)
        supabase
          .from("revenue_records")
          .select("amount, revenue_date, status")
          .eq("organization_id", orgId)
          .gte("revenue_date", range.from)
          .lte("revenue_date", range.to)
          .not("status", "eq", "void")
          .is("invoice_id", null)
          .is("deleted_at", null),

        // Prior-period revenue records (exclude invoice-linked)
        supabase
          .from("revenue_records")
          .select("amount")
          .eq("organization_id", orgId)
          .gte("revenue_date", prevRange.from)
          .lte("revenue_date", prevRange.to)
          .not("status", "eq", "void")
          .is("invoice_id", null)
          .is("deleted_at", null),

        // Current-period expenses
        supabase
          .from("expenses")
          .select("amount, expense_date, status")
          .eq("organization_id", orgId)
          .gte("expense_date", range.from)
          .lte("expense_date", range.to)
          .not("status", "eq", "rejected")
          .is("deleted_at", null),

        // Prior-period expenses
        supabase
          .from("expenses")
          .select("amount")
          .eq("organization_id", orgId)
          .gte("expense_date", prevRange.from)
          .lte("expense_date", prevRange.to)
          .not("status", "eq", "rejected")
          .is("deleted_at", null),

        // All invoices (non-void/draft) — includes issue_date for JS range filtering
        supabase
          .from("invoices")
          .select("id, total_amount, amount_paid, amount_due, due_date, issue_date, status, contact_id")
          .eq("organization_id", orgId)
          .is("deleted_at", null)
          .not("status", "in", '("void","draft")'),

        // All bills (non-void) — includes bill_date for JS range filtering
        supabase
          .from("bills")
          .select("id, amount, bill_date, due_date, status")
          .eq("organization_id", orgId)
          .is("deleted_at", null)
          .not("status", "in", '("void")'),

        // Bank accounts for cash position
        supabase
          .from("bank_accounts")
          .select("id, name, type, current_balance, currency, color")
          .eq("organization_id", orgId)
          .eq("is_active", true)
          .is("deleted_at", null),

        // Expenses with category for breakdown
        supabase
          .from("expenses")
          .select(`
            amount, expense_date,
            transaction_categories ( name, emoji )
          `)
          .eq("organization_id", orgId)
          .gte("expense_date", range.from)
          .lte("expense_date", range.to)
          .not("status", "eq", "rejected")
          .is("deleted_at", null),

        // Revenue records with category for breakdown (non-invoice-linked)
        supabase
          .from("revenue_records")
          .select(`
            amount, revenue_date,
            transaction_categories ( name, emoji )
          `)
          .eq("organization_id", orgId)
          .gte("revenue_date", range.from)
          .lte("revenue_date", range.to)
          .not("status", "eq", "void")
          .is("invoice_id", null)
          .is("deleted_at", null),

        // Contacts for top customers
        supabase
          .from("contacts")
          .select("id, name")
          .eq("organization_id", orgId)
          .eq("is_active", true),

        // Credit transactions — current period
        supabase
          .from("transactions")
          .select("amount, txn_date")
          .eq("organization_id", orgId)
          .eq("direction", "credit")
          .gte("txn_date", range.from)
          .lte("txn_date", range.to)
          .is("deleted_at", null),

        // Credit transactions — prior period
        supabase
          .from("transactions")
          .select("amount, txn_date")
          .eq("organization_id", orgId)
          .eq("direction", "credit")
          .gte("txn_date", prevRange.from)
          .lte("txn_date", prevRange.to)
          .is("deleted_at", null),

        // Reimbursements — current period
        supabase
          .from("reimbursement_requests")
          .select("total_amount, submitted_at, created_at")
          .eq("organization_id", orgId)
          .gte("created_at", range.from)
          .lte("created_at", range.to),

        // Reimbursements — prior period
        supabase
          .from("reimbursement_requests")
          .select("total_amount, submitted_at, created_at")
          .eq("organization_id", orgId)
          .gte("created_at", prevRange.from)
          .lte("created_at", prevRange.to),
      ]);

      // ── Invoice revenue — filter invoices by issue_date in JS ──────────────
      const allInvoicesData    = invoices.data ?? [];
      const invoicesInRange    = allInvoicesData.filter(
        (inv) => inv.issue_date >= range.from && inv.issue_date <= range.to
      );
      const invoicesInPrevRange = allInvoicesData.filter(
        (inv) => inv.issue_date >= prevRange.from && inv.issue_date <= prevRange.to
      );

      const invoiceRevCurrent  = invoicesInRange.reduce((s, inv) => s + invoiceRevAmount(inv), 0);
      const invoiceRevPrev     = invoicesInPrevRange.reduce((s, inv) => s + invoiceRevAmount(inv), 0);

      // ── Bill expenses — filter by bill_date in JS ─────────────────────────
      const allBillsData    = bills.data ?? [];
      const billsInRange    = allBillsData.filter(
        (b) => (b.bill_date ?? "") >= range.from && (b.bill_date ?? "") <= range.to
      );
      const billsInPrevRange = allBillsData.filter(
        (b) => (b.bill_date ?? "") >= prevRange.from && (b.bill_date ?? "") <= prevRange.to
      );

      const billExpCurrent = billsInRange.reduce((s, b) => s + (b.amount ?? 0), 0);
      const billExpPrev    = billsInPrevRange.reduce((s, b) => s + (b.amount ?? 0), 0);

      // ── Scalar totals (all three sources each) ─────────────────────────────
      const totalRevenue     = sumField(revenue.data,      "amount") + invoiceRevCurrent + sumField(creditTxns.data, "amount");
      const totalPrevRevenue = sumField(prevRevenue.data,  "amount") + invoiceRevPrev    + sumField(prevCreditTxns.data, "amount");
      const totalExpenses    = sumField(expenses.data,     "amount") + billExpCurrent    + sumField(reimbursements.data, "total_amount");
      const totalPrevExp     = sumField(prevExpenses.data, "amount") + billExpPrev       + sumField(prevReimbursements.data, "total_amount");
      const netIncome        = totalRevenue - totalExpenses;
      const prevNetIncome    = totalPrevRevenue - totalPrevExp;
      const totalCash        = sumField(bankAccounts.data, "current_balance");

      const revChange  = totalPrevRevenue > 0 ? ((totalRevenue - totalPrevRevenue) / totalPrevRevenue) * 100 : null;
      const expChange  = totalPrevExp     > 0 ? ((totalExpenses - totalPrevExp)    / totalPrevExp)     * 100 : null;
      const netChange  = prevNetIncome    !== 0 ? ((netIncome - prevNetIncome)      / Math.abs(prevNetIncome)) * 100 : null;

      // ── Monthly trend (always 12 months for the trend chart) ──────────────
      const trendMonths = lastNMonths(12);
      const revByMonth  = {};
      const expByMonth  = {};

      // Revenue records
      for (const r of revenue.data  ?? []) revByMonth[monthKey(r.revenue_date)]  = (revByMonth[monthKey(r.revenue_date)]  ?? 0) + r.amount;

      // Invoice revenue by issue_date
      for (const inv of invoicesInRange) {
        const key = monthKey(inv.issue_date);
        if (key) revByMonth[key] = (revByMonth[key] ?? 0) + invoiceRevAmount(inv);
      }

      // Credit transaction revenue by txn_date
      for (const t of creditTxns.data ?? []) {
        const key = monthKey(t.txn_date);
        if (key) revByMonth[key] = (revByMonth[key] ?? 0) + (t.amount ?? 0);
      }

      // Expense records
      for (const e of expenses.data ?? []) expByMonth[monthKey(e.expense_date)]  = (expByMonth[monthKey(e.expense_date)]  ?? 0) + e.amount;

      // Bill expenses by bill_date
      for (const b of billsInRange) {
        const key = monthKey(b.bill_date);
        if (key) expByMonth[key] = (expByMonth[key] ?? 0) + (b.amount ?? 0);
      }

      // Reimbursement expenses by created_at date
      for (const r of reimbursements.data ?? []) {
        const key = monthKey((r.submitted_at ?? r.created_at ?? "").slice(0, 10));
        if (key) expByMonth[key] = (expByMonth[key] ?? 0) + (r.total_amount ?? 0);
      }

      const monthlyTrend = trendMonths.map((key) => ({
        month:    new Date(key + "-02").toLocaleDateString("en-GH", { month: "short", year: "2-digit" }),
        revenue:  (revByMonth[key]  ?? 0) / 100,
        expenses: (expByMonth[key]  ?? 0) / 100,
        net:      ((revByMonth[key] ?? 0) - (expByMonth[key] ?? 0)) / 100,
      }));

      // ── Expense breakdown by category (from expense records only) ──────────
      const catMap = {};
      for (const e of expensesWithCategory.data ?? []) {
        const name = e.transaction_categories?.name ?? "Uncategorized";
        const emoji = e.transaction_categories?.emoji ?? "💼";
        if (!catMap[name]) catMap[name] = { name, emoji, amount: 0 };
        catMap[name].amount += e.amount ?? 0;
      }
      const expenseByCategory = Object.values(catMap)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 8)
        .map((c) => ({ ...c, value: c.amount / 100 }));

      // ── Revenue breakdown by category (from revenue records only) ──────────
      const revCatMap = {};
      for (const r of revenueWithCategory.data ?? []) {
        const name = r.transaction_categories?.name ?? "Uncategorized";
        const emoji = r.transaction_categories?.emoji ?? "💰";
        if (!revCatMap[name]) revCatMap[name] = { name, emoji, amount: 0 };
        revCatMap[name].amount += r.amount ?? 0;
      }
      const revenueByCategory = Object.values(revCatMap)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 6)
        .map((c) => ({ ...c, value: c.amount / 100 }));

      // ── AR aging buckets ──────────────────────────────────────────────────
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const agingBuckets = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
      const arItems = [];

      for (const inv of allInvoicesData) {
        const due = inv.due_date ? new Date(inv.due_date) : null;
        const outstanding = inv.amount_due ?? 0;
        if (outstanding <= 0) continue;

        const contactName = contacts.data?.find((c) => c.id === inv.contact_id)?.name ?? "Unknown";
        arItems.push({ ...inv, contactName, outstanding });

        if (!due || due >= today) {
          agingBuckets.current += outstanding;
        } else {
          const daysLate = Math.ceil((today - due) / 86400000);
          if (daysLate <= 30)       agingBuckets["1-30"]  += outstanding;
          else if (daysLate <= 60)  agingBuckets["31-60"] += outstanding;
          else if (daysLate <= 90)  agingBuckets["61-90"] += outstanding;
          else                      agingBuckets["90+"]   += outstanding;
        }
      }

      const arAging = [
        { label: "Current",  days: "Not yet due",  amount: agingBuckets.current,   color: "#22C55E" },
        { label: "1–30 d",   days: "1-30 days",    amount: agingBuckets["1-30"],   color: "#FBBF24" },
        { label: "31–60 d",  days: "31-60 days",   amount: agingBuckets["31-60"],  color: "#F97316" },
        { label: "61–90 d",  days: "61-90 days",   amount: agingBuckets["61-90"],  color: "#EF4444" },
        { label: "90+ d",    days: "Over 90 days", amount: agingBuckets["90+"],    color: "#991B1B" },
      ];
      const totalAR = Object.values(agingBuckets).reduce((s, v) => s + v, 0);

      // ── Top customers (by invoice outstanding or billed) ─────────────────
      const customerMap = {};
      for (const inv of allInvoicesData) {
        if (!inv.contact_id) continue;
        const name = contacts.data?.find((c) => c.id === inv.contact_id)?.name ?? "Unknown";
        if (!customerMap[inv.contact_id]) customerMap[inv.contact_id] = { name, total: 0, paid: 0, outstanding: 0 };
        customerMap[inv.contact_id].total       += inv.total_amount ?? 0;
        customerMap[inv.contact_id].paid        += (inv.total_amount ?? 0) - (inv.amount_due ?? 0);
        customerMap[inv.contact_id].outstanding += inv.amount_due   ?? 0;
      }
      const topCustomers = Object.values(customerMap)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      // ── AP outstanding (bills not paid) — filter by bill_date in JS ──────
      const totalAP = allBillsData
        .filter((b) => b.status !== "paid")
        .reduce((s, b) => s + (b.amount ?? 0), 0);

      // ── Profitability margin ──────────────────────────────────────────────
      const grossMargin = totalRevenue > 0 ? ((netIncome / totalRevenue) * 100) : null;

      return {
        // Scalars
        totalRevenue, totalPrevRevenue, revChange,
        totalExpenses, totalPrevExp, expChange,
        netIncome, prevNetIncome, netChange,
        totalCash,
        totalAR, totalAP,
        grossMargin,
        // Collections
        monthlyTrend,
        expenseByCategory,
        revenueByCategory,
        arAging,
        topCustomers,
        bankAccounts: bankAccounts.data ?? [],
      };
    },
  });
}
