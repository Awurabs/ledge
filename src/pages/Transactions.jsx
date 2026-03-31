import { useState } from "react";
import {
  Search,
  Calendar,
  Download,
  Plus,
  ChevronDown,
  ChevronUp,
  Receipt,
  AlertCircle,
  FileText,
  Split,
  X,
} from "lucide-react";

const TRANSACTIONS = [
  { id: 1, date: "Mar 28, 2026", merchant: "Stripe Inc", cardholder: "Kofi Mensah", category: "SaaS", amount: 2400.0, receipt: true, status: "Approved", glCode: "5200-SaaS", card: "•••• 4821", note: "" },
  { id: 2, date: "Mar 27, 2026", merchant: "Delta Airlines", cardholder: "Ama Darko", category: "Travel", amount: 1890.0, receipt: false, status: "Pending", glCode: "5400-TRV", card: "•••• 3319", note: "" },
  { id: 3, date: "Mar 27, 2026", merchant: "WeWork", cardholder: "James Osei", category: "Facilities", amount: 4200.0, receipt: true, status: "Approved", glCode: "5100-FAC", card: "•••• 9204", note: "" },
  { id: 4, date: "Mar 26, 2026", merchant: "AWS", cardholder: "Nana Boateng", category: "SaaS", amount: 3150.0, receipt: true, status: "Approved", glCode: "5200-CLD", card: "•••• 7712", note: "" },
  { id: 5, date: "Mar 26, 2026", merchant: "Uber", cardholder: "Efua Asante", category: "Transport", amount: 87.0, receipt: false, status: "Flagged", glCode: "5300-TRN", card: "•••• 5540", note: "" },
  { id: 6, date: "Mar 25, 2026", merchant: "Marriott Hotels", cardholder: "Kweku Adjei", category: "Travel", amount: 2340.0, receipt: false, status: "Pending", glCode: "5400-HTL", card: "•••• 8831", note: "" },
  { id: 7, date: "Mar 25, 2026", merchant: "Google Workspace", cardholder: "Adwoa Frimpong", category: "SaaS", amount: 1200.0, receipt: true, status: "Approved", glCode: "5200-PRD", card: "•••• 2267", note: "" },
  { id: 8, date: "Mar 24, 2026", merchant: "Office Depot", cardholder: "Yaw Amponsah", category: "Office", amount: 430.0, receipt: true, status: "Approved", glCode: "5600-OFC", card: "•••• 6694", note: "" },
  { id: 9, date: "Mar 24, 2026", merchant: "Salesforce", cardholder: "Kofi Mensah", category: "SaaS", amount: 5600.0, receipt: true, status: "Approved", glCode: "5200-CRM", card: "•••• 4821", note: "" },
  { id: 10, date: "Mar 23, 2026", merchant: "Emirates Airlines", cardholder: "Ama Darko", category: "Travel", amount: 3200.0, receipt: false, status: "Pending", glCode: "5400-TRV", card: "•••• 3319", note: "" },
  { id: 11, date: "Mar 23, 2026", merchant: "Zoom", cardholder: "Samuel Ofori", category: "SaaS", amount: 720.0, receipt: true, status: "Approved", glCode: "5200-COM", card: "•••• 1183", note: "" },
  { id: 12, date: "Mar 22, 2026", merchant: "Bolt Food", cardholder: "Priscilla Owusu", category: "Meals", amount: 145.0, receipt: false, status: "Flagged", glCode: "5500-MEA", card: "•••• 4457", note: "" },
  { id: 13, date: "Mar 22, 2026", merchant: "Canva Pro", cardholder: "James Osei", category: "SaaS", amount: 180.0, receipt: true, status: "Approved", glCode: "5200-DES", card: "•••• 9204", note: "" },
  { id: 14, date: "Mar 21, 2026", merchant: "Shell Fuel", cardholder: "Nana Boateng", category: "Transport", amount: 380.0, receipt: true, status: "Approved", glCode: "5300-FUL", card: "•••• 7712", note: "" },
  { id: 15, date: "Mar 21, 2026", merchant: "LinkedIn Premium", cardholder: "Efua Asante", category: "SaaS", amount: 900.0, receipt: true, status: "Approved", glCode: "5200-LRN", card: "•••• 5540", note: "" },
  { id: 16, date: "Mar 20, 2026", merchant: "Hilton Hotels", cardholder: "Kweku Adjei", category: "Travel", amount: 1750.0, receipt: false, status: "Pending", glCode: "5400-HTL", card: "•••• 8831", note: "" },
  { id: 17, date: "Mar 20, 2026", merchant: "Slack", cardholder: "Adwoa Frimpong", category: "SaaS", amount: 480.0, receipt: true, status: "Approved", glCode: "5200-COM", card: "•••• 2267", note: "" },
  { id: 18, date: "Mar 19, 2026", merchant: "Jumia", cardholder: "Yaw Amponsah", category: "Office", amount: 290.0, receipt: false, status: "Flagged", glCode: "5600-OFC", card: "•••• 6694", note: "" },
  { id: 19, date: "Mar 19, 2026", merchant: "Figma", cardholder: "Kofi Mensah", category: "SaaS", amount: 840.0, receipt: true, status: "Approved", glCode: "5200-DES", card: "•••• 4821", note: "" },
  { id: 20, date: "Mar 18, 2026", merchant: "MTN Business", cardholder: "Samuel Ofori", category: "Telecom", amount: 1100.0, receipt: true, status: "Approved", glCode: "5700-TEL", card: "•••• 1183", note: "" },
];

const CATEGORY_COLORS = {
  SaaS: "bg-blue-50 text-blue-700",
  Travel: "bg-purple-50 text-purple-700",
  Facilities: "bg-gray-100 text-gray-700",
  Transport: "bg-indigo-50 text-indigo-700",
  Office: "bg-stone-100 text-stone-700",
  Meals: "bg-orange-50 text-orange-700",
  Telecom: "bg-teal-50 text-teal-700",
};

const STATUS_COLORS = {
  Approved: "bg-green-50 text-green-700",
  Pending: "bg-amber-50 text-amber-700",
  Flagged: "bg-red-50 text-red-700",
};

const CATEGORIES = ["All Categories", "SaaS", "Travel", "Facilities", "Transport", "Office", "Meals", "Telecom"];
const STATUSES = ["All Statuses", "Approved", "Pending", "Flagged"];
const CARDS = ["All Cards", "•••• 4821", "•••• 3319", "•••• 9204", "•••• 7712", "•••• 5540", "•••• 8831", "•••• 2267", "•••• 6694", "•••• 1183", "•••• 4457"];

function fmt(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function Transactions() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [cardFilter, setCardFilter] = useState("All Cards");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [search, setSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState(null);
  const [rowData, setRowData] = useState(TRANSACTIONS);

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setCardFilter("All Cards");
    setCategoryFilter("All Categories");
    setStatusFilter("All Statuses");
    setSearch("");
  };

  const filtered = rowData.filter((t) => {
    if (cardFilter !== "All Cards" && t.card !== cardFilter) return false;
    if (categoryFilter !== "All Categories" && t.category !== categoryFilter) return false;
    if (statusFilter !== "All Statuses" && t.status !== statusFilter) return false;
    if (search && !t.merchant.toLowerCase().includes(search.toLowerCase()) && !t.cardholder.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const total = filtered.reduce((s, t) => s + t.amount, 0);

  const handleCategoryChange = (id, val) => {
    setRowData((prev) => prev.map((r) => (r.id === id ? { ...r, category: val } : r)));
  };

  const handleNoteChange = (id, val) => {
    setRowData((prev) => prev.map((r) => (r.id === id ? { ...r, note: val } : r)));
  };

  const toggleRow = (id) => {
    setExpandedRow((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Transactions</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Track and manage all company card spend</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#374151] bg-white border border-[#E5E7EB] rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
            <Download size={15} />
            Export CSV
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#22C55E] rounded-lg shadow-sm hover:bg-green-600 transition-colors">
            <Plus size={15} />
            New Transaction
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm p-4 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date From */}
          <div className="relative">
            <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
            <input
              type="text"
              placeholder="From date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-[#F7F7F8] focus:outline-none focus:ring-2 focus:ring-green-300 w-32"
            />
          </div>
          {/* Date To */}
          <div className="relative">
            <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
            <input
              type="text"
              placeholder="To date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-[#F7F7F8] focus:outline-none focus:ring-2 focus:ring-green-300 w-32"
            />
          </div>
          {/* Card */}
          <div className="relative">
            <select
              value={cardFilter}
              onChange={(e) => setCardFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-[#F7F7F8] focus:outline-none focus:ring-2 focus:ring-green-300 cursor-pointer"
            >
              {CARDS.map((c) => <option key={c}>{c}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" />
          </div>
          {/* Category */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-[#F7F7F8] focus:outline-none focus:ring-2 focus:ring-green-300 cursor-pointer"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" />
          </div>
          {/* Status */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-[#F7F7F8] focus:outline-none focus:ring-2 focus:ring-green-300 cursor-pointer"
            >
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" />
          </div>
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
            <input
              type="text"
              placeholder="Search merchant or cardholder..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-[#F7F7F8] focus:outline-none focus:ring-2 focus:ring-green-300"
            />
          </div>
          {/* Clear */}
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-sm text-[#6B7280] hover:text-[#111827] transition-colors"
          >
            <X size={13} />
            Clear Filters
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
          <span className="text-sm text-[#6B7280]">
            Showing <span className="font-semibold text-[#111827]">{filtered.length}</span> transactions
          </span>
          <span className="text-sm text-[#6B7280]">
            Total: <span className="font-semibold text-[#111827] tabular-nums">{fmt(total)}</span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F7F7F8]">
                {["Date", "Merchant", "Cardholder", "Category", "Amount", "Receipt", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <>
                  <tr
                    key={t.id}
                    onClick={() => toggleRow(t.id)}
                    className={`border-b border-[#E5E7EB] cursor-pointer hover:bg-gray-50 transition-colors ${!t.receipt ? "border-l-4 border-l-amber-400" : "border-l-4 border-l-transparent"}`}
                  >
                    <td className="px-5 py-3.5 text-[#6B7280] whitespace-nowrap">{t.date}</td>
                    <td className="px-5 py-3.5 font-medium text-[#111827] whitespace-nowrap">{t.merchant}</td>
                    <td className="px-5 py-3.5 text-[#374151] whitespace-nowrap">{t.cardholder}</td>
                    <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block">
                        <select
                          value={t.category}
                          onChange={(e) => handleCategoryChange(t.id, e.target.value)}
                          className={`appearance-none text-xs font-medium rounded-full px-2.5 py-0.5 pr-6 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-300 ${CATEGORY_COLORS[t.category]}`}
                        >
                          {CATEGORIES.slice(1).map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-[#111827] tabular-nums whitespace-nowrap">{fmt(t.amount)}</td>
                    <td className="px-5 py-3.5">
                      {t.receipt ? (
                        <span className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
                          <Receipt size={13} />
                          Receipt
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-amber-600 text-xs font-medium">
                          <AlertCircle size={13} />
                          Missing
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`rounded-full text-xs px-2.5 py-0.5 font-medium ${STATUS_COLORS[t.status]}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button className="text-xs text-[#6B7280] hover:text-[#111827] transition-colors border border-[#E5E7EB] rounded px-2 py-1 hover:bg-gray-50">
                          View
                        </button>
                        {expandedRow === t.id ? (
                          <ChevronUp size={14} className="text-[#6B7280]" />
                        ) : (
                          <ChevronDown size={14} className="text-[#6B7280]" />
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Detail Panel */}
                  {expandedRow === t.id && (
                    <tr key={`detail-${t.id}`} className="bg-green-50/40">
                      <td colSpan={8} className="px-6 py-5 border-b border-[#E5E7EB]">
                        <div className="grid grid-cols-3 gap-6">
                          {/* Merchant & Cardholder */}
                          <div>
                            <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Transaction Details</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-[#6B7280]">Merchant</span>
                                <span className="font-medium text-[#111827]">{t.merchant}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[#6B7280]">Cardholder</span>
                                <span className="font-medium text-[#111827]">{t.cardholder}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[#6B7280]">Card</span>
                                <span className="font-mono text-[#374151] text-xs">{t.card}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[#6B7280]">Date</span>
                                <span className="text-[#374151]">{t.date}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[#6B7280]">Amount</span>
                                <span className="font-semibold text-[#111827] tabular-nums">{fmt(t.amount)}</span>
                              </div>
                            </div>
                          </div>

                          {/* GL Code */}
                          <div>
                            <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Coding</h4>
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-[#6B7280] block mb-1">GL Code</label>
                                <input
                                  type="text"
                                  defaultValue={t.glCode}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-[#6B7280] block mb-1">Note</label>
                                <textarea
                                  rows={2}
                                  value={t.note}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => handleNoteChange(t.id, e.target.value)}
                                  placeholder="Add a note..."
                                  className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div>
                            <h4 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Actions</h4>
                            <div className="space-y-2">
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-[#374151] bg-white border border-[#E5E7EB] rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                <FileText size={14} />
                                Add Note
                              </button>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-[#374151] bg-white border border-[#E5E7EB] rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                <Split size={14} />
                                Split Transaction
                              </button>
                              {!t.receipt && (
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                                >
                                  <AlertCircle size={14} />
                                  Request Receipt
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}

              {/* Totals Row */}
              <tr className="bg-gray-50 border-t-2 border-[#E5E7EB]">
                <td colSpan={4} className="px-5 py-3.5 text-sm font-semibold text-[#374151]">
                  Total ({filtered.length} transactions)
                </td>
                <td className="px-5 py-3.5 font-bold text-[#111827] tabular-nums text-sm">{fmt(total)}</td>
                <td colSpan={3} />
              </tr>
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-[#6B7280]">
            <Search size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No transactions match your filters</p>
            <button onClick={clearFilters} className="text-sm text-green-600 mt-1 hover:underline">
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
