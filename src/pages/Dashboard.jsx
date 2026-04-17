import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight, ArrowDownRight, Download, Plus,
  CreditCard, ClipboardList, Upload, FileText,
  CheckCircle, XCircle, TrendingUp, Wallet,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { useDashboardKPIs } from "../hooks/useDashboard";
import { useApprovals, useDecideApproval } from "../hooks/useApprovals";
import { fmt, fmtCompact, fmtDate } from "../lib/fmt";
import { useAuth } from "../context/AuthContext";

// ── Skeleton loader ────────────────────────────────────────────────────────────
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

function KpiCard({ title, value, sub, subPositive, icon: Icon, loading, iconBg }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-1.5">
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

export default function Dashboard() {
  const navigate  = useNavigate();
  const { displayName, orgCurrency } = useAuth();
  const { data: kpis, isLoading } = useDashboardKPIs();
  const { data: approvals = [] }  = useApprovals({ decision: "pending" });
  const decideMut = useDecideApproval();

  const pending   = approvals.slice(0, 5);
  const currency  = orgCurrency ?? "GHS";

  // Build a simple 8-point spend trend from recent transactions (debit only)
  const spendTrend = (() => {
    if (!kpis?.recentTransactions?.length) return [];
    const byDay = {};
    kpis.recentTransactions
      .filter((t) => t.direction === "debit")
      .forEach((t) => {
        const day = t.txn_date?.slice(0, 10) ?? "";
        byDay[day] = (byDay[day] ?? 0) + t.amount / 100;
      });
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date: date.slice(5), amount: +amount.toFixed(0) }));
  })();

  const now = new Date();
  const periodLabel = now.toLocaleDateString("en-GH", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Good {now.getHours() < 12 ? "morning" : now.getHours() < 17 ? "afternoon" : "evening"},{" "}
            {displayName.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{periodLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Download size={14} /> Export
          </button>
          <button
            onClick={() => navigate("/transactions")}
            className="flex items-center gap-2 rounded-lg bg-green-500 px-3 py-2 text-sm font-medium text-white hover:bg-green-600 transition-colors"
          >
            <Plus size={14} /> New Transaction
          </button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Cash"
          value={isLoading ? "—" : fmtCompact(kpis?.totalCash ?? 0, currency)}
          sub={`Across ${kpis?.bankAccounts?.length ?? 0} accounts`}
          subPositive
          icon={Wallet}
          iconBg="bg-green-50"
          loading={isLoading}
        />
        <KpiCard
          title="Revenue MTD"
          value={isLoading ? "—" : fmtCompact(kpis?.revenueMTD ?? 0, currency)}
          sub={kpis ? `Net: ${fmtCompact(kpis.netMTD, currency)}` : null}
          subPositive={(kpis?.netMTD ?? 0) >= 0}
          icon={TrendingUp}
          iconBg="bg-blue-50"
          loading={isLoading}
        />
        <KpiCard
          title="Pending Approvals"
          value={isLoading ? "—" : String(kpis?.pendingApprovals ?? 0)}
          sub={kpis?.pendingApprovals ? "Awaiting your action" : "All caught up!"}
          subPositive={!kpis?.pendingApprovals}
          icon={ClipboardList}
          iconBg="bg-amber-50"
          loading={isLoading}
        />
        <KpiCard
          title="Outstanding AR"
          value={isLoading ? "—" : fmtCompact(kpis?.outstandingAR ?? 0, currency)}
          sub={kpis?.overdueAP ? `Overdue AP: ${fmtCompact(kpis.overdueAP, currency)}` : "No overdue AP"}
          subPositive={!kpis?.overdueAP}
          icon={FileText}
          iconBg="bg-purple-50"
          loading={isLoading}
        />
      </div>

      {/* ── Two-column layout ── */}
      <div className="flex gap-5 items-start">
        {/* Left 2/3 */}
        <div className="flex flex-col gap-5" style={{ flex: "2 1 0%" }}>
          {/* Spend trend */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Spend Trend (last 10 transactions)</h2>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : spendTrend.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                No spend data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={spendTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => `${currency === "GHS" ? "₵" : "$"}${v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}`}
                    width={50}
                  />
                  <Tooltip
                    formatter={(v) => [fmt(v * 100, currency), "Spend"]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #E5E7EB", fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="amount" stroke="#22C55E" strokeWidth={2.5} dot={false}
                    activeDot={{ r: 4, fill: "#22C55E" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">Recent Transactions</h2>
              <button onClick={() => navigate("/transactions")}
                className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1">
                View all <ArrowUpRight size={12} />
              </button>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (kpis?.recentTransactions ?? []).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No transactions yet</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {(kpis?.recentTransactions ?? []).map((t) => (
                  <div key={t.id} className="flex items-center gap-3 py-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs ${
                      t.direction === "credit" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"
                    }`}>
                      {t.direction === "credit" ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{t.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {t.bank_accounts?.name} · {fmtDate(t.txn_date)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-semibold tabular-nums ${t.direction === "credit" ? "text-green-600" : "text-gray-900"}`}>
                        {t.direction === "credit" ? "+" : "-"}{fmt(t.amount, currency)}
                      </p>
                      <p className="text-xs text-gray-400 capitalize">{t.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 1/3 */}
        <div className="flex flex-col gap-5" style={{ flex: "1 1 0%" }}>
          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Add Card",          icon: CreditCard,    path: "/cards" },
                { label: "New Expense",       icon: Upload,        path: "/expenses" },
                { label: "Create Invoice",    icon: FileText,      path: "/invoicing" },
                { label: "Record Revenue",    icon: TrendingUp,    path: "/revenue" },
              ].map(({ label, icon: Icon, path }) => (
                <button key={label} onClick={() => navigate(path)}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-200 p-3 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors">
                  <Icon size={16} className="text-gray-500" />
                  {label}
                </button>
              ))}
            </div>
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
                      <p className="text-xs font-semibold text-gray-900 truncate capitalize">{a.request_type}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {a.description ?? "—"} ·{" "}
                        <span className="tabular-nums font-semibold text-gray-700">
                          {a.amount ? fmt(a.amount, a.currency ?? currency) : ""}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => decideMut.mutate({ id: a.id, decision: "approved" })}
                        className="rounded px-2 py-1 text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 flex items-center gap-0.5"
                      >
                        <CheckCircle size={10} /> OK
                      </button>
                      <button
                        onClick={() => decideMut.mutate({ id: a.id, decision: "rejected" })}
                        className="rounded px-2 py-1 text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200 flex items-center gap-0.5"
                      >
                        <XCircle size={10} /> No
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={() => navigate("/approvals")}
                  className="text-xs text-green-600 hover:text-green-700 font-medium text-center mt-1">
                  View all approvals →
                </button>
              </div>
            )}
          </div>

          {/* Bank accounts */}
          {!isLoading && (kpis?.bankAccounts ?? []).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Accounts</h2>
              <div className="space-y-2.5">
                {kpis.bankAccounts.map((acc) => (
                  <div key={acc.id} className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: acc.color ?? "#9CA3AF" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">{acc.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{acc.type?.replace("_", " ")}</p>
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
