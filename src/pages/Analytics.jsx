import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Download,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShieldCheck,
  CreditCard,
  Lightbulb,
  Copy,
  Plane,
  Package,
  Users,
} from "lucide-react";
import { useState } from "react";

const PERIODS = ["Mar 2026", "Q1 2026", "YTD 2026", "Last 12 months"];

const kpiTiles = [
  {
    label: "Total Spend",
    value: "$284,510",
    change: "+12.4%",
    changeLabel: "vs last month",
    up: true,
    icon: CreditCard,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-50",
  },
  {
    label: "Transactions",
    value: "847",
    change: "+8.2%",
    changeLabel: "vs last month",
    up: true,
    icon: TrendingUp,
    iconColor: "text-green-500",
    iconBg: "bg-green-50",
  },
  {
    label: "Avg Transaction",
    value: "$336",
    change: "-3.1%",
    changeLabel: "vs last month",
    up: false,
    icon: TrendingDown,
    iconColor: "text-orange-500",
    iconBg: "bg-orange-50",
  },
  {
    label: "Flagged Items",
    value: "8",
    change: "-2",
    changeLabel: "vs last period",
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

const pieData = [
  { name: "SaaS", value: 89400, color: "#3B82F6" },
  { name: "Travel", value: 67200, color: "#A855F7" },
  { name: "Facilities", value: 42000, color: "#9CA3AF" },
  { name: "Salaries", value: 180000, color: "#22C55E" },
  { name: "Marketing", value: 42000, color: "#F97316" },
  { name: "Other", value: 28900, color: "#64748B" },
];

const MONTHS = [
  "Apr 25", "May 25", "Jun 25", "Jul 25", "Aug 25", "Sep 25",
  "Oct 25", "Nov 25", "Dec 25", "Jan 26", "Feb 26", "Mar 26",
];

const spendData = [
  220000, 235000, 248000, 261000, 244000, 270000,
  285000, 294000, 278000, 310000, 298000, 284510,
].map((spend, i) => ({
  month: MONTHS[i],
  spend,
  budget: 250000,
}));

const vendorData = [
  { vendor: "AWS", amount: 42100 },
  { vendor: "Salesforce", amount: 38900 },
  { vendor: "WeWork", amount: 33600 },
  { vendor: "Delta Airlines", amount: 28400 },
  { vendor: "Google Workspace", amount: 22800 },
  { vendor: "Marriott Hotels", amount: 18200 },
  { vendor: "Stripe", amount: 15600 },
  { vendor: "LinkedIn", amount: 14400 },
  { vendor: "Zoom", amount: 12800 },
  { vendor: "Uber", amount: 8900 },
].reverse();

const savings = [
  {
    icon: Copy,
    title: "Duplicate SaaS Subscriptions",
    desc: "Detected 3 overlapping project management tools",
    saving: "$3,200/mo",
  },
  {
    icon: Plane,
    title: "Out-of-Policy Travel",
    desc: "6 bookings above $1,500 threshold last month",
    saving: "$4,800/mo",
  },
  {
    icon: Package,
    title: "Vendor Consolidation",
    desc: "4 vendors in same category, consolidate to 2",
    saving: "$1,400/mo",
  },
  {
    icon: Users,
    title: "Unused Licenses",
    desc: "8 Salesforce seats not logged in 90+ days",
    saving: "$2,240/mo",
  },
];

const teamRows = [
  { team: "Engineering", mtd: "$89,400", budget: "$95,000", lastMonth: "+6.2%", topVendor: "AWS" },
  { team: "Sales", mtd: "$67,200", budget: "$70,000", lastMonth: "+3.8%", topVendor: "Salesforce" },
  { team: "Marketing", mtd: "$42,000", budget: "$45,000", lastMonth: "+9.1%", topVendor: "LinkedIn" },
  { team: "Operations", mtd: "$38,900", budget: "$40,000", lastMonth: "-1.2%", topVendor: "WeWork" },
  { team: "Finance", mtd: "$28,400", budget: "$30,000", lastMonth: "+4.5%", topVendor: "Stripe" },
  { team: "HR", mtd: "$18,610", budget: "$20,000", lastMonth: "+2.1%", topVendor: "LinkedIn" },
];

const formatCurrency = (v) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v);

const _unused = {
};

export default function Analytics() {
  const [period, setPeriod] = useState("Mar 2026");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-[#111827]">Analytics</h1>
        <div className="flex items-center gap-3">
          {/* Period selector */}
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
          {/* Export button */}
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
                    isPositive
                      ? "bg-green-50 text-green-600"
                      : "bg-red-50 text-red-500"
                  }`}
                >
                  {tile.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-[#111827] tabular-nums mb-1">{tile.value}</p>
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
            <div className="flex items-center gap-6">
              <div className="relative" style={{ width: 260, height: 240 }}>
                <ResponsiveContainer width={260} height={240}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={75}
                      outerRadius={110}
                      paddingAngle={2}
                      dataKey="value"
                      labelLine={false}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-bold tabular-nums text-gray-900">$449,500</span>
                  <span className="text-xs text-gray-500">total</span>
                </div>
              </div>
              {/* Legend */}
              <div className="flex flex-col gap-2.5 flex-1">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-sm text-[#111827]">{d.name}</span>
                    </div>
                    <span className="text-sm font-medium text-[#111827] tabular-nums">
                      {formatCurrency(d.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 12-Month Rolling Spend */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#111827] mb-4">12-Month Rolling Spend</h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={spendData} margin={{ top: 4, right: 8, bottom: 0, left: 10 }}>
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
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip formatter={(v, name) => [formatCurrency(v), name === "spend" ? "Total Spend" : "Budget"]} />
                <Legend
                  formatter={(v) => (v === "spend" ? "Total Spend" : "Budget")}
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="spend"
                  name="spend"
                  stroke="#22C55E"
                  strokeWidth={2}
                  fill="url(#colorSpend)"
                />
                <Area
                  type="monotone"
                  dataKey="budget"
                  name="budget"
                  stroke="#9CA3AF"
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RIGHT: 1/3 */}
        <div className="flex flex-col gap-6">
          {/* Top 10 Vendors */}
          <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
            <h2 className="text-base font-semibold text-[#111827] mb-4">Top 10 Vendors</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={vendorData}
                layout="vertical"
                margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="vendor"
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <Tooltip formatter={(v) => [formatCurrency(v), "Amount"]} />
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
              {savings.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="p-1.5 bg-gray-50 rounded-lg flex-shrink-0 mt-0.5">
                      <Icon size={14} className="text-[#6B7280]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#111827] leading-tight">{item.title}</p>
                      <p className="text-xs text-[#6B7280] mt-0.5 leading-snug">{item.desc}</p>
                      <p className="text-xs font-semibold text-[#22C55E] mt-1 tabular-nums">Save {item.saving}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Spend Trend by Team */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-6">
        <h2 className="text-base font-semibold text-[#111827] mb-4">Spend Trend by Team</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5E7EB]">
              <th className="text-left font-medium text-[#6B7280] pb-3 pr-4">Team</th>
              <th className="text-right font-medium text-[#6B7280] pb-3 px-4">MTD Spend</th>
              <th className="text-right font-medium text-[#6B7280] pb-3 px-4">vs Budget</th>
              <th className="text-right font-medium text-[#6B7280] pb-3 px-4">vs Last Month</th>
              <th className="text-right font-medium text-[#6B7280] pb-3 pl-4">Top Vendor</th>
            </tr>
          </thead>
          <tbody>
            {teamRows.map((row, i) => {
              const isUp = row.lastMonth.startsWith("+");
              return (
                <tr
                  key={row.team}
                  className={`border-b border-[#E5E7EB] last:border-0 ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}
                >
                  <td className="py-3 pr-4 font-medium text-[#111827]">{row.team}</td>
                  <td className="py-3 px-4 text-right tabular-nums text-[#111827] font-medium">{row.mtd}</td>
                  <td className="py-3 px-4 text-right tabular-nums text-[#6B7280]">{row.budget}</td>
                  <td className="py-3 px-4 text-right tabular-nums">
                    <span
                      className={`inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                        isUp ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
                      }`}
                    >
                      {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {row.lastMonth}
                    </span>
                  </td>
                  <td className="py-3 pl-4 text-right text-[#6B7280]">{row.topVendor}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
