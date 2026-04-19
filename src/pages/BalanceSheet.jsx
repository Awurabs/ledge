import { useMemo } from "react";
import { Download, AlertTriangle } from "lucide-react";
import { useChartOfAccounts } from "../hooks/useChartOfAccounts";
import { useFinancialPeriods } from "../hooks/useFinancialPeriods";
import { useAuth } from "../context/AuthContext";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(val, currency = "GHS") {
  const n = val ?? 0;
  const abs = Math.abs(n) / 100;
  const formatted = new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(abs);
  // Accounting convention: negatives in parentheses
  return n < 0 ? `(${formatted})` : formatted;
}

function fmtRatio(n) {
  if (n == null || !isFinite(n) || isNaN(n)) return "N/A";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function sumBalances(accounts = []) {
  return accounts.reduce((s, a) => s + (a.current_balance ?? 0), 0);
}

// ── UI primitives ─────────────────────────────────────────────────────────────

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

function SectionHeader({ label }) {
  return (
    <tr className="bg-gray-50">
      <td
        colSpan={2}
        className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider"
      >
        {label}
      </td>
    </tr>
  );
}

function AccountRow({ account, currency }) {
  const bal = account.current_balance ?? 0;
  const isUnusual = bal < 0;
  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="px-4 py-2.5 pl-7 text-sm text-gray-700">
        <span className="font-mono text-gray-400 text-xs mr-2">{account.code}</span>
        {account.name}
      </td>
      <td
        className={`px-4 py-2.5 text-right text-sm tabular-nums font-medium ${
          isUnusual ? "text-red-600" : "text-gray-800"
        }`}
      >
        {fmt(bal, currency)}
      </td>
    </tr>
  );
}

function SubtotalRow({ label, value, currency }) {
  const isNeg = value < 0;
  return (
    <tr className="border-t border-gray-200 bg-gray-50/80">
      <td className="px-4 py-2 text-sm font-semibold text-gray-800">{label}</td>
      <td
        className={`px-4 py-2 text-right text-sm tabular-nums font-semibold ${
          isNeg ? "text-red-600" : "text-gray-800"
        }`}
      >
        {fmt(value, currency)}
      </td>
    </tr>
  );
}

function TotalRow({ label, value, currency, large = false }) {
  const isNeg = value < 0;
  return (
    <tr className="bg-gray-100 border-t-2 border-gray-300">
      <td
        className={`px-4 py-3 font-bold ${
          large ? "text-base text-gray-900" : "text-sm text-gray-800"
        }`}
      >
        {label}
      </td>
      <td
        className={`px-4 py-3 text-right tabular-nums font-bold ${
          large ? "text-base" : "text-sm"
        } ${isNeg ? "text-red-600" : "text-gray-900"}`}
      >
        {fmt(value, currency)}
      </td>
    </tr>
  );
}

function InlineRow({ label, value, currency, muted = false }) {
  const isNeg = value < 0;
  return (
    <tr className="border-t border-gray-100">
      <td className={`px-4 py-2.5 pl-7 text-sm ${muted ? "text-gray-400 italic" : "text-gray-700"}`}>
        {label}
      </td>
      <td
        className={`px-4 py-2.5 text-right text-sm tabular-nums font-medium ${
          isNeg ? "text-red-500" : muted ? "text-gray-400" : "text-gray-800"
        }`}
      >
        {fmt(value, currency)}
      </td>
    </tr>
  );
}

function StatCard({ label, value, sub, highlight = false }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 flex flex-col gap-1">
      <span className="text-sm text-gray-500">{label}</span>
      <span
        className={`text-2xl font-bold tabular-nums ${
          highlight ? "text-green-600" : "text-gray-900"
        }`}
      >
        {value}
      </span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

// ── Section renderer ─────────────────────────────────────────────────────────

function AccountSection({ sectionLabel, accounts, subtotalLabel, currency }) {
  if (!accounts || accounts.length === 0) return null;
  const total = sumBalances(accounts);
  return (
    <>
      <SectionHeader label={sectionLabel} />
      {accounts.map((acc) => (
        <AccountRow key={acc.id} account={acc} currency={currency} />
      ))}
      <SubtotalRow label={subtotalLabel} value={total} currency={currency} />
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function BalanceSheet() {
  const { orgCurrency } = useAuth();
  const currency = orgCurrency ?? "GHS";

  const { data: accounts = [], isLoading } = useChartOfAccounts({ isActive: true });
  const { data: periods = [] } = useFinancialPeriods();

  // Find most-recent open period name for the "as of" header
  const currentPeriod = periods[0];
  const asOfLabel = currentPeriod
    ? currentPeriod.name
    : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // ── Group accounts by type → subtype ──────────────────────────────────────
  const grouped = useMemo(() => {
    const g = {
      asset:     {},
      liability: {},
      equity:    {},
      revenue:   { all: [] },
      expense:   { all: [] },
    };
    for (const acc of accounts) {
      if (acc.type === "revenue" || acc.type === "expense") {
        g[acc.type].all.push(acc);
        continue;
      }
      if (!g[acc.type]) continue;
      const key = acc.subtype ?? acc.type;
      if (!g[acc.type][key]) g[acc.type][key] = [];
      g[acc.type][key].push(acc);
    }
    return g;
  }, [accounts]);

  // ── Totals ────────────────────────────────────────────────────────────────
  // Assets
  const currentAssets  = sumBalances(grouped.asset["current_asset"]);
  const fixedAssets    = sumBalances(grouped.asset["fixed_asset"]);
  const otherAssets    = sumBalances(grouped.asset["other_asset"]);
  const totalAssets    = currentAssets + fixedAssets + otherAssets;

  // Liabilities
  const currentLiabs   = sumBalances(grouped.liability["current_liability"]);
  const longTermLiabs  = sumBalances(grouped.liability["long_term_liability"]);
  const totalLiabs     = currentLiabs + longTermLiabs;

  // Equity
  const equityBalance  = sumBalances(Object.values(grouped.equity).flat());
  // Net income = revenue (credit-normal balance) − expense (debit-normal balance)
  const totalRevenue   = sumBalances(grouped.revenue.all);
  const totalExpenses  = sumBalances(grouped.expense.all);
  const netIncome      = totalRevenue - totalExpenses;
  const totalEquity    = equityBalance + netIncome;

  const totalLiabsEq   = totalLiabs + totalEquity;

  // ── Key ratios ────────────────────────────────────────────────────────────
  const currentRatio   = currentLiabs > 0 ? currentAssets / currentLiabs : null;
  const debtToEquity   = totalEquity  > 0 ? totalLiabs    / totalEquity  : null;

  // Balance check (allow ±1 cent rounding)
  const outOfBalance   = Math.abs(totalAssets - totalLiabsEq) > 1;
  const imbalanceAmt   = Math.abs(totalAssets - totalLiabsEq);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F7F8] p-6">
        <div className="max-w-screen-xl mx-auto space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </div>
    );
  }

  const hasAccounts = accounts.length > 0;

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-6">
      <div className="max-w-screen-xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Balance Sheet</h1>
            <p className="text-sm text-gray-500 mt-0.5">As of {asOfLabel}</p>
          </div>
          <div className="flex items-center gap-3">
            {outOfBalance && hasAccounts && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">
                <AlertTriangle size={13} />
                Out of balance by {fmt(imbalanceAmt, currency)}
              </div>
            )}
            <button className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
              <Download size={15} />
              Export
            </button>
          </div>
        </div>

        {!hasAccounts ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-16 text-center">
            <p className="text-gray-500 text-sm">
              No accounts found. Add accounts in Chart of Accounts to see your balance sheet.
            </p>
          </div>
        ) : (
          <>
            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

              {/* ── LEFT: ASSETS ─────────────────────────────────────── */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
                    Assets
                  </h2>
                  <span className="text-xs text-gray-400 tabular-nums font-medium">
                    {fmt(totalAssets, currency)}
                  </span>
                </div>
                <table className="w-full border-collapse">
                  <tbody>
                    <AccountSection
                      sectionLabel="Current Assets"
                      accounts={grouped.asset["current_asset"]}
                      subtotalLabel="Total Current Assets"
                      currency={currency}
                    />
                    <AccountSection
                      sectionLabel="Fixed Assets"
                      accounts={grouped.asset["fixed_asset"]}
                      subtotalLabel="Total Fixed Assets"
                      currency={currency}
                    />
                    <AccountSection
                      sectionLabel="Other Assets"
                      accounts={grouped.asset["other_asset"]}
                      subtotalLabel="Total Other Assets"
                      currency={currency}
                    />
                    {/* Catch-all for assets with no subtype */}
                    {grouped.asset["asset"] && (
                      <AccountSection
                        sectionLabel="Assets (Unclassified)"
                        accounts={grouped.asset["asset"]}
                        subtotalLabel="Total Unclassified Assets"
                        currency={currency}
                      />
                    )}
                    <TotalRow label="Total Assets" value={totalAssets} currency={currency} large />
                  </tbody>
                </table>
              </div>

              {/* ── RIGHT: LIABILITIES & EQUITY ──────────────────────── */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
                    Liabilities &amp; Equity
                  </h2>
                  <span className="text-xs text-gray-400 tabular-nums font-medium">
                    {fmt(totalLiabsEq, currency)}
                  </span>
                </div>
                <table className="w-full border-collapse">
                  <tbody>
                    {/* Current Liabilities */}
                    <AccountSection
                      sectionLabel="Current Liabilities"
                      accounts={grouped.liability["current_liability"]}
                      subtotalLabel="Total Current Liabilities"
                      currency={currency}
                    />
                    {/* Long-term Liabilities */}
                    <AccountSection
                      sectionLabel="Long-term Liabilities"
                      accounts={grouped.liability["long_term_liability"]}
                      subtotalLabel="Total Long-term Liabilities"
                      currency={currency}
                    />
                    {/* Catch-all */}
                    {grouped.liability["liability"] && (
                      <AccountSection
                        sectionLabel="Liabilities (Unclassified)"
                        accounts={grouped.liability["liability"]}
                        subtotalLabel="Total Unclassified Liabilities"
                        currency={currency}
                      />
                    )}

                    {/* Total Liabilities divider */}
                    {totalLiabs !== 0 && (
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-2.5 text-sm font-semibold text-gray-800">
                          Total Liabilities
                        </td>
                        <td
                          className={`px-4 py-2.5 text-right text-sm tabular-nums font-semibold ${
                            totalLiabs < 0 ? "text-red-600" : "text-gray-800"
                          }`}
                        >
                          {fmt(totalLiabs, currency)}
                        </td>
                      </tr>
                    )}

                    {/* Equity */}
                    <SectionHeader label="Equity" />
                    {(grouped.equity["equity"] ?? []).map((acc) => (
                      <AccountRow key={acc.id} account={acc} currency={currency} />
                    ))}
                    {/* Net income row — pre-closing retained earnings */}
                    <InlineRow
                      label="Net Income (Current Period)"
                      value={netIncome}
                      currency={currency}
                      muted={netIncome === 0}
                    />
                    <SubtotalRow
                      label="Total Equity"
                      value={totalEquity}
                      currency={currency}
                    />

                    <TotalRow
                      label="Total Liabilities & Equity"
                      value={totalLiabsEq}
                      currency={currency}
                      large
                    />
                  </tbody>
                </table>
              </div>
            </div>

            {/* Key ratio cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label="Current Ratio"
                value={currentRatio != null ? fmtRatio(currentRatio) : "N/A"}
                sub="Current Assets ÷ Current Liabilities"
                highlight={currentRatio != null && currentRatio >= 2}
              />
              <StatCard
                label="Debt-to-Equity"
                value={debtToEquity != null ? fmtRatio(debtToEquity) : "N/A"}
                sub="Total Liabilities ÷ Total Equity"
              />
              <StatCard
                label="Net Income"
                value={fmt(netIncome, currency)}
                sub={
                  netIncome > 0
                    ? "Current period profit"
                    : netIncome < 0
                    ? "Current period loss"
                    : "Break-even"
                }
                highlight={netIncome > 0}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
