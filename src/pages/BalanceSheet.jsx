import { Download } from "lucide-react";

function AmountCell({ value, muted = false }) {
  const raw = typeof value === "string" ? value : String(value);
  const isNegative = raw.startsWith("(") || raw.startsWith("-");
  const colorClass = isNegative ? "text-red-600" : muted ? "text-gray-500" : "text-gray-800";
  return (
    <td className={`px-4 py-2.5 text-right text-sm tabular-nums font-medium ${colorClass}`}>
      {raw}
    </td>
  );
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

function LineRow({ label, value, bold = false, rowClass = "", muted = false }) {
  return (
    <tr className={`border-t border-gray-100 ${rowClass} ${bold ? "font-semibold" : ""}`}>
      <td className={`px-4 py-2.5 text-sm ${bold ? "text-gray-900" : "text-gray-700"}`}>
        {label}
      </td>
      <AmountCell value={value} muted={muted} />
    </tr>
  );
}

function TotalRow({ label, value, large = false }) {
  return (
    <tr className="bg-gray-100 border-t-2 border-gray-300">
      <td className={`px-4 py-3 font-bold ${large ? "text-base text-gray-900" : "text-sm text-gray-800"}`}>
        {label}
      </td>
      <td className={`px-4 py-3 text-right tabular-nums font-bold ${large ? "text-base text-gray-900" : "text-sm text-gray-800"}`}>
        {value}
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

export default function BalanceSheet() {
  return (
    <div className="min-h-screen bg-[#F7F7F8] p-6">
      <div className="max-w-screen-xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Balance Sheet</h1>
            <p className="text-sm text-gray-500 mt-0.5">As of March 31, 2026</p>
          </div>
          <button className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
            <Download size={15} />
            Export
          </button>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* LEFT — ASSETS */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">Assets</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <tbody>
                  {/* CURRENT ASSETS */}
                  <SectionHeader label="Current Assets" />
                  <LineRow label="Cash & Cash Equivalents" value="$284,320" />
                  <LineRow label="Accounts Receivable" value="$142,800" />
                  <LineRow label="Prepaid Expenses" value="$18,400" />
                  <LineRow label="Inventory" value="$67,200" />
                  <LineRow
                    label="Total Current Assets"
                    value="$512,720"
                    bold
                    rowClass="bg-gray-50"
                  />

                  {/* FIXED ASSETS */}
                  <SectionHeader label="Fixed Assets" />
                  <LineRow label="Property & Equipment" value="$340,000" />
                  <LineRow label="Less: Accumulated Depreciation" value="($87,600)" />
                  <LineRow label="Intangible Assets" value="$125,000" />
                  <LineRow
                    label="Total Fixed Assets"
                    value="$377,400"
                    bold
                    rowClass="bg-gray-50"
                  />

                  {/* TOTAL ASSETS */}
                  <TotalRow label="Total Assets" value="$890,120" large />
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT — LIABILITIES & EQUITY */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide">
                Liabilities &amp; Equity
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <tbody>
                  {/* CURRENT LIABILITIES */}
                  <SectionHeader label="Current Liabilities" />
                  <LineRow label="Accounts Payable" value="$47,230" />
                  <LineRow label="Accrued Expenses" value="$28,400" />
                  <LineRow label="Short-term Debt" value="$50,000" />
                  <LineRow label="Deferred Revenue" value="$34,600" />
                  <LineRow
                    label="Total Current Liabilities"
                    value="$160,230"
                    bold
                    rowClass="bg-gray-50"
                  />

                  {/* LONG-TERM LIABILITIES */}
                  <SectionHeader label="Long-term Liabilities" />
                  <LineRow label="Long-term Debt" value="$200,000" />
                  <LineRow label="Deferred Tax Liability" value="$12,400" />
                  <LineRow
                    label="Total Long-term Liabilities"
                    value="$212,400"
                    bold
                    rowClass="bg-gray-50"
                  />

                  {/* TOTAL LIABILITIES */}
                  <tr className="border-t border-gray-200 bg-white">
                    <td className="px-4 py-2.5 text-sm font-semibold text-gray-900">
                      Total Liabilities
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm tabular-nums font-semibold text-gray-900">
                      $372,630
                    </td>
                  </tr>

                  {/* EQUITY */}
                  <SectionHeader label="Equity" />
                  <LineRow label="Common Stock" value="$100,000" />
                  <LineRow label="Additional Paid-in Capital" value="$280,000" />
                  <LineRow label="Retained Earnings" value="$137,490" />
                  <LineRow
                    label="Total Equity"
                    value="$517,490"
                    bold
                    rowClass="bg-gray-50"
                  />

                  {/* TOTAL LIABILITIES & EQUITY */}
                  <TotalRow label="Total Liabilities & Equity" value="$890,120" large />
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Key ratio cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Current Ratio"
            value="3.20"
            sub="Current Assets / Current Liabilities"
          />
          <StatCard
            label="Debt-to-Equity"
            value="0.72"
            sub="Total Liabilities / Total Equity"
          />
          <StatCard
            label="Return on Equity"
            value="17.3%"
            sub="Net Income / Total Equity"
          />
        </div>
      </div>
    </div>
  );
}
