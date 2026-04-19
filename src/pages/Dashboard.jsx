import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight, ArrowDownRight, Download, Plus,
  CreditCard, Upload, FileText, TrendingUp,
  CheckCircle, XCircle, Wallet, ClipboardList,
  BarChart2, Bot, AlertTriangle, RefreshCcw,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useDashboardKPIs } from "../hooks/useDashboard";
import { useApprovals, useDecideApproval } from "../hooks/useApprovals";
import { fmt, fmtCompact, fmtDate } from "../lib/fmt";
import { useAuth } from "../context/AuthContext";

// ── Primitives ─────────────────────────────────────────────────────────────────
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

function KpiCard({ title, value, sub, subPositive, icon: Icon, loading, iconBg, onClick }) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-1.5 ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg ?? "bg-gray-100"}`}>
          <Icon size={15} className="text-gray-600" />
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-36 mt-1" />
      ) : (
        <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      )}
      {sub && !loading && (
        <p className={`text-xs font-medium ${subPositive ? "text-green-600" : "text-red-500"}`}>{sub}</p>
      )}
    </div>
  );
}

// Custom tooltip for the bar chart
function ChartTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  const sym = currency === "USD" ? "$" : currency === "GBP" ? "£" : "GH₵";
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2.5 text-xs space-y-1">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.fill }} />
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

// ── Quick Action config ────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: "Add Expense",    icon: Upload,     path: "/expenses",   color: "text-orange-500", bg: "bg-orange-50" },
  { label: "New Invoice",    icon: FileText,   path: "/invoicing",  color: "text-blue-500",   bg: "bg-blue-50"   },
  { label: "Record Revenue", icon: TrendingUp, path: "/revenue",    color: "text-green-500",  bg: "bg-green-50"  },
  { label: "New Card",       icon: CreditCard, path: "/cards",      color: "text-purple-500", bg: "bg-purple-50" },
  { label: "Analytics",      icon: BarChart2,  path: "/analytics",  color: "text-teal-500",   bg: "bg-teal-50"   },
  { label: "Ledge AI",       icon: Bot,        path: "/copilot",    color: "text-indigo-500", bg: "bg-indigo-50" },
];

// ── Main component ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate  = useNavigate();
  const { displayName, orgCurrency } = useAuth();
  const { data: kpis, isLoading } = useDashboardKPIs();
  const { data: approvals = [] }  = useApprovals({ decision: "pending" });
  const decideMut = useDecideApproval();

  const pending  = approvals.slice(0, 5);
  const currency = orgCurrency ?? "GHS";

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const periodLabel = now.toLocaleDateString("en-GH", { month: "long", year: "numeric" });

  const hasChartData = (kpis?.monthlyTrend ?? []).some((m) => m.revenue > 0 || m.expenses > 0);
  const sym = currency === "USD" ? "$" : currency === "GBP" ? "£" : "GH₵";

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting}, {displayName.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{periodLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Download size={14} /> Export
          </button>
          <button
            onClick={() => navigate("/revenue")}
            className="flex items-center gap-2 rounded-lg bg-green-500 px-3 py-2 text-sm font-medium text-white hover:bg-green-600 transition-colors"
          >
            <Plus size={14} /> Record Revenue
          </button>
        </div>
      </div>

      {/* ── KPI cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Cash"
          value={isLoading ? "—" : fmtCompact(kpis?.totalCash ?? 0, currency)}
          sub={`${kpis?.bankAccounts?.length ?? 0} account${kpis?.bankAccounts?.length !== 1 ? "s" : ""}`}
          subPositive
          icon={Wallet}
          iconBg="bg-green-50"
          loading={isLoading}
          onClick={() => navigate("/transactions")}
        />
        <KpiCard
          title="Revenue MTD"
          value={isLoading ? "—" : fmtCompact(kpis?.revenueMTD ?? 0, currency)}
          sub={kpis ? `Expenses: ${fmtCompact(kpis.expensesMTD, currency)}` : null}
          subPositive
          icon={TrendingUp}
          iconBg="bg-blue-50"
          loading={isLoading}
          onClick={() => navigate("/revenue")}
        />
        <KpiCard
          title="Net Income MTD"
          value={isLoading ? "—" : fmtCompact(Math.abs(kpis?.netMTD ?? 0), currency)}
          sub={
            kpis
              ? (kpis.netMTD ?? 0) >= 0
                ? "Profitable this month"
                : "Loss this month"
              : null
          }
          subPositive={(kpis?.netMTD ?? 0) >= 0}
          icon={BarChart2}
          iconBg="bg-emerald-50"
          loading={isLoading}
          onClick={() => navigate("/books")}
        />
        <KpiCard
          title="Pending Approvals"
          value={isLoading ? "—" : String(kpis?.pendingApprovals ?? 0)}
          sub={
            kpis
              ? kpis.pendingApprovals > 0
                ? "Awaiting your action"
                : "All caught up!"
              : null
          }
          subPositive={!(kpis?.pendingApprovals > 0)}
          icon={ClipboardList}
          iconBg="bg-amber-50"
          loading={isLoading}
          onClick={() => navigate("/approvals")}
        />
      </div>

      {/* ── Alerts strip (only when there's something to flag) ─────────────── */}
      {!isLoading && (
        (kpis?.overdueInvoices?.length > 0 || kpis?.overdueAP > 0 || kpis?.pendingReimbs > 0)
      ) && (
        <div className="flex flex-wrap gap-2">
          {(kpis?.overdueInvoices?.length ?? 0) > 0 && (
            <button
              onClick={() => navigate("/invoicing")}
              className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-lg px-3 py-1.5 hover:bg-red-100 transition-colors"
            >
              <AlertTriangle size={12} />
              {kpis.overdueInvoices.length} overdue invoice{kpis.overdueInvoices.length > 1 ? "s" : ""}
            </button>
          )}
          {(kpis?.overdueAP ?? 0) > 0 && (
            <button
              onClick={() => navigate("/bills")}
              className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-medium rounded-lg px-3 py-1.5 hover:bg-orange-100 transition-colors"
            >
              <AlertTriangle size={12} />
              Overdue AP: {fmtCompact(kpis.overdueAP, currency)}
            </button>
          )}
          {(kpis?.pendingReimbs ?? 0) > 0 && (
            <button
              onClick={() => navigate("/reimbursements")}
              className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium rounded-lg px-3 py-1.5 hover:bg-amber-100 transition-colors"
            >
              <RefreshCcw size={12} />
              {kpis.pendingReimbs} reimbursement{kpis.pendingReimbs > 1 ? "s" : ""} pending
            </button>
          )}
        </div>
      )}

      {/* ── Two-column layout ───────────────────────────────────────────────── */}
      <div className="flex gap-5 items-start">

        {/* Left 2/3 ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5" style={{ flex: "2 1 0%" }}>

          {/* Revenue vs Expenses — 6-month bar chart */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Revenue vs Expenses — Last 6 Months</h2>
              <button
                onClick={() => navigate("/books")}
                className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
              >
                P&L <ArrowUpRight size={12} />
              </button>
            </div>
            {isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : !hasChartData ? (
              <div className="h-52 flex flex-col items-center justify-center text-gray-400 gap-2">
                <BarChart2 size={28} className="text-gray-300" />
                <p className="text-sm">No revenue or expense data yet</p>
                <button
                  onClick={() => navigate("/revenue")}
                  className="text-xs text-green-600 hover:text-green-700 font-medium"
                >
                  Record your first revenue →
                </button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart
                  data={kpis.monthlyTrend}
                  barCategoryGap="30%"
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9CA3AF" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${sym}${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`}
                    width={52}
                  />
                  <Tooltip content={<ChartTooltip currency={currency} />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  />
                  <Bar dataKey="revenue"  name="Revenue"  fill="#22C55E" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="expenses" name="Expenses" fill="#FB923C" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Recent Transactions</h2>
              <button
                onClick={() => navigate("/transactions")}
                className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
              >
                View all <ArrowUpRight size={12} />
              </button>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (kpis?.recentTransactions ?? []).length === 0 ? (
              <div className="flex flex-col items-center py-8 text-gray-400 gap-2">
                <Wallet size={24} className="text-gray-300" />
                <p className="text-sm">No transactions yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {(kpis.recentTransactions).map((t) => {
                  const isCredit = t.direction === "credit";
                  const cat = t.transaction_categories;
                  return (
                    <div key={t.id} className="flex items-center gap-3 py-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                        isCredit ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"
                      }`}>
                        {cat?.emoji ?? (isCredit
                          ? <ArrowDownRight size={14} />
                          : <ArrowUpRight   size={14} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{t.description}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {t.bank_accounts?.name ?? "—"} · {fmtDate(t.txn_date)}
                          {cat?.name ? ` · ${cat.name}` : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-semibold tabular-nums ${isCredit ? "text-green-600" : "text-gray-900"}`}>
                          {isCredit ? "+" : "−"}{fmt(t.amount, currency)}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">{t.status}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 1/3 ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5" style={{ flex: "1 1 0%" }}>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h2>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_ACTIONS.map(({ label, icon: Icon, path, color, bg }) => (
                <button
                  key={label}
                  onClick={() => navigate(path)}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-100 p-3 text-xs font-medium text-gray-700 hover:border-gray-200 hover:shadow-sm transition-all group"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg} group-hover:scale-110 transition-transform`}>
                    <Icon size={15} className={color} />
                  </div>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Financial snapshot */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Money In / Out</h2>
            {isLoading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
            ) : (
              <div className="space-y-2">
                {[
                  { label: "Outstanding AR",  value: kpis?.outstandingAR ?? 0,  color: "text-blue-600",  onClick: () => navigate("/invoicing") },
                  { label: "Overdue AP",       value: kpis?.overdueAP     ?? 0,  color: "text-red-500",   onClick: () => navigate("/bills") },
                ].map(({ label, value, color, onClick }) => (
                  <button
                    key={label}
                    onClick={onClick}
                    className="w-full flex items-center justify-between rounded-lg bg-gray-50 hover:bg-gray-100 px-3 py-2.5 transition-colors"
                  >
                    <span className="text-xs font-medium text-gray-600">{label}</span>
                    <span className={`text-sm font-bold tabular-nums ${value > 0 ? color : "text-gray-400"}`}>
                      {fmtCompact(value, currency)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Approval Queue */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Approval Queue</h2>
              {pending.length > 0 && (
                <span className="rounded-full bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5">
                  {pending.length}
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : pending.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-gray-400 gap-2">
                <CheckCircle size={24} className="text-green-400" />
                <p className="text-sm">All caught up!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {pending.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate capitalize">
                        {a.request_type?.replace(/_/g, " ") ?? "Request"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {a.description ?? "—"}
                        {a.amount ? ` · ${fmt(a.amount, a.currency ?? currency)}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => decideMut.mutate({ id: a.id, decision: "approved" })}
                        disabled={decideMut.isPending}
                        className="rounded px-2 py-1 text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 flex items-center gap-0.5 disabled:opacity-50"
                      >
                        <CheckCircle size={10} /> OK
                      </button>
                      <button
                        onClick={() => decideMut.mutate({ id: a.id, decision: "rejected" })}
                        disabled={decideMut.isPending}
                        className="rounded px-2 py-1 text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200 flex items-center gap-0.5 disabled:opacity-50"
                      >
                        <XCircle size={10} /> No
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => navigate("/approvals")}
                  className="text-xs text-green-600 hover:text-green-700 font-medium text-center mt-1"
                >
                  View all approvals →
                </button>
              </div>
            )}
          </div>

          {/* Bank Accounts */}
          {!isLoading && (kpis?.bankAccounts ?? []).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900">Accounts</h2>
                <button
                  onClick={() => navigate("/transactions")}
                  className="text-xs text-green-600 hover:text-green-700 font-medium"
                >
                  Manage →
                </button>
              </div>
              <div className="space-y-2.5">
                {kpis.bankAccounts.map((acc) => (
                  <div key={acc.id} className="flex items-center gap-2.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: acc.color ?? "#9CA3AF" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{acc.name}</p>
                      <p className="text-xs text-gray-400 capitalize">
                        {acc.type?.replace("_", " ")}
                      </p>
                    </div>
                    <p className="text-xs font-semibold tabular-nums text-gray-900">
                      {fmtCompact(acc.current_balance, acc.currency ?? currency)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
