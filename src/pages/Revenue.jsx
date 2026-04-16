import { useState } from "react";
import {
  Plus,
  TrendingUp,
  CheckCircle,
  Clock,
  DollarSign,
  ChevronDown,
  Eye,
  X,
  ArrowUpRight,
  Banknote,
  Smartphone,
  CreditCard,
  Landmark,
  ChevronRight,
} from "lucide-react";

// ── Sample data ────────────────────────────────────────────────────────────────

const REVENUE_CATS = [
  { id: "sales",       label: "Sales Revenue",   emoji: "💰", gl: "4000" },
  { id: "service",     label: "Service Income",  emoji: "🤝", gl: "4100" },
  { id: "consulting",  label: "Consulting Fees", emoji: "💼", gl: "4200" },
  { id: "grants",      label: "Grants & Awards", emoji: "🏆", gl: "4300" },
  { id: "interest",    label: "Interest Income", emoji: "🏦", gl: "4400" },
  { id: "rental",      label: "Rental Income",   emoji: "🏠", gl: "4500" },
  { id: "other",       label: "Other Revenue",   emoji: "📥", gl: "4900" },
];

const PAYMENT_METHODS = [
  { id: "bank",   label: "Bank Transfer", icon: Landmark },
  { id: "momo",   label: "Mobile Money",  icon: Smartphone },
  { id: "cash",   label: "Cash",          icon: Banknote },
  { id: "pos",    label: "POS / Card",    icon: CreditCard },
];

const revenues = [
  { id: 1,  refNo: "REV-2026-041", payer: "Accra Tech Hub",      amount: 24500,  date: "Apr 14, 2026", period: "Apr 2026", category: "Service Income",   method: "Bank Transfer", status: "Received", gl: "4100", note: "" },
  { id: 2,  refNo: "REV-2026-040", payer: "Kofa Systems Ltd",     amount: 8900,   date: "Apr 13, 2026", period: "Apr 2026", category: "Consulting Fees",  method: "Bank Transfer", status: "Received", gl: "4200", note: "Q2 retainer" },
  { id: 3,  refNo: "REV-2026-039", payer: "Ashanti Holdings",     amount: 45000,  date: "Apr 12, 2026", period: "Apr 2026", category: "Sales Revenue",    method: "Bank Transfer", status: "Received", gl: "4000", note: "" },
  { id: 4,  refNo: "REV-2026-038", payer: "GoG Innovation Fund",  amount: 120000, date: "Apr 10, 2026", period: "Apr 2026", category: "Grants & Awards",  method: "Bank Transfer", status: "Received", gl: "4300", note: "Grant tranche 2" },
  { id: 5,  refNo: "REV-2026-037", payer: "Volta River Auth",     amount: 12800,  date: "Apr 9, 2026",  period: "Apr 2026", category: "Service Income",   method: "Mobile Money",  status: "Pending",  gl: "4100", note: "" },
  { id: 6,  refNo: "REV-2026-036", payer: "Kumasi Ventures",      amount: 7200,   date: "Apr 8, 2026",  period: "Apr 2026", category: "Consulting Fees",  method: "Bank Transfer", status: "Received", gl: "4200", note: "" },
  { id: 7,  refNo: "REV-2026-035", payer: "GCB Bank Savings",     amount: 3840,   date: "Apr 7, 2026",  period: "Apr 2026", category: "Interest Income",  method: "Bank Transfer", status: "Received", gl: "4400", note: "Q1 savings interest" },
  { id: 8,  refNo: "REV-2026-034", payer: "Takoradi Port Auth",   amount: 18600,  date: "Apr 5, 2026",  period: "Apr 2026", category: "Sales Revenue",    method: "POS / Card",    status: "Received", gl: "4000", note: "" },
  { id: 9,  refNo: "REV-2026-033", payer: "Northern Star Co",     amount: 5800,   date: "Apr 4, 2026",  period: "Apr 2026", category: "Sales Revenue",    method: "Cash",          status: "Partial",  gl: "4000", note: "50% deposit received" },
  { id: 10, refNo: "REV-2026-032", payer: "Stanbic Partners",     amount: 22000,  date: "Apr 3, 2026",  period: "Apr 2026", category: "Consulting Fees",  method: "Bank Transfer", status: "Received", gl: "4200", note: "" },
  { id: 11, refNo: "REV-2026-031", payer: "Ecobank Ghana",        amount: 9400,   date: "Apr 2, 2026",  period: "Apr 2026", category: "Service Income",   method: "Bank Transfer", status: "Received", gl: "4100", note: "" },
  { id: 12, refNo: "REV-2026-030", payer: "National Trust Office",amount: 6200,   date: "Apr 1, 2026",  period: "Apr 2026", category: "Rental Income",    method: "Bank Transfer", status: "Pending",  gl: "4500", note: "April office sublease" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n) =>
  "GH₵ " + n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusConfig = {
  Received: { bg: "bg-green-100",  text: "text-green-700"  },
  Pending:  { bg: "bg-amber-100",  text: "text-amber-700"  },
  Partial:  { bg: "bg-blue-100",   text: "text-blue-700"   },
};

const methodIcons = {
  "Bank Transfer": Landmark,
  "Mobile Money":  Smartphone,
  "Cash":          Banknote,
  "POS / Card":    CreditCard,
};

function StatusPill({ status }) {
  const cfg = statusConfig[status] || { bg: "bg-gray-100", text: "text-gray-600" };
  return (
    <span className={`rounded-full text-xs px-2.5 py-0.5 font-medium ${cfg.bg} ${cfg.text}`}>
      {status}
    </span>
  );
}

// ── Record Revenue Slide Panel ─────────────────────────────────────────────────

function RecordPanel({ onClose, onSave }) {
  const [step, setStep] = useState(1); // 1 = category, 2 = details, 3 = confirm
  const [category, setCategory] = useState(null);
  const [form, setForm] = useState({
    payer: "",
    amount: "",
    date: "",
    method: "",
    period: "",
    note: "",
  });

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const totalFormatted = form.amount
    ? fmt(parseFloat(form.amount.replace(/,/g, "")) || 0)
    : "GH₵ 0.00";

  const canGoStep2 = !!category;
  const canGoStep3 =
    form.payer.trim() && form.amount.trim() && form.date && form.method;

  function handleSave() {
    const newRev = {
      id: Date.now(),
      refNo: `REV-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
      payer: form.payer,
      amount: parseFloat(form.amount.replace(/,/g, "")) || 0,
      date: new Date(form.date).toLocaleDateString("en-GH", {
        day: "2-digit", month: "short", year: "numeric",
      }),
      period: form.period || "Apr 2026",
      category: category.label,
      method: form.method,
      status: "Received",
      gl: category.gl,
      note: form.note,
    };
    onSave(newRev);
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Panel */}
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
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 px-6 pt-4 pb-0">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  s < step
                    ? "bg-green-500 text-white"
                    : s === step
                    ? "bg-green-500 text-white ring-4 ring-green-100"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                {s < step ? "✓" : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-12 h-0.5 mx-1 transition-all ${
                    s < step ? "bg-green-400" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* ── Step 1: Category ── */}
          {step === 1 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Revenue Category</p>
              <div className="grid grid-cols-1 gap-2">
                {REVENUE_CATS.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat)}
                    className={`flex items-center gap-3 p-3.5 rounded-lg border-2 text-left transition-all ${
                      category?.id === cat.id
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-2xl leading-none">{cat.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{cat.label}</p>
                      <p className="text-xs text-gray-400">GL {cat.gl}</p>
                    </div>
                    {category?.id === cat.id && (
                      <CheckCircle size={16} className="text-green-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 2: Details ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 p-3 bg-green-50 rounded-lg border border-green-200 mb-4">
                <span className="text-xl">{category.emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-green-800">{category.label}</p>
                  <p className="text-xs text-green-600">GL Account {category.gl}</p>
                </div>
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (GH₵) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
                    GH₵
                  </span>
                  <input
                    type="text"
                    value={form.amount}
                    onChange={(e) => upd("amount", e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-300 rounded-md pl-12 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Received <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => upd("date", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                  <input
                    type="text"
                    value={form.period}
                    onChange={(e) => upd("period", e.target.value)}
                    placeholder="e.g. Apr 2026"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
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
                          form.method === m.label
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200 hover:border-gray-300"
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          )}

          {/* ── Step 3: Confirm ── */}
          {step === 3 && (
            <div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 mb-5">
                <p className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">
                  Revenue Amount
                </p>
                <p className="text-3xl font-bold text-green-700">{totalFormatted}</p>
                <p className="text-sm text-green-600 mt-1">{category?.label}</p>
              </div>

              <div className="space-y-0 divide-y divide-gray-100">
                {[
                  { label: "Payer",           value: form.payer },
                  { label: "Date Received",   value: new Date(form.date).toLocaleDateString("en-GH", { day: "2-digit", month: "short", year: "numeric" }) },
                  { label: "Period",          value: form.period || "—" },
                  { label: "Category",        value: `${category?.emoji} ${category?.label}` },
                  { label: "GL Account",      value: category?.gl },
                  { label: "Payment Method",  value: form.method },
                  { label: "Note",            value: form.note || "—" },
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
              className="flex-1 bg-white text-gray-700 border border-gray-300 rounded-md py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 ? !canGoStep2 : !canGoStep3}
              className="flex-1 bg-green-500 text-white rounded-md py-2.5 text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Continue
              <ChevronRight size={15} />
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="flex-1 bg-green-500 text-white rounded-md py-2.5 text-sm font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
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
  const [records, setRecords] = useState(revenues);
  const [activeTab, setActiveTab] = useState("All");
  const [showPanel, setShowPanel] = useState(false);
  const [toast, setToast] = useState(null);

  const tabs = ["All", "Received", "Pending", "Partial"];

  const filtered =
    activeTab === "All" ? records : records.filter((r) => r.status === activeTab);

  const totalMTD   = records.reduce((s, r) => s + r.amount, 0);
  const collected  = records.filter((r) => r.status === "Received").reduce((s, r) => s + r.amount, 0);
  const pending    = records.filter((r) => r.status === "Pending").reduce((s, r) => s + r.amount, 0);
  const partial    = records.filter((r) => r.status === "Partial").reduce((s, r) => s + r.amount, 0);

  // Mini bar chart data (last 6 weeks, dummy buckets)
  const barData = [38000, 52000, 47000, 61000, 55000, totalMTD > 0 ? totalMTD / 7 : 42000].map((v) =>
    Math.round(v)
  );
  const barMax = Math.max(...barData);

  function handleSave(newRev) {
    setRecords((prev) => [newRev, ...prev]);
    setShowPanel(false);
    setToast(`Revenue of ${fmt(newRev.amount)} recorded successfully.`);
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-6">
      {/* ── Toast ── */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl flex items-center gap-2.5 animate-fade-in">
          <CheckCircle size={15} className="text-green-400" />
          {toast}
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track and record all incoming revenue</p>
        </div>
        <button
          onClick={() => setShowPanel(true)}
          className="flex items-center gap-2 bg-green-500 text-white rounded-md px-4 py-2 hover:bg-green-600 transition-colors font-medium text-sm"
        >
          <Plus size={15} />
          Record Revenue
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          {
            label:  "Total MTD",
            value:  fmt(totalMTD),
            icon:   TrendingUp,
            color:  "text-green-600",
            bg:     "bg-green-50",
            badge:  `${records.length} entries`,
          },
          {
            label:  "Collected",
            value:  fmt(collected),
            icon:   CheckCircle,
            color:  "text-emerald-600",
            bg:     "bg-emerald-50",
            badge:  `${records.filter((r) => r.status === "Received").length} records`,
          },
          {
            label:  "Pending",
            value:  fmt(pending),
            icon:   Clock,
            color:  "text-amber-600",
            bg:     "bg-amber-50",
            badge:  `${records.filter((r) => r.status === "Pending").length} records`,
          },
          {
            label:  "Partial",
            value:  fmt(partial),
            icon:   DollarSign,
            color:  "text-blue-600",
            bg:     "bg-blue-50",
            badge:  `${records.filter((r) => r.status === "Partial").length} records`,
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <div className={`${stat.bg} p-2 rounded-lg`}>
                <stat.icon size={16} className={stat.color} />
              </div>
            </div>
            <p className="text-xl font-bold text-gray-900 mb-1">{stat.value}</p>
            <p className="text-xs text-gray-400">{stat.badge}</p>
          </div>
        ))}
      </div>

      {/* ── Trend + Category Split ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Mini trend chart */}
        <div className="col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">Revenue Trend</p>
              <p className="text-xs text-gray-400">Last 6 weeks</p>
            </div>
            <div className="flex items-center gap-1 text-green-600 text-xs font-semibold">
              <ArrowUpRight size={14} />
              +12.4% vs prior period
            </div>
          </div>
          <div className="flex items-end gap-2 h-20">
            {barData.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t-sm transition-all ${
                    i === barData.length - 1 ? "bg-green-500" : "bg-green-200"
                  }`}
                  style={{ height: `${Math.round((v / barMax) * 68)}px` }}
                />
                <span className="text-[10px] text-gray-400">
                  {["W1", "W2", "W3", "W4", "W5", "W6"][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
          <p className="text-sm font-semibold text-gray-900 mb-4">By Category</p>
          <div className="space-y-2.5">
            {REVENUE_CATS.slice(0, 5).map((cat) => {
              const catTotal = records
                .filter((r) => r.category === cat.label)
                .reduce((s, r) => s + r.amount, 0);
              const pct = totalMTD > 0 ? Math.round((catTotal / totalMTD) * 100) : 0;
              if (catTotal === 0) return null;
              return (
                <div key={cat.id}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-gray-600 flex items-center gap-1">
                      <span>{cat.emoji}</span> {cat.label}
                    </span>
                    <span className="text-xs font-semibold text-gray-700">{pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-green-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Revenue Table ── */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* Table header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <h2 className="text-base font-semibold text-gray-900">Revenue Records</h2>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md px-3 py-1.5 transition-colors">
              <ChevronDown size={14} />
              Export
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex border-b border-gray-200 px-6 mt-4">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`mr-5 pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-green-500 text-green-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
              {tab !== "All" && (
                <span className="ml-1.5 text-xs text-gray-400">
                  ({records.filter((r) => r.status === tab).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {["Payer / Source", "Ref #", "Category", "Method", "Date", "Amount", "Status", ""].map(
                  (h) => (
                    <th
                      key={h}
                      className={`text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 ${
                        h === "Amount" ? "text-right px-3" : "text-left px-3 first:px-6"
                      }`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((rev, i) => {
                const MethodIcon = methodIcons[rev.method] || Banknote;
                const cat = REVENUE_CATS.find((c) => c.label === rev.category);
                return (
                  <tr
                    key={rev.id}
                    className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                      i % 2 !== 0 ? "bg-gray-50/30" : ""
                    }`}
                  >
                    {/* Payer */}
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-green-100 rounded-md flex items-center justify-center shrink-0">
                          <span className="text-sm leading-none">{cat?.emoji ?? "💰"}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{rev.payer}</p>
                          {rev.note && (
                            <p className="text-xs text-gray-400 truncate">{rev.note}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Ref */}
                    <td className="px-3 py-3.5">
                      <span className="text-xs text-gray-400 font-mono">{rev.refNo}</span>
                    </td>

                    {/* Category */}
                    <td className="px-3 py-3.5">
                      <span className="text-xs text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">
                        {rev.category}
                      </span>
                    </td>

                    {/* Method */}
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <MethodIcon size={12} className="text-gray-400" />
                        {rev.method}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-3 py-3.5">
                      <span className="text-sm text-gray-600">{rev.date}</span>
                    </td>

                    {/* Amount */}
                    <td className="px-3 py-3.5 text-right">
                      <span className="text-sm font-bold text-green-700">{fmt(rev.amount)}</span>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-3.5">
                      <StatusPill status={rev.status} />
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-3.5">
                      <button className="text-gray-300 hover:text-gray-600 p-1 rounded transition-colors">
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Showing {filtered.length} of {records.length} records
          </p>
          <div className="flex gap-2">
            <button className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-md">
              Previous
            </button>
            <button className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-md">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ── Record Revenue Panel ── */}
      {showPanel && (
        <RecordPanel onClose={() => setShowPanel(false)} onSave={handleSave} />
      )}
    </div>
  );
}
