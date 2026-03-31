import { useState } from "react";
import { Download, ChevronDown, ChevronRight } from "lucide-react";

const PERIODS = ["Q1 2026", "Q4 2025", "Q3 2025", "YTD 2026"];

const DRILL_DOWN_TRANSACTIONS = [
  { date: "Jan 15, 2026", description: "Invoice #1042 — Acme Corp", amount: "$24,000" },
  { date: "Jan 28, 2026", description: "Invoice #1055 — Globex LLC", amount: "$18,500" },
  { date: "Feb 10, 2026", description: "Invoice #1067 — Initech Inc", amount: "$31,200" },
  { date: "Mar 03, 2026", description: "Invoice #1089 — Umbrella Co", amount: "$14,800" },
  { date: "Mar 22, 2026", description: "Invoice #1102 — Soylent Corp", amount: "$12,000" },
];

function fmt(val) {
  if (typeof val === "string") return val;
  return val;
}

function VarianceCell({ value, percent = false }) {
  const raw = typeof value === "string" ? value : String(value);
  const isNegative = raw.startsWith("-") || raw.startsWith("($");
  const isZero = raw === "$0" || raw === "0.0%";
  const color = isZero ? "text-gray-500" : isNegative ? "text-red-600" : "text-green-600";
  return <span className={`tabular-nums font-medium ${color}`}>{raw}</span>;
}

function DrillDown() {
  return (
    <tr>
      <td colSpan={7} className="bg-blue-50 px-6 py-3 border-b border-blue-100">
        <div className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">
          Transaction Detail
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 text-xs">
              <th className="pb-1 font-medium w-32">Date</th>
              <th className="pb-1 font-medium">Description</th>
              <th className="pb-1 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {DRILL_DOWN_TRANSACTIONS.map((tx, i) => (
              <tr key={i} className="border-t border-blue-100">
                <td className="py-1 text-gray-500 tabular-nums">{tx.date}</td>
                <td className="py-1 text-gray-700">{tx.description}</td>
                <td className="py-1 text-right tabular-nums text-gray-800 font-medium">{tx.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </td>
    </tr>
  );
}

function SectionHeaderRow({ label }) {
  return (
    <tr className="bg-gray-100">
      <td colSpan={7} className="px-6 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {label}
      </td>
    </tr>
  );
}

function DataRow({ account, current, prior, varD, varP, budget, budgetVar, bold, rowClass, expandable }) {
  const [expanded, setExpanded] = useState(false);

  const handleClick = () => {
    if (expandable) setExpanded((v) => !v);
  };

  return (
    <>
      <tr
        onClick={handleClick}
        className={[
          rowClass || "hover:bg-gray-50",
          expandable ? "cursor-pointer" : "",
          bold ? "font-bold" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <td className="px-6 py-2.5 text-sm text-gray-800 flex items-center gap-1.5">
          {expandable && (
            <span className="text-gray-400">
              {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </span>
          )}
          {account}
        </td>
        <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-800">{current}</td>
        <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-500">{prior}</td>
        <td className="px-4 py-2.5 text-sm text-right">
          <VarianceCell value={varD} />
        </td>
        <td className="px-4 py-2.5 text-sm text-right">
          <VarianceCell value={varP} />
        </td>
        <td className="px-4 py-2.5 text-sm text-right tabular-nums text-gray-500">{budget}</td>
        <td className="px-4 py-2.5 text-sm text-right">
          <VarianceCell value={budgetVar} />
        </td>
      </tr>
      {expanded && <DrillDown />}
    </>
  );
}

const TABLE_DATA = {
  revenue: [
    { account: "Product Revenue",  current: "$480,000", prior: "$420,000", varD: "+$60,000", varP: "+14.3%", budget: "$500,000", budgetVar: "-$20,000", expandable: true },
    { account: "Service Revenue",  current: "$124,000", prior: "$98,000",  varD: "+$26,000", varP: "+26.5%", budget: "$120,000", budgetVar: "+$4,000",  expandable: true },
    { account: "Consulting Fees",  current: "$38,500",  prior: "$32,000",  varD: "+$6,500",  varP: "+20.3%", budget: "$40,000",  budgetVar: "-$1,500",  expandable: true },
  ],
  cogs: [
    { account: "Direct Materials",       current: "$89,000",  prior: "$78,000",  varD: "+$11,000", varP: "+14.1%", budget: "$92,000",  budgetVar: "-$3,000", expandable: true },
    { account: "Direct Labor",           current: "$124,000", prior: "$108,000", varD: "+$16,000", varP: "+14.8%", budget: "$120,000", budgetVar: "+$4,000", expandable: true },
    { account: "Manufacturing Overhead", current: "$42,000",  prior: "$38,000",  varD: "+$4,000",  varP: "+10.5%", budget: "$40,000",  budgetVar: "+$2,000", expandable: true },
  ],
  opex: [
    { account: "Salaries & Benefits",     current: "$180,000", prior: "$165,000", varD: "+$15,000", varP: "+9.1%",  budget: "$175,000", budgetVar: "+$5,000",  expandable: true },
    { account: "Marketing & Advertising", current: "$42,000",  prior: "$38,500",  varD: "+$3,500",  varP: "+9.1%",  budget: "$45,000",  budgetVar: "-$3,000",  expandable: true },
    { account: "Technology & SaaS",       current: "$18,400",  prior: "$16,200",  varD: "+$2,200",  varP: "+13.6%", budget: "$18,000",  budgetVar: "+$400",   expandable: true },
    { account: "Travel & Entertainment",  current: "$8,900",   prior: "$7,200",   varD: "+$1,700",  varP: "+23.6%", budget: "$7,500",   budgetVar: "+$1,400", expandable: true },
    { account: "Office & Facilities",     current: "$24,000",  prior: "$24,000",  varD: "$0",       varP: "0.0%",   budget: "$24,000",  budgetVar: "$0",      expandable: true },
    { account: "Professional Services",   current: "$15,000",  prior: "$12,000",  varD: "+$3,000",  varP: "+25.0%", budget: "$14,000",  budgetVar: "+$1,000", expandable: true },
    { account: "Depreciation",            current: "$9,200",   prior: "$9,200",   varD: "$0",       varP: "0.0%",   budget: "$9,200",   budgetVar: "$0",      expandable: true },
  ],
  other: [
    { account: "Interest Income",  current: "$1,200",   prior: "$980",   varD: "+$220",   varP: "+22.4%",  budget: "$1,000",  budgetVar: "+$200", expandable: true },
    { account: "Interest Expense", current: "($4,500)", prior: "($4,500)", varD: "$0",    varP: "0.0%",    budget: "($4,500)", budgetVar: "$0",   expandable: true },
    { account: "Other Income",     current: "$2,800",   prior: "$1,200", varD: "+$1,600", varP: "+133.3%", budget: "$2,000",  budgetVar: "+$800", expandable: true },
  ],
};

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 flex flex-col gap-1">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-2xl font-bold tabular-nums text-gray-900">{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

export default function Books() {
  const [period, setPeriod] = useState("Q1 2026");
  const [basis, setBasis] = useState("accrual");

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-6">
      <div className="max-w-screen-xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">P&L Statement</h1>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Period selector */}
            <div className="relative">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
              >
                {PERIODS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Cash / Accrual toggle */}
            <div className="flex rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden text-sm">
              <button
                onClick={() => setBasis("cash")}
                className={`px-4 py-2 transition-colors ${
                  basis === "cash"
                    ? "bg-[#22C55E] text-white font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Cash
              </button>
              <button
                onClick={() => setBasis("accrual")}
                className={`px-4 py-2 transition-colors border-l border-gray-200 ${
                  basis === "accrual"
                    ? "bg-[#22C55E] text-white font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Accrual
              </button>
            </div>

            {/* Export */}
            <button className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
              <Download size={15} />
              Export
            </button>
          </div>
        </div>

        {/* Sub-header */}
        <p className="text-sm text-gray-500">
          January – March 2026 &nbsp;|&nbsp; {basis === "accrual" ? "Accrual" : "Cash"} Basis
        </p>

        {/* Table card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-white">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-56">
                    Account Name
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Current Period
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Prior Period
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Variance ($)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Variance (%)
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Budget Var
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* REVENUE */}
                <SectionHeaderRow label="Revenue" />
                {TABLE_DATA.revenue.map((row) => (
                  <DataRow key={row.account} {...row} />
                ))}
                <DataRow
                  account="Total Revenue"
                  current="$642,500" prior="$550,000" varD="+$92,500" varP="+16.8%"
                  budget="$660,000" budgetVar="-$17,500"
                  bold rowClass="bg-white font-bold border-t border-gray-200"
                />

                {/* COGS */}
                <SectionHeaderRow label="Cost of Goods Sold" />
                {TABLE_DATA.cogs.map((row) => (
                  <DataRow key={row.account} {...row} />
                ))}
                <DataRow
                  account="Total COGS"
                  current="$255,000" prior="$224,000" varD="+$31,000" varP="+13.8%"
                  budget="$252,000" budgetVar="+$3,000"
                  bold rowClass="bg-white font-bold border-t border-gray-200"
                />

                {/* GROSS PROFIT */}
                <DataRow
                  account="Gross Profit"
                  current="$387,500" prior="$326,000" varD="+$61,500" varP="+18.9%"
                  budget="$408,000" budgetVar="-$20,500"
                  bold rowClass="bg-green-50 font-bold border-t-2 border-green-200"
                />

                {/* OPEX */}
                <SectionHeaderRow label="Operating Expenses" />
                {TABLE_DATA.opex.map((row) => (
                  <DataRow key={row.account} {...row} />
                ))}
                <DataRow
                  account="Total OpEx"
                  current="$297,500" prior="$272,100" varD="+$25,400" varP="+9.3%"
                  budget="$292,700" budgetVar="+$4,800"
                  bold rowClass="bg-white font-bold border-t border-gray-200"
                />

                {/* OPERATING INCOME */}
                <DataRow
                  account="Operating Income"
                  current="$90,000" prior="$53,900" varD="+$36,100" varP="+67.0%"
                  budget="$115,300" budgetVar="-$25,300"
                  bold rowClass="bg-gray-50 font-bold border-t-2 border-gray-300"
                />

                {/* OTHER INCOME / EXPENSE */}
                <SectionHeaderRow label="Other Income / Expense" />
                {TABLE_DATA.other.map((row) => (
                  <DataRow key={row.account} {...row} />
                ))}

                {/* NET INCOME */}
                <DataRow
                  account="Net Income"
                  current="$89,500" prior="$51,580" varD="+$37,920" varP="+73.5%"
                  budget="$113,800" budgetVar="-$24,300"
                  bold rowClass="bg-green-50 font-bold text-green-700 border-t-2 border-green-300"
                />
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Gross Margin %" value="60.3%" sub="Gross Profit / Revenue" />
          <StatCard label="OpEx Ratio" value="46.3%" sub="Total OpEx / Revenue" />
          <StatCard label="Net Margin" value="13.9%" sub="Net Income / Revenue" />
        </div>
      </div>
    </div>
  );
}
