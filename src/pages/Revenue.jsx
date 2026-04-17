import { useState } from "react";
import {
  Plus, TrendingUp, CheckCircle, Clock, DollarSign,
  ChevronDown, X, ArrowUpRight, Banknote, Smartphone,
  CreditCard, Landmark, ChevronRight,
} from "lucide-react";
import { useRevenue, useCreateRevenue } from "../hooks/useRevenue";
import { useTransactionCategories } from "../hooks/useTransactions";
import { useAuth } from "../context/AuthContext";
import { fmt, fmtDate } from "../lib/fmt";

// ── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

const PAYMENT_METHODS = [
  { id: "bank",   label: "Bank Transfer", icon: Landmark },
  { id: "momo",   label: "Mobile Money",  icon: Smartphone },
  { id: "cash",   label: "Cash",          icon: Banknote },
  { id: "pos",    label: "POS / Card",    icon: CreditCard },
];

const statusConfig = {
  received: { bg: "bg-green-100",  text: "text-green-700",  label: "Received" },
  pending:  { bg: "bg-amber-100",  text: "text-amber-700",  label: "Pending"  },
  partial:  { bg: "bg-blue-100",   text: "text-blue-700",   label: "Partial"  },
};

function StatusPill({ status }) {
  const cfg = statusConfig[status?.toLowerCase()] ?? { bg: "bg-gray-100", text: "text-gray-600", label: status ?? "—" };
  return (
    <span className={`rounded-full text-xs px-2.5 py-0.5 font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

// ── Record Revenue Panel ────────────────────────────────────────────────────────
function RecordPanel({ categories, currency, onClose, onSave }) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState(null);
  const [form, setForm] = useState({ payer: "", amount: "", date: "", method: "", note: "" });
  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const revCats = categories.filter((c) => c.type === "revenue");

  const amountNum     = parseFloat(form.amount.replace(/,/g, "")) || 0;
  const amountMinor   = Math.round(amountNum * 100);
  const canGoStep2    = !!category;
  const canGoStep3    = form.payer.trim() && form.amount.trim() && form.date && form.method;

  function handleSave() {
    onSave({
      payer_name:     form.payer,
      amount:         amountMinor,
      revenue_date:   form.date,
      status:         "received",
      payment_method: form.method,
      note:           form.note,
      category_id:    category.id,
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[420px] bg-white shadow-2xl flex flex-col z-50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Record Revenue</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Step {step} of 3 —{" "}
              {step === 1 ? "Choose category" : step === 2 ? "Enter details" : "Review & save"}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded">
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center px-6 pt-4 pb-0">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                s < step  ? "bg-green-500 text-white"
                : s === step ? "bg-green-500 text-white ring-4 ring-green-100"
                : "bg-gray-100 text-gray-400"
              }`}>
                {s < step ? "✓" : s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 mx-1 ${s < step ? "bg-green-400" : "bg-gray-200"}`} />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Step 1 — Category */}
          {step === 1 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Revenue Category</p>
              {revCats.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No revenue categories found</p>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {revCats.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCategory(cat)}
                      className={`flex items-center gap-3 p-3.5 rounded-lg border-2 text-left transition-all ${
                        category?.id === cat.id
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-2xl leading-none">{cat.emoji ?? "💰"}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">{cat.name}</p>
                      </div>
                      {category?.id === cat.id && <CheckCircle size={16} className="text-green-500 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2 — Details */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 p-3 bg-green-50 rounded-lg border border-green-200 mb-4">
                <span className="text-xl">{category.emoji ?? "💰"}</span>
                <p className="text-sm font-semibold text-green-800">{category.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payer / Source <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.payer}
                  onChange={(e) => upd("payer", e.target.value)}
                  placeholder="Customer or payer name"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount ({currency === "GHS" ? "GH₵" : currency}) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.amount}
                  onChange={(e) => upd("amount", e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Received <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => upd("date", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Payment Method <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        onClick={() => upd("method", m.label)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border-2 text-left transition-all ${
                          form.method === m.label ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <Icon size={14} className={form.method === m.label ? "text-green-600" : "text-gray-400"} />
                        <span className={`text-xs font-medium ${form.method === m.label ? "text-green-800" : "text-gray-700"}`}>
                          {m.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <textarea
                  rows={2}
                  value={form.note}
                  onChange={(e) => upd("note", e.target.value)}
                  placeholder="Reference number, remarks..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 3 — Confirm */}
          {step === 3 && (
            <div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 mb-5">
                <p className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">Revenue Amount</p>
                <p className="text-3xl font-bold text-green-700">{fmt(amountMinor, currency)}</p>
                <p className="text-sm text-green-600 mt-1">{category?.name}</p>
              </div>
              <div className="space-y-0 divide-y divide-gray-100">
                {[
                  { label: "Payer",          value: form.payer },
                  { label: "Date Received",  value: form.date },
                  { label: "Category",       value: `${category?.emoji ?? "💰"} ${category?.name}` },
                  { label: "Payment Method", value: form.method },
                  { label: "Note",           value: form.note || "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-gray-500">{label}</span>
                    <span className="text-sm font-semibold text-gray-900 text-right max-w-[55%]">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 bg-white text-gray-700 border border-gray-300 rounded-md py-2.5 text-sm font-medium hover:bg-gray-50"
            >
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 ? !canGoStep2 : !canGoStep3}
              className="flex-1 bg-green-500 text-white rounded-md py-2.5 text-sm font-semibold hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Continue <ChevronRight size={15} />
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="flex-1 bg-green-500 text-white rounded-md py-2.5 text-sm font-semibold hover:bg-green-600 flex items-center justify-center gap-2"
            >
              <CheckCircle size={15} />
              Save Revenue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Revenue() {
  const { orgCurrency } = useAuth();
  const currency = orgCurrency ?? "GHS";

  const [activeTab,  setActiveTab]  = useState("all");
  const [showPanel,  setShowPanel]  = useState(false);
  const [toast,      setToast]      = useState(null);

  const { data: records = [], isLoading } = useRevenue();
  const { data: categories = [] }         = useTransactionCategories();
  const createMut = useCreateRevenue();

  const tabs = ["all", "received", "pending", "partial"];

  const filtered = activeTab === "all"
    ? records
    : records.filter((r) => r.status?.toLowerCase() === activeTab);

  const totalMTD  = records.reduce((s, r) => s + (r.amount ?? 0), 0);
  const collected = records.filter((r) => r.status === "received").reduce((s, r) => s + (r.amount ?? 0), 0);
  const pending   = records.filter((r) => r.status === "pending").reduce((s, r) => s + (r.amount ?? 0), 0);
  const partial   = records.filter((r) => r.status === "partial").reduce((s, r) => s + (r.amount ?? 0), 0);

  // Category breakdown for the bar chart
  const catBreakdown = categories
    .filter((c) => c.type === "revenue")
    .map((cat) => {
      const catTotal = records
        .filter((r) => r.category_id === cat.id)
        .reduce((s, r) => s + (r.amount ?? 0), 0);
      return { ...cat, total: catTotal, pct: totalMTD > 0 ? Math.round((catTotal / totalMTD) * 100) : 0 };
    })
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  function handleSave(values) {
    createMut.mutate(values, {
      onSuccess: (rec) => {
        setShowPanel(false);
        setToast(`Revenue of ${fmt(rec.amount, currency)} recorded successfully.`);
        setTimeout(() => setToast(null), 4000);
      },
    });
  }

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl flex items-center gap-2.5">
          <CheckCircle size={15} className="text-green-400" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track and record all incoming revenue</p>
        </div>
        <button
          onClick={() => setShowPanel(true)}
          className="flex items-center gap-2 bg-green-500 text-white rounded-md px-4 py-2 hover:bg-green-600 font-medium text-sm"
        >
          <Plus size={15} />
          Record Revenue
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total MTD",  value: totalMTD,  icon: TrendingUp,  color: "text-green-600",   bg: "bg-green-50",   badge: `${records.length} entries` },
          { label: "Collected",  value: collected,  icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", badge: `${records.filter((r) => r.status === "received").length} records` },
          { label: "Pending",    value: pending,   icon: Clock,       color: "text-amber-600",   bg: "bg-amber-50",   badge: `${records.filter((r) => r.status === "pending").length} records` },
          { label: "Partial",    value: partial,   icon: DollarSign,  color: "text-blue-600",    bg: "bg-blue-50",    badge: `${records.filter((r) => r.status === "partial").length} records` },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <div className={`${stat.bg} p-2 rounded-lg`}>
                <stat.icon size={16} className={stat.color} />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-28" />
            ) : (
              <p className="text-xl font-bold text-gray-900 mb-1">{fmt(stat.value, currency)}</p>
            )}
            <p className="text-xs text-gray-400">{stat.badge}</p>
          </div>
        ))}
      </div>

      {/* Trend + Category Split */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Revenue Trend</p>
              <p className="text-xs text-gray-400">Last 6 months (MTD data)</p>
            </div>
            <div className="flex items-center gap-1 text-green-600 text-xs font-semibold">
              <ArrowUpRight size={14} />
              Month to date
            </div>
          </div>
          <div className="flex items-end gap-2 h-20">
            {[0.4, 0.6, 0.5, 0.75, 0.65, 1].map((ratio, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t-sm ${i === 5 ? "bg-green-500" : "bg-green-200"}`}
                  style={{ height: `${Math.round(ratio * 68)}px` }}
                />
                <span className="text-[10px] text-gray-400">
                  {["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-900 mb-4">By Category</p>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
            </div>
          ) : catBreakdown.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No data yet</p>
          ) : (
            <div className="space-y-2.5">
              {catBreakdown.map((cat) => (
                <div key={cat.id}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-gray-600 flex items-center gap-1">
                      <span>{cat.emoji ?? "💰"}</span> {cat.name}
                    </span>
                    <span className="text-xs font-semibold text-gray-700">{cat.pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${cat.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Revenue Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <h2 className="text-base font-semibold text-gray-900">Revenue Records</h2>
          <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md px-3 py-1.5">
            <ChevronDown size={14} />
            Export
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex border-b border-gray-200 px-6 mt-4">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`mr-5 pb-3 text-sm font-medium border-b-2 capitalize transition-colors ${
                activeTab === tab
                  ? "border-green-500 text-green-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "all" ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab !== "all" && (
                <span className="ml-1.5 text-xs text-gray-400">
                  ({records.filter((r) => r.status === tab).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <TrendingUp size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No revenue records yet</p>
            <button onClick={() => setShowPanel(true)} className="text-sm text-green-600 mt-1 hover:underline">
              Record your first revenue
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Payer / Source", "Category", "Method", "Date", "Amount", "Status", ""].map((h) => (
                    <th
                      key={h}
                      className={`text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 ${
                        h === "Amount" ? "text-right px-3" : "text-left px-3 first:px-6"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((rev, i) => {
                  const cat = rev.transaction_categories;
                  return (
                    <tr
                      key={rev.id}
                      className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i % 2 !== 0 ? "bg-gray-50/30" : ""}`}
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-green-100 rounded-md flex items-center justify-center shrink-0">
                            <span className="text-sm leading-none">{cat?.emoji ?? "💰"}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{rev.payer_name ?? "—"}</p>
                            {rev.note && <p className="text-xs text-gray-400 truncate">{rev.note}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="text-xs text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">
                          {cat?.name ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="text-xs text-gray-500">{rev.payment_method ?? "—"}</span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="text-sm text-gray-600">{fmtDate(rev.revenue_date)}</span>
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <span className="text-sm font-bold text-green-700">{fmt(rev.amount, currency)}</span>
                      </td>
                      <td className="px-3 py-3.5">
                        <StatusPill status={rev.status} />
                      </td>
                      <td className="px-3 py-3.5" />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Showing {filtered.length} of {records.length} records
          </p>
        </div>
      </div>

      {showPanel && (
        <RecordPanel
          categories={categories}
          currency={currency}
          onClose={() => setShowPanel(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
