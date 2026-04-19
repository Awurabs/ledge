import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, TrendingDown, Wallet, FileText,
  AlertTriangle, BarChart2, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, PieChart, Pie,
} from "recharts";
import { useAnalytics } from "../hooks/useAnalytics";
import { useAuth } from "../context/AuthContext";
import { fmtCompact } from "../lib/fmt";

// ── Constants ──────────────────────────────────────────────────────────────────

const PERIODS = [
  { value: "30d",  label: "30 days" },
  { value: "90d",  label: "90 days" },
  { value: "6m",   label: "6 months" },
  { value: "12m",  label: "12 months" },
  { value: "ytd",  label: "Year to date" },
];

const CAT_COLORS = [
  "#6366F1", "#22C55E", "#F59E0B", "#3B82F6", "#EC4899",
  "#14B8A6", "#F97316", "#8B5CF6", "#0EA5E9", "#10B981",
];

// ── Primitives ─────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

function SectionTitle({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-semibold text-gray-900">{children}</h2>
      {action}
    </div>
  );
}

// ── KPI Card ───────────────────────────────────────────────────────────────────

function KpiCard({ title, value, change, subLabel, icon: Icon, iconBg, iconColor, loading, onClick, positiveIsGood = true }) {
  const hasChange = change != null;
  const isPositiveVal = hasChange && change >= 0;
  const isGood = hasChange ? (positiveIsGood ? isPositiveVal : !isPositiveVal) : null;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-2 ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon size={15} className={iconColor} />
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-36" />
      ) : (
        <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      )}
      {!loading && (
        <div className="flex items-center gap-2 flex-wrap">
          {hasChange && (
            <span className={`flex items-center gap-0.5 text-xs font-semibold ${
              isGood ? "text-green-600" : "text-red-500"
            }`}>
              {isPositiveVal ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
              {isPositiveVal ? "+" : ""}{change.toFixed(1)}%
            </span>
          )}
          {subLabel && <span className="text-xs text-gray-400">{subLabel}</span>}
        </div>
      )}
    </div>
  );
}

// ── Chart tooltips ─────────────────────────────────────────────────────────────

function BarLineTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  const sym = currency === "USD" ? "$" : currency === "GBP" ? "£" : "GH₵";
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2.5 text-xs space-y-1.5 min-w-[140px]">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: p.fill ?? p.stroke }} />
            <span className="text-gray-600">{p.name}</span>
          </span>
          <span className="font-semibold tabular-nums text-gray-900">
            {sym}{Number(p.value).toLocaleString("en-GH", { minimumFractionDigits: 0 })}
          </span>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload, currency }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const sym = currency === "USD" ? "$" : currency === "GBP" ? "£" : "GH₵";
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-800">{p.payload.emoji} {p.name}</p>
      <p className="text-gray-500 mt-0.5">
        {sym}{Number(p.value).toLocaleString("en-GH", { minimumFractionDigits: 0 })}
        {p.payload.pct != null ? ` · ${p.payload.pct.toFixed(1)}%` : ""}
      </p>
    </div>
  );
}

// ── AR Aging stacked bars ─────────────────────────────────────────────────────

function AgingBar({ buckets, total, currency }) {
  if (total === 0) {
    return <p className="text-sm text-gray-400 text-center py-6">No outstanding invoices</p>;
  }
  return (
    <div className="space-y-3">
      {buckets.map((b) => {
        const pct = total > 0 ? (b.amount / total) * 100 : 0;
        return (
          <div key={b.label} className="flex items-center gap-3">
            <div className="w-14 shrink-0 text-right">
              <span className="text-xs font-semibold text-gray-600">{b.label}</span>
            </div>
            <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: b.color }}
              />
            </div>
            <div className="w-28 shrink-0 text-right">
              <span className="text-xs font-semibold tabular-nums text-gray-800">
                {fmtCompact(b.amount, currency)}
              </span>
              <span className="text-xs text-gray-400 ml-1">({pct.toFixed(0)}%)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Analytics() {
  const navigate   = useNavigate();
  const { orgCurrency } = useAuth();
  const currency   = orgCurrency ?? "GHS";

  const [period, setPeriod]       = useState("6m");
  const [chartMode, setChartMode] = useState("bar");

  const { data, isLoading } = useAnalytics(period);
  const sym = currency === "USD" ? "$" : currency === "GBP" ? "£" : "GH₵";

  const selectedLabel = PERIODS.find((p) => p.value === period)?.label ?? period;

  // Enrich category data with percentage field for tooltip
  const totalExpCat = (data?.expenseByCategory ?? []).reduce((s, c) => s + c.value, 0);
  const totalRevCat = (data?.revenueByCategory ?? []).reduce((s, c) => s + c.value, 0);
  const expCat = (data?.expenseByCategory ?? []).map((c) => ({
    ...c,
    pct: totalExpCat > 0 ? (c.value / totalExpCat) * 100 : 0,
  }));
  const revCat = (data?.revenueByCategory ?? []).map((c) => ({
    ...c,
    pct: totalRevCat > 0 ? (c.value / totalRevCat) * 100 : 0,
  }));

  const margin      = data?.grossMargin;
  const marginLabel = margin == null ? "N/A" : `${margin >= 0 ? "+" : ""}${margin.toFixed(1)}%`;

  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Financial performance · {selectedLabel}</p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                period === p.value
                  ? "bg-green-500 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Revenue"
          value={isLoading ? "—" : fmtCompact(data?.totalRevenue ?? 0, currency)}
          change={data?.revChange ?? null}
          subLabel="vs prior period"
          icon={TrendingUp}
          iconBg="bg-green-50"
          iconColor="text-green-500"
          loading={isLoading}
          onClick={() => navigate("/revenue")}
          positiveIsGood
        />
        <KpiCard
          title="Expenses"
          value={isLoading ? "—" : fmtCompact(data?.totalExpenses ?? 0, currency)}
          change={data?.expChange ?? null}
          subLabel="vs prior period"
          icon={TrendingDown}
          iconBg="bg-orange-50"
          iconColor="text-orange-500"
          loading={isLoading}
          onClick={() => navigate("/expenses")}
          positiveIsGood={false}
        />
        <KpiCard
          title="Net Income"
          value={isLoading ? "—" : fmtCompact(Math.abs(data?.netIncome ?? 0), currency)}
          change={data?.netChange ?? null}
          subLabel={(data?.netIncome ?? 0) >= 0 ? "Profit" : "Loss"}
          icon={(data?.netIncome ?? 0) >= 0 ? TrendingUp : TrendingDown}
          iconBg={(data?.netIncome ?? 0) >= 0 ? "bg-emerald-50" : "bg-red-50"}
          iconColor={(data?.netIncome ?? 0) >= 0 ? "text-emerald-500" : "text-red-500"}
          loading={isLoading}
          onClick={() => navigate("/books")}
          positiveIsGood
        />
        <KpiCard
          title="Cash Balance"
          value={isLoading ? "—" : fmtCompact(data?.totalCash ?? 0, currency)}
          change={null}
          subLabel={`${(data?.bankAccounts ?? []).length} account${(data?.bankAccounts ?? []).length !== 1 ? "s" : ""}`}
          icon={Wallet}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
          loading={isLoading}
          onClick={() => navigate("/transactions")}
        />
      </div>

      {/* ── Metric badges ─────────────────────────────────────────────────── */}
      {!isLoading && (
        <div className="flex flex-wrap gap-2.5">
          <div className={`flex items-center gap-2 text-xs font-medium rounded-lg px-4 py-2.5 border ${
            (margin ?? 0) >= 0
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}>
            <BarChart2 size={13} />
            Profit Margin
            <span className="font-bold">{marginLabel}</span>
          </div>

          {(data?.totalAR ?? 0) > 0 && (
            <button
              onClick={() => navigate("/invoicing")}
              className="flex items-center gap-2 text-xs font-medium rounded-lg px-4 py-2.5 border bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <FileText size={13} />
              Outstanding AR
              <span className="font-bold">{fmtCompact(data.totalAR, currency)}</span>
            </button>
          )}

          {(data?.totalAP ?? 0) > 0 && (
            <button
              onClick={() => navigate("/bills")}
              className="flex items-center gap-2 text-xs font-medium rounded-lg px-4 py-2.5 border bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors"
            >
              <AlertTriangle size={13} />
              Outstanding AP
              <span className="font-bold">{fmtCompact(data.totalAP, currency)}</span>
            </button>
          )}
        </div>
      )}

      {/* ── Trend chart ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Revenue vs Expenses — 12-Month Trend</h2>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {["bar", "line"].map((mode) => (
              <button
                key={mode}
                onClick={() => setChartMode(mode)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium capitalize transition-colors ${
                  chartMode === mode
                    ? "bg-white shadow-sm text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-60 w-full" />
        ) : !(data?.monthlyTrend ?? []).some((m) => m.revenue > 0 || m.expenses > 0) ? (
          <div className="h-60 flex flex-col items-center justify-center text-gray-400 gap-2">
            <BarChart2 size={28} className="text-gray-300" />
            <p className="text-sm">No revenue or expense data in this period</p>
            <button
              onClick={() => navigate("/revenue")}
              className="text-xs text-green-600 hover:text-green-700 font-medium"
            >
              Record your first revenue →
            </button>
          </div>
        ) : chartMode === "bar" ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.monthlyTrend} barCategoryGap="28%" barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} width={52}
                tickFormatter={(v) => `${sym}${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`}
              />
              <Tooltip content={<BarLineTooltip currency={currency} />} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Bar dataKey="revenue"  name="Revenue"  fill="#22C55E" radius={[3, 3, 0, 0]} maxBarSize={28} />
              <Bar dataKey="expenses" name="Expenses" fill="#FB923C" radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: "#9CA3AF" }} tickLine={false} axisLine={false} width={52}
                tickFormatter={(v) => `${sym}${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`}
              />
              <Tooltip content={<BarLineTooltip currency={currency} />} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Line type="monotone" dataKey="revenue"  name="Revenue"  stroke="#22C55E" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#FB923C" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="net"      name="Net"      stroke="#6366F1" strokeWidth={2} dot={false} activeDot={{ r: 4 }} strokeDasharray="5 3" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Category breakdowns ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Expense by category — donut */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <SectionTitle
            action={
              <button
                onClick={() => navigate("/expenses")}
                className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
              >
                View all <ArrowUpRight size={11} />
              </button>
            }
          >
            Expenses by Category
          </SectionTitle>

          {isLoading ? (
            <div className="flex gap-5">
              <Skeleton className="w-36 h-36 rounded-full shrink-0" />
              <div className="flex-1 space-y-2 pt-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
              </div>
            </div>
          ) : expCat.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No expense data for this period</p>
          ) : (
            <div className="flex items-center gap-4">
              {/* Donut with total in centre */}
              <div className="relative shrink-0" style={{ width: 140, height: 140 }}>
                <PieChart width={140} height={140}>
                  <Pie
                    data={expCat}
                    dataKey="value"
                    nameKey="name"
                    cx={70} cy={70}
                    innerRadius={44} outerRadius={65}
                    paddingAngle={2}
                  >
                    {expCat.map((_, i) => (
                      <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip currency={currency} />} />
                </PieChart>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs font-bold text-gray-900 tabular-nums">
                    {fmtCompact(totalExpCat * 100, currency)}
                  </span>
                  <span className="text-[10px] text-gray-400">total</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-1.5 min-w-0">
                {expCat.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: CAT_COLORS[i % CAT_COLORS.length] }}
                    />
                    <span className="text-xs text-gray-700 truncate flex-1">
                      {c.emoji} {c.name}
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-gray-900 shrink-0">
                      {c.pct.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Revenue by source — horizontal bars */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <SectionTitle
            action={
              <button
                onClick={() => navigate("/revenue")}
                className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
              >
                View all <ArrowUpRight size={11} />
              </button>
            }
          >
            Revenue by Source
          </SectionTitle>

          {isLoading ? (
            <div className="space-y-3 pt-1">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}
            </div>
          ) : revCat.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No revenue data for this period</p>
          ) : (
            <div className="space-y-3">
              {revCat.map((c, i) => (
                <div key={c.name} className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 w-32 shrink-0 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: CAT_COLORS[i % CAT_COLORS.length] }}
                    />
                    <span className="text-xs text-gray-700 truncate">{c.emoji} {c.name}</span>
                  </div>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${c.pct}%`, background: CAT_COLORS[i % CAT_COLORS.length] }}
                    />
                  </div>
                  <div className="w-28 shrink-0 text-right">
                    <span className="text-xs font-semibold tabular-nums text-gray-900">
                      {fmtCompact(c.amount * 100, currency)}
                    </span>
                    <span className="text-xs text-gray-400 ml-1">({c.pct.toFixed(0)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom row: AR Aging | Top Customers | Accounts ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* AR Aging */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <SectionTitle
            action={
              <button
                onClick={() => navigate("/invoicing")}
                className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
              >
                Invoices <ArrowUpRight size={11} />
              </button>
            }
          >
            AR Aging
          </SectionTitle>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}
            </div>
          ) : (
            <>
              <AgingBar
                buckets={data?.arAging ?? []}
                total={data?.totalAR ?? 0}
                currency={currency}
              />
              {(data?.totalAR ?? 0) > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-xs text-gray-500 font-medium">Total Outstanding</span>
                  <span className="text-sm font-bold tabular-nums text-gray-900">
                    {fmtCompact(data.totalAR, currency)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <SectionTitle
            action={
              <button
                onClick={() => navigate("/invoicing")}
                className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
              >
                All invoices <ArrowUpRight size={11} />
              </button>
            }
          >
            Top Customers
          </SectionTitle>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
            </div>
          ) : (data?.topCustomers ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No customer invoice data</p>
          ) : (
            <div className="space-y-4">
              {(data.topCustomers).map((c, i) => {
                const paidPct = c.total > 0 ? (c.paid / c.total) * 100 : 0;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-semibold text-gray-500 shrink-0">
                          {i + 1}
                        </div>
                        <span className="text-xs font-medium text-gray-800 truncate">{c.name}</span>
                      </div>
                      <span className="text-xs font-bold tabular-nums text-gray-900 shrink-0 ml-2">
                        {fmtCompact(c.total, currency)}
                      </span>
                    </div>
                    {/* Paid vs outstanding bar */}
                    <div className="ml-7 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-green-400 transition-all duration-500"
                        style={{ width: `${paidPct}%` }}
                      />
                    </div>
                    <div className="ml-7 flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">
                        {fmtCompact(c.paid, currency)} paid
                      </span>
                      {c.outstanding > 0 && (
                        <span className="text-[10px] text-amber-600 font-medium">
                          {fmtCompact(c.outstanding, currency)} due
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Account Balances */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <SectionTitle
            action={
              <button
                onClick={() => navigate("/transactions")}
                className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
              >
                Manage <ArrowUpRight size={11} />
              </button>
            }
          >
            Account Balances
          </SectionTitle>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (data?.bankAccounts ?? []).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No accounts found</p>
          ) : (
            <>
              <div className="space-y-3">
                {(data.bankAccounts).map((acc) => (
                  <div key={acc.id} className="flex items-center gap-2.5">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ background: acc.color ?? "#9CA3AF" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{acc.name}</p>
                      <p className="text-[10px] text-gray-400 capitalize">
                        {acc.type?.replace(/_/g, " ")}
                      </p>
                    </div>
                    <p className={`text-xs font-bold tabular-nums shrink-0 ${
                      acc.current_balance < 0 ? "text-red-500" : "text-gray-900"
                    }`}>
                      {fmtCompact(acc.current_balance, acc.currency ?? currency)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs text-gray-500 font-medium">Total Cash</span>
                <span className="text-sm font-bold tabular-nums text-gray-900">
                  {fmtCompact(data?.totalCash ?? 0, currency)}
                </span>
              </div>

              {/* Relative balance mini-chart */}
              {data.bankAccounts.length > 1 && (() => {
                const maxBal = Math.max(...data.bankAccounts.map((a) => Math.max(0, a.current_balance)));
                if (maxBal === 0) return null;
                return (
                  <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium mb-2">
                      Relative balance
                    </p>
                    {data.bankAccounts.map((acc) => {
                      const pct = maxBal > 0 ? Math.max(0, (acc.current_balance / maxBal) * 100) : 0;
                      return (
                        <div key={acc.id} className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500 w-20 truncate shrink-0">{acc.name}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, background: acc.color ?? "#9CA3AF" }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>

    </div>
  );
}
