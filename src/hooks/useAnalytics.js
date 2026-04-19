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

function getRangeForPeriod(period) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const year = now.getFullYear();
  const month = now.getMonth();

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
  const today = now.toISOString().slice(0, 10);
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
        invoices,
        bills,
        bankAccounts,
        expensesWithCategory,
        revenueWithCategory,
        contacts,
      ] = await Promise.all([

        // Current-period revenue
        supabase
          .from("revenue_records")
          .select("amount, revenue_date, status")
          .eq("organization_id", orgId)
          .gte("revenue_date", range.from)
          .lte("revenue_date", range.to)
          .not("status", "eq", "void")
          .is("deleted_at", null),

        // Prior-period revenue
        supabase
          .from("revenue_records")
          .select("amount")
          .eq("organization_id", orgId)
          .gte("revenue_date", prevRange.from)
          .lte("revenue_date", prevRange.to)
          .not("status", "eq", "void")
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

        // All invoices in range for AR aging
        supabase
          .from("invoices")
          .select("id, total_amount, amount_paid, amount_due, due_date, status, contact_id")
          .eq("organization_id", orgId)
          .is("deleted_at", null)
          .not("status", "in", '("void","draft")'),

        // Bills in range for AP  (bills uses `amount`, not total_amount)
        supabase
          .from("bills")
          .select("id, amount, due_date, status")
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

        // Revenue with category for breakdown
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
          .is("deleted_at", null),

        // Contacts for top customers
        supabase
          .from("contacts")
          .select("id, name")
          .eq("organization_id", orgId)
          .eq("is_active", true),
      ]);

      // ── Scalar totals ──────────────────────────────────────────────────────
      const totalRevenue     = sumField(revenue.data,      "amount");
      const totalPrevRevenue = sumField(prevRevenue.data,  "amount");
      const totalExpenses    = sumField(expenses.data,     "amount");
      const totalPrevExp     = sumField(prevExpenses.data, "amount");
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

      for (const r of revenue.data  ?? []) revByMonth[monthKey(r.revenue_date)]  = (revByMonth[monthKey(r.revenue_date)]  ?? 0) + r.amount;
      for (const e of expenses.data ?? []) expByMonth[monthKey(e.expense_date)]  = (expByMonth[monthKey(e.expense_date)]  ?? 0) + e.amount;

      const monthlyTrend = trendMonths.map((key) => ({
        month:    new Date(key + "-02").toLocaleDateString("en-GH", { month: "short", year: "2-digit" }),
        revenue:  (revByMonth[key]  ?? 0) / 100,
        expenses: (expByMonth[key]  ?? 0) / 100,
        net:      ((revByMonth[key] ?? 0) - (expByMonth[key] ?? 0)) / 100,
      }));

      // ── Expense breakdown by category ──────────────────────────────────────
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

      // ── Revenue breakdown by category ──────────────────────────────────────
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

      for (const inv of invoices.data ?? []) {
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
        { label: "Current",  days: "Not yet due",  amount: agingBuckets.current, color: "#22C55E" },
        { label: "1–30 d",   days: "1-30 days",    amount: agingBuckets["1-30"], color: "#FBBF24" },
        { label: "31–60 d",  days: "31-60 days",   amount: agingBuckets["31-60"], color: "#F97316" },
        { label: "61–90 d",  days: "61-90 days",   amount: agingBuckets["61-90"], color: "#EF4444" },
        { label: "90+ d",    days: "Over 90 days", amount: agingBuckets["90+"],  color: "#991B1B" },
      ];
      const totalAR = Object.values(agingBuckets).reduce((s, v) => s + v, 0);

      // ── Top customers (by invoice outstanding or billed) ─────────────────
      const customerMap = {};
      for (const inv of invoices.data ?? []) {
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

      // ── AP outstanding (bills not paid) ─────────────────────────────────
      const totalAP = sumField(
        (bills.data ?? []).filter((b) => b.status !== "paid"),
        "amount"
      );

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
