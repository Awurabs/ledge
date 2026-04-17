import { useState, useMemo } from "react";
import { Download, ChevronDown, ChevronRight } from "lucide-react";
import { useRevenue } from "../hooks/useRevenue";
import { useExpenses } from "../hooks/useExpenses";
import { useFinancialPeriods } from "../hooks/useFinancialPeriods";
import { useAuth } from "../context/AuthContext";

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtCurrency(amountMinor, currency = "GHS") {
  const v = (amountMinor ?? 0) / 100;
  return new Intl.NumberFormat("en-GH", {
    style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v);
}

function fmtPct(v) {
  if (!isFinite(v) || isNaN(v)) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}

function getPeriodRange(period) {
  if (!period) return null;
  const { period_year: year, period_month: month } = period;
  if (!month || month === 0) {
    return { dateFrom: `${year}-01-01`, dateTo: `${year}-12-31` };
  }
  const m = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return { dateFrom: `${year}-${m}-01`, dateTo: `${year}-${m}-${String(lastDay).padStart(2, "0")}` };
}

function getPriorRange(period) {
  if (!period) return null;
  const { period_year: year, period_month: month } = period;
  if (!month || month === 0) {
    return { dateFrom: `${year - 1}-01-01`, dateTo: `${year - 1}-12-31` };
  }
  const priorMonth = month === 1 ? 12 : month - 1;
  const priorYear  = month === 1 ? year - 1 : year;
  const m = String(priorMonth).padStart(2, "0");
  const lastDay = new Date(priorYear, priorMonth, 0).getDate();
  return { dateFrom: `${priorYear}-${m}-01`, dateTo: `${priorYear}-${m}-${String(lastDay).padStart(2, "0")}` };
}

function groupByCategory(records) {
  const map = {};
  for (const r of records) {
    const cat = r.transaction_categories?.name ?? "Uncategorized";
    if (!map[cat]) map[cat] = 0;
    map[cat] += r.amount ?? 0;
  }
  return Object.entries(map)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

// ── Sub-components ────────────────────────────────────────────────────────────
function VarianceCell({ value, pct = false }) {
  const isNeg = value < 0;
  const isZero = value === 0;
  const color = isZero ? "text-gray-500" : isNeg ? "text-red-600" : "text-green-600";
  const display = pct
    ? fmtPct(value)
    : isNeg ? `(${fmtCurrency(Math.abs(value))})` : `+${fmtCurrency(value)}`;
  return <span className={`tabular-nums font-medium ${color}`}>{display}</span>;
}

function SectionHeaderRow({ label }) {
  return (
    <tr className="bg-gray-100">
      <td colSpan={5} className="px-6 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {label}
      </td>
    </tr>
  );
}

function DataRow({ account, current, prior, bold, rowClass, expandable, currency }) {
  const [expanded, setExpanded] = useState(false);
  const varD = current - prior;
  const varP = prior !== 0 ? (varD / prior) * 100 : 0;

  return (
    <>
      <tr
        onClick={() => expandable && setExpanded((v) => !v)}
        className={[
          rowClass || "hover:bg-gray-50",
          expandable ? "cursor-pointer" : "",
          bold ? "font-bold" : "",
        ].filter(Boolean).join(" ")}
      >
        <td className="px-6 py-2.5 text-sm text-gray-800 flex items-center gap-1.5">
          {expandable && (
            <span className="text-gray-400">
              {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </span>
          )}
          {account}
        </td>
        <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-800">
          {fmtCurrency(current, currency)}
        </td>
        <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-500">
          {fmtCurrency(prior, currency)}
        </td>
        <td className="px-4 py-2.5 text-sm text-right">
          <VarianceCell value={varD} currency={currency} />
        </td>
        <td className="px-4 py-2.5 text-sm text-right">
          <VarianceCell value={varP} pct />
        </td>
      </tr>
    </>
  );
}

function TotalRow({ label, current, prior, currency, rowClass }) {
  const varD = current - prior;
  const varP = prior !== 0 ? (varD / prior) * 100 : 0;
  return (
    <tr className={rowClass || "bg-gray-50 font-bold border-t border-gray-200"}>
      <td className="px-6 py-2.5 text-sm font-bold text-gray-900">{label}</td>
      <td className="px-4 py-2.5 text-sm text-right tabular-nums font-bold text-gray-900">
        {fmtCurrency(current, currency)}
      </td>
      <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-500">
        {fmtCurrency(prior, currency)}
      </td>
      <td className="px-4 py-2.5 text-sm text-right">
        <VarianceCell value={varD} currency={currency} />
      </td>
      <td className="px-4 py-2.5 text-sm text-right">
        <VarianceCell value={varP} pct />
      </td>
    </tr>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 flex flex-col gap-1">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-2xl font-bold tabular-nums text-gray-900">{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Books() {
  const { orgCurrency = "GHS" } = useAuth();
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [basis, setBasis] = useState("accrual");

  const { data: periods = [], isLoading: periodsLoading } = useFinancialPeriods();

  // Auto-select the most recent period
  const selectedPeriod = useMemo(() => {
    if (selectedPeriodId) return periods.find((p) => p.id === selectedPeriodId) ?? null;
    return periods[0] ?? null;
  }, [selectedPeriodId, periods]);

  const currentRange = getPeriodRange(selectedPeriod);
  const priorRange   = getPriorRange(selectedPeriod);

  const { data: revenueNow = [],  isLoading: revLoading }  = useRevenue({
    dateFrom: currentRange?.dateFrom, dateTo: currentRange?.dateTo,
  });
  const { data: expensesNow = [], isLoading: expLoading }  = useExpenses({
    dateFrom: currentRange?.dateFrom, dateTo: currentRange?.dateTo,
  });
  const { data: revenuePrior = [] } = useRevenue({
    dateFrom: priorRange?.dateFrom, dateTo: priorRange?.dateTo,
  });
  const { data: expensesPrior = [] } = useExpenses({
    dateFrom: priorRange?.dateFrom, dateTo: priorRange?.dateTo,
  });

  const isLoading = periodsLoading || revLoading || expLoading;

  // Aggregate
  const revCurrent  = useMemo(() => groupByCategory(revenueNow),  [revenueNow]);
  const expCurrent  = useMemo(() => groupByCategory(expensesNow), [expensesNow]);
  const revPriorMap = useMemo(() => {
    const m = {};
    for (const r of revenuePrior) {
      const cat = r.transaction_categories?.name ?? "Uncategorized";
      m[cat] = (m[cat] ?? 0) + (r.amount ?? 0);
    }
    return m;
  }, [revenuePrior]);
  const expPriorMap = useMemo(() => {
    const m = {};
    for (const e of expensesPrior) {
      const cat = e.transaction_categories?.name ?? "Uncategorized";
      m[cat] = (m[cat] ?? 0) + (e.amount ?? 0);
    }
    return m;
  }, [expensesPrior]);

  const totalRevCurrent = revCurrent.reduce((s, r) => s + r.total, 0);
  const totalRevPrior   = Object.values(revPriorMap).reduce((s, v) => s + v, 0);
  const totalExpCurrent = expCurrent.reduce((s, e) => s + e.total, 0);
  const totalExpPrior   = Object.values(expPriorMap).reduce((s, v) => s + v, 0);
  const netCurrent      = totalRevCurrent - totalExpCurrent;
  const netPrior        = totalRevPrior   - totalExpPrior;
  const grossMarginPct  = totalRevCurrent > 0 ? ((totalRevCurrent - totalExpCurrent) / totalRevCurrent) * 100 : 0;
  const netMarginPct    = totalRevCurrent > 0 ? (netCurrent / totalRevCurrent) * 100 : 0;
  const expRatioPct     = totalRevCurrent > 0 ? (totalExpCurrent / totalRevCurrent) * 100 : 0;

  const periodLabel = selectedPeriod?.name ?? "Period";

  const COLS = ["Account Name", "Current Period", "Prior Period", "Variance ($)", "Variance (%)"];

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-6">
      <div className="max-w-screen-xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">P&L Statement</h1>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Period selector */}
            <div className="relative">
              {periodsLoading ? (
                <Skeleton className="h-9 w-36" />
              ) : (
                <>
                  <select
                    value={selectedPeriodId || selectedPeriod?.id || ""}
                    onChange={(e) => setSelectedPeriodId(e.target.value)}
                    className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
                  >
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </>
              )}
            </div>

            {/* Cash / Accrual toggle */}
            <div className="flex rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden text-sm">
              <button
                onClick={() => setBasis("cash")}
                className={`px-4 py-2 transition-colors ${
                  basis === "cash" ? "bg-[#22C55E] text-white font-medium" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Cash
              </button>
              <button
                onClick={() => setBasis("accrual")}
                className={`px-4 py-2 transition-colors border-l border-gray-200 ${
                  basis === "accrual" ? "bg-[#22C55E] text-white font-medium" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Accrual
              </button>
            </div>

            <button className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
              <Download size={15} />
              Export
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-500">
          {periodLabel} &nbsp;|&nbsp; {basis === "accrual" ? "Accrual" : "Cash"} Basis
        </p>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(12)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-white">
                    {COLS.map((col) => (
                      <th
                        key={col}
                        className={`px-${col === "Account Name" ? "6" : "4"} py-3 text-${
                          col === "Account Name" ? "left" : "right"
                        } text-xs font-semibold text-gray-500 uppercase tracking-wider w-${
                          col === "Account Name" ? "56" : "auto"
                        }`}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* REVENUE */}
                  <SectionHeaderRow label="Revenue" />
                  {revCurrent.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-3 text-sm text-gray-400 italic">
                        No revenue records for this period
                      </td>
                    </tr>
                  ) : (
                    revCurrent.map((row) => (
                      <DataRow
                        key={row.name}
                        account={row.name}
                        current={row.total}
                        prior={revPriorMap[row.name] ?? 0}
                        currency={orgCurrency}
                        expandable
                      />
                    ))
                  )}
                  <TotalRow
                    label="Total Revenue"
                    current={totalRevCurrent}
                    prior={totalRevPrior}
                    currency={orgCurrency}
                    rowClass="bg-white font-bold border-t border-gray-200"
                  />

                  {/* EXPENSES */}
                  <SectionHeaderRow label="Operating Expenses" />
                  {expCurrent.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-3 text-sm text-gray-400 italic">
                        No expense records for this period
                      </td>
                    </tr>
                  ) : (
                    expCurrent.map((row) => (
                      <DataRow
                        key={row.name}
                        account={row.name}
                        current={row.total}
                        prior={expPriorMap[row.name] ?? 0}
                        currency={orgCurrency}
                        expandable
                      />
                    ))
                  )}
                  <TotalRow
                    label="Total Expenses"
                    current={totalExpCurrent}
                    prior={totalExpPrior}
                    currency={orgCurrency}
                    rowClass="bg-white font-bold border-t border-gray-200"
                  />

                  {/* NET INCOME */}
                  <TotalRow
                    label="Net Income"
                    current={netCurrent}
                    prior={netPrior}
                    currency={orgCurrency}
                    rowClass={`${netCurrent >= 0 ? "bg-green-50" : "bg-red-50"} font-bold text-gray-700 border-t-2 ${netCurrent >= 0 ? "border-green-300" : "border-red-300"}`}
                  />
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Gross Margin %"
            value={isLoading ? "—" : `${grossMarginPct.toFixed(1)}%`}
            sub="(Revenue – Expenses) / Revenue"
          />
          <StatCard
            label="Expense Ratio"
            value={isLoading ? "—" : `${expRatioPct.toFixed(1)}%`}
            sub="Total Expenses / Revenue"
          />
          <StatCard
            label="Net Margin"
            value={isLoading ? "—" : `${netMarginPct.toFixed(1)}%`}
            sub="Net Income / Revenue"
          />
        </div>
      </div>
    </div>
  );
}
