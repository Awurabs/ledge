import { useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, AreaChart, Area,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Download, ChevronDown, TrendingUp, TrendingDown,
  AlertTriangle, ShieldCheck, CreditCard,
  Lightbulb, Copy, Plane, Package, Users,
} from "lucide-react";
import { useDashboardKPIs } from "../hooks/useDashboard";
import { useExpenses } from "../hooks/useExpenses";
import { useAuth } from "../context/AuthContext";

// ── Constants ─────────────────────────────────────────────────────────────────
const PERIODS = ["This Month", "Last Month", "This Quarter", "Last 12 months"];

const PIE_COLORS = [
  "#3B82F6", "#A855F7", "#9CA3AF", "#22C55E",
  "#F97316", "#64748B", "#EF4444", "#F59E0B",
];

const MONTHS = [
  "Apr 25", "May 25", "Jun 25", "Jul 25", "Aug 25", "Sep 25",
  "Oct 25", "Nov 25", "Dec 25", "Jan 26", "Feb 26", "Mar 26",
];

// Static spend history (would need a monthly aggregation RPC for real data)
const STATIC_SPEND_HISTORY = [
  220000, 235000, 248000, 261000, 244000, 270000,
  285000, 294000, 278000, 310000, 298000, 284510,
].map((spend, i) => ({ month: MONTHS[i], spend, budget: 250000 }));

// Static vendor list (would need merchant aggregation for real data)
const STATIC_VENDORS = [
  { vendor: "AWS", amount: 42100 }, { vendor: "Salesforce", amount: 38900 },
  { vendor: "WeWork", amount: 33600 }, { vendor: "Delta Airlines", amount: 28400 },
  { vendor: "Google Workspace", amount: 22800 }, { vendor: "Marriott Hotels", amount: 18200 },
  { vendor: "Stripe", amount: 15600 }, { vendor: "LinkedIn", amount: 14400 },
  { vendor: "Zoom", amount: 12800 }, { vendor: "Uber", amount: 8900 },
].reverse();

const SAVINGS = [
  { icon: Copy,    title: "Duplicate SaaS Subscriptions",  desc: "Detected 3 overlapping project management tools", saving: "3,200/mo" },
  { icon: Plane,   title: "Out-of-Policy Travel",          desc: "6 bookings above spend threshold last month",     saving: "4,800/mo" },
  { icon: Package, title: "Vendor Consolidation",          desc: "4 vendors in same category, consolidate to 2",    saving: "1,400/mo" },
  { icon: Users,   title: "Unused Licenses",               desc: "8 Salesforce seats not logged in 90+ days",       saving: "2,240/mo" },
];

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

function fmtCurrency(amountMinor, currency = "GHS") {
  const v = (amountMinor ?? 0) / 100;
  return new Intl.NumberFormat("en-GH", {
    style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v);
}

function fmtCurrencyDirect(v, currency = "GHS") {
  return new Intl.NumberFormat("en-GH", {
    style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v);
}

export default function Analytics() {
  const { orgCurrency = "GHS" } = useAuth();
  const [period, setPeriod] = useState("This Month");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Real data
  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs();

  // MTD expenses for category breakdown
  const now = new Date();
  const mtdStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const { data: mtdExpenses = [], isLoading: expLoading } = useExpenses({
    dateFrom: mtdStart,
  });

  // Build category breakdown from real expenses
  const pieData = useMemo(() => {
    const map = {};
    for (const e of mtdExpenses) {
      const cat = e.transaction_categories?.name ?? "Uncategorized";
      map[cat] = (map[cat] ?? 0) + (e.amount ?? 0);
    }
    return Object.entries(map)
      .map(([name, value], idx) => ({
        name,
        value,
        color: PIE_COLORS[idx % PIE_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [mtdExpenses]);

  const pieTotalMinor = pieData.reduce((s, d) => s + d.value, 0);

  // Derive KPI values
  const totalSpend     = kpis?.expensesMTD ?? 0;
  const txnCount       = kpis?.recentTransactions?.length ?? 0;
  const avgTxnMinor    = txnCount > 0 ? Math.round(totalSpend / txnCount) : 0;
  const pendingApprv   = kpis?.pendingApprovals ?? 0;

  const isLoading = kpisLoading || expLoading;

  const kpiTiles = [
    {
      label: "Total Spend",
      value: isLoading ? "—" : fmtCurrency(totalSpend, orgCurrency),
      change: "+12.4%",
      changeLabel: "vs last month",
      up: true,
      icon: CreditCard,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-50",
    },
    {
      label: "Transactions",
      value: isLoading ? "—" : txnCount.toLocaleString(),
      change: "+8.2%",
      changeLabel: "vs last month",
      up: true,
      icon: TrendingUp,
      iconColor: "text-green-500",
      iconBg: "bg-green-50",
    },
    {
      label: "Avg Transaction",
      value: isLoading ? "—" : fmtCurrency(avgTxnMinor, orgCurrency),
      change: "-3.1%",
      changeLabel: "vs last month",
      up: false,
      icon: TrendingDown,
      iconColor: "text-orange-500",
      iconBg: "bg-orange-50",
    },
    {
      label: "Pending Approvals",
      value: isLoading ? "—" : pendingApprv.toString(),
      change: `${pendingApprv}`,
      changeLabel: "awaiting review",
      up: false,
      isGoodWhenDown: true,
      icon: AlertTriangle,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-50",
    },
    {
      label: "Policy Compliance",
      value: "94.2%",
      change: "+1.8%",
      changeLabel: "vs last month",
      up: true,
      icon: ShieldCheck,
      iconColor: "text-green-500",
      iconBg: "bg-green-50",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-[#111827]">Analytics</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-lg px-4 py-2 text-sm text-[#111827] shadow-sm hover:bg-gray-50 transition-colors"
            >
              {period}
              <ChevronDown size={16} className="text-[#6B7280]" />
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-[#E5E7EB] rounded-lg shadow-md z-10">
                {PERIODS.map((p) => (
                  <button
                    key={p}
                    onClick={() => { setPeriod(p); setDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                      period === p ? "text-[#22C55E] font-medium" : "text-[#111827]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="flex items-center gap-2 bg-[#22C55E] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-600 transition-colors shadow-sm">
            <Download size={16} />
            Export Report
          </button>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {kpiTiles.map((tile) => {
          const Icon = tile.icon;
          const isPositive = tile.isGoodWhenDown ? !tile.up : tile.up;
          return (
            <div key={tile.label} className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2 rounded-lg ${tile.iconBg}`}>
                  <Icon size={18} className={tile.iconColor} />
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    isPositive ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
                  }`}
                >
                  {tile.change}
                </span>
              </div>
              {isLoading ? (
                <Skeleton className="h-8 w-24 mb-1" />
              ) : (
                <p className="text-2xl font-bold text-[#111827] tabular-nums mb-1">{tile.value}</p>
              )}
              <p className="text-xs text-[#6B7280]">{tile.label}</p>
              <p className="text-xs text-[#6B7280] mt-0.5">{tile.changeLabel}</p>
            </div>
          );
        })}
      </div>

      {/* Charts section: 2/3 + 1/3 */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* LEFT: 2/3 */}
        <div className="col-span-2 flex flex-col gap-6">
          {/* Spend by Category */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#111827] mb-4">Spend by Category</h2>
            {expLoading ? (
              <Skeleton className="h-48 w-full rounded-lg" />
            ) : pieData.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No expense data for this period</p>
            ) : (
              <div className="flex items-center gap-6">
                <div className="relative" style={{ width: 260, height: 240 }}>
                  <ResponsiveContainer width={260} height={240}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%" cy="50%"
                        innerRadius={75} outerRadius={110}
                        paddingAngle={2} dataKey="value"
                        labelLine={false}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v) => fmtCurrency(v, orgCurrency)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-bold tabular-nums text-gray-900">
                      {fmtCurrency(pieTotalMinor, orgCurrency)}
                    </span>
                    <span className="text-xs text-gray-500">total</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2.5 flex-1">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: d.color }}
                        />
                        <span className="text-sm text-[#111827]">{d.name}</span>
                      </div>
                      <span className="text-sm font-medium text-[#111827] tabular-nums">
                        {fmtCurrency(d.value, orgCurrency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 12-Month Rolling Spend */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#111827] mb-4">12-Month Rolling Spend</h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={STATIC_SPEND_HISTORY} margin={{ top: 4, right: 8, bottom: 0, left: 10 }}>
                <defs>
                  <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6B7280" }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6B7280" }}
                  tickLine={false} axisLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip formatter={(v, name) => [fmtCurrencyDirect(v / 100, orgCurrency), name === "spend" ? "Total Spend" : "Budget"]} />
                <Legend formatter={(v) => v === "spend" ? "Total Spend" : "Budget"} wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="spend" name="spend" stroke="#22C55E" strokeWidth={2} fill="url(#colorSpend)" />
                <Area type="monotone" dataKey="budget" name="budget" stroke="#9CA3AF" strokeWidth={1.5} strokeDasharray="5 4" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RIGHT: 1/3 */}
        <div className="flex flex-col gap-6">
          {/* Top 10 Vendors */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#111827] mb-4">Top Vendors</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={STATIC_VENDORS} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#6B7280" }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="vendor" tick={{ fontSize: 10, fill: "#6B7280" }} tickLine={false} axisLine={false} width={100} />
                <Tooltip formatter={(v) => [fmtCurrencyDirect(v / 100, orgCurrency), "Amount"]} />
                <Bar dataKey="amount" fill="#22C55E" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Savings Recommendations */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-1.5 bg-amber-50 rounded-lg">
                <Lightbulb size={16} className="text-amber-500" />
              </div>
              <h2 className="text-base font-semibold text-[#111827]">Savings Recommendations</h2>
            </div>
            <div className="flex flex-col gap-4">
              {SAVINGS.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="p-1.5 bg-gray-50 rounded-lg flex-shrink-0 mt-0.5">
                      <Icon size={14} className="text-[#6B7280]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#111827] leading-tight">{item.title}</p>
                      <p className="text-xs text-[#6B7280] mt-0.5 leading-snug">{item.desc}</p>
                      <p className="text-xs font-semibold text-[#22C55E] mt-1 tabular-nums">
                        Save {orgCurrency === "GHS" ? "₵" : "$"}{item.saving}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Spend Trend by Team — would need dept aggregation RPC; shown as indicative */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#111827]">Spend by Department</h2>
          <span className="text-xs text-gray-400">Department aggregation coming soon</span>
        </div>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : kpis?.expensesMTD != null ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500">
              Total MTD spend: <span className="font-semibold text-gray-900">{fmtCurrency(kpis.expensesMTD, orgCurrency)}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Connect your departments and card data for per-team breakdowns.
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-6">No spend data available</p>
        )}
      </div>
    </div>
  );
}
