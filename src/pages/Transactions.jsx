import { useState } from "react";
import { Search, X, CheckCircle, ChevronRight, ArrowDownLeft, ArrowUpRight } from "lucide-react";

const SOURCES = [
  { id: "all", label: "All Accounts" },
  { id: "ecobank", label: "Ecobank", color: "bg-blue-50 text-blue-700", dot: "bg-blue-600" },
  { id: "gcb", label: "GCB Bank", color: "bg-green-50 text-green-700", dot: "bg-green-600" },
  { id: "mtn", label: "MTN MoMo", color: "bg-yellow-50 text-yellow-800", dot: "bg-yellow-400" },
  { id: "telecel", label: "Telecel Money", color: "bg-red-50 text-red-700", dot: "bg-red-500" },
  { id: "airteltigo", label: "AirtelTigo Money", color: "bg-purple-50 text-purple-700", dot: "bg-purple-600" },
];

const SOURCE_MAP = Object.fromEntries(SOURCES.filter((s) => s.id !== "all").map((s) => [s.id, s]));

const EXPENSE_CATS = [
  { id: "salaries", emoji: "👥", label: "Salaries & Wages", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "rent", emoji: "🏢", label: "Rent & Utilities", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "supplies", emoji: "🛒", label: "Office Supplies", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { id: "marketing", emoji: "📣", label: "Marketing", color: "bg-pink-50 text-pink-700 border-pink-200" },
  { id: "transport", emoji: "🚗", label: "Transport", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { id: "meals", emoji: "🍽️", label: "Meals & Ent.", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "software", emoji: "💻", label: "Software & SaaS", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  { id: "other_exp", emoji: "📦", label: "Other Expense", color: "bg-gray-100 text-gray-700 border-gray-200" },
];

const REVENUE_CATS = [
  { id: "sales", emoji: "💰", label: "Sales Revenue", color: "bg-green-50 text-green-700 border-green-200" },
  { id: "services", emoji: "🤝", label: "Service Income", color: "bg-teal-50 text-teal-700 border-teal-200" },
  { id: "grants", emoji: "🏆", label: "Grants & Awards", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  { id: "interest", emoji: "🏦", label: "Interest Income", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "other_rev", emoji: "📥", label: "Other Revenue", color: "bg-gray-100 text-gray-700 border-gray-200" },
];

const INITIAL_TXN = [
  { id: 1, date: "Apr 14, 2026", description: "Client Payment — Kofi Agyei", source: "ecobank", type: "credit", amount: 12500, status: "pending", category: null, bookType: null, note: "" },
  { id: 2, date: "Apr 14, 2026", description: "MTN Airtime Bundle", source: "mtn", type: "debit", amount: 50, status: "pending", category: null, bookType: null, note: "" },
  { id: 3, date: "Apr 13, 2026", description: "Office Rent — April", source: "gcb", type: "debit", amount: 3200, status: "passed", category: "rent", bookType: "expense", note: "April HQ rent" },
  { id: 4, date: "Apr 13, 2026", description: "Sales Invoice #INV-0042", source: "ecobank", type: "credit", amount: 8750, status: "passed", category: "sales", bookType: "revenue", note: "" },
  { id: 5, date: "Apr 12, 2026", description: "Telecel Data — Staff Plans", source: "telecel", type: "debit", amount: 420, status: "pending", category: null, bookType: null, note: "" },
  { id: 6, date: "Apr 12, 2026", description: "Vendor Payment — Kwame Supplies", source: "gcb", type: "debit", amount: 1850, status: "passed", category: "supplies", bookType: "expense", note: "Q2 stationery" },
  { id: 7, date: "Apr 11, 2026", description: "MoMo Transfer from Ama Darko", source: "mtn", type: "credit", amount: 2000, status: "pending", category: null, bookType: null, note: "" },
  { id: 8, date: "Apr 11, 2026", description: "Bolt Rides — March", source: "airteltigo", type: "debit", amount: 310, status: "pending", category: null, bookType: null, note: "" },
  { id: 9, date: "Apr 10, 2026", description: "Google Workspace Annual", source: "ecobank", type: "debit", amount: 1440, status: "passed", category: "software", bookType: "expense", note: "" },
  { id: 10, date: "Apr 10, 2026", description: "Freelance Payment — Design Work", source: "gcb", type: "debit", amount: 900, status: "pending", category: null, bookType: null, note: "" },
  { id: 11, date: "Apr 9, 2026", description: "Grant Disbursement — GIZ", source: "gcb", type: "credit", amount: 25000, status: "passed", category: "grants", bookType: "revenue", note: "GIZ Q2 tranche" },
  { id: 12, date: "Apr 9, 2026", description: "Team Lunch — Product Review", source: "mtn", type: "debit", amount: 680, status: "pending", category: null, bookType: null, note: "" },
  { id: 13, date: "Apr 8, 2026", description: "AirtelTigo Business Plan", source: "airteltigo", type: "debit", amount: 200, status: "pending", category: null, bookType: null, note: "" },
  { id: 14, date: "Apr 8, 2026", description: "Consulting Fee — Abena Owusu", source: "ecobank", type: "credit", amount: 5500, status: "passed", category: "services", bookType: "revenue", note: "" },
  { id: 15, date: "Apr 7, 2026", description: "Fuel Reimbursement — Field Team", source: "gcb", type: "debit", amount: 760, status: "passed", category: "transport", bookType: "expense", note: "April field trips" },
];

function fmt(n) {
  return "GH₵ " + new Intl.NumberFormat("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function SourceBadge({ sourceId }) {
  const s = SOURCE_MAP[sourceId];
  if (!s) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function PassPanel({ txn, onClose, onConfirm }) {
  const [step, setStep] = useState(1); // 1: type, 2: category, 3: review
  const [bookType, setBookType] = useState(null);
  const [category, setCategory] = useState(null);
  const [note, setNote] = useState("");

  const cats = bookType === "revenue" ? REVENUE_CATS : EXPENSE_CATS;
  const selectedCat = cats.find((c) => c.id === category);

  const handleConfirm = () => {
    onConfirm({ bookType, category, note });
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30" onClick={onClose} />
      {/* Panel */}
      <div className="w-[420px] bg-white h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Step {step} of 3</p>
            <h2 className="text-base font-semibold text-gray-900 mt-0.5">
              {step === 1 && "What kind of transaction is this?"}
              {step === 2 && "Pick a category"}
              {step === 3 && "Review & confirm"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400">
            <X size={16} />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-2 px-6 pt-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${n <= step ? "bg-green-500" : "bg-gray-200"}`} />
          ))}
        </div>

        {/* Transaction chip */}
        <div className="mx-6 mt-4 mb-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{txn.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <SourceBadge sourceId={txn.source} />
                <span className="text-xs text-gray-400">{txn.date}</span>
              </div>
            </div>
            <div className="text-right ml-4 shrink-0">
              <p className={`text-sm font-bold tabular-nums ${txn.type === "credit" ? "text-green-600" : "text-gray-900"}`}>
                {txn.type === "credit" ? "+" : "-"}{fmt(txn.amount)}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 1 && (
            <div className="space-y-3">
              <button
                onClick={() => { setBookType("revenue"); setStep(2); }}
                className="w-full text-left p-4 rounded-xl border-2 border-transparent hover:border-green-400 bg-green-50 hover:bg-green-100 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-white shrink-0">
                    <ArrowDownLeft size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Revenue / Income</p>
                    <p className="text-xs text-gray-500 mt-0.5">Money coming into the business — sales, grants, fees</p>
                  </div>
                  <ChevronRight size={16} className="ml-auto text-gray-400 group-hover:text-green-600" />
                </div>
              </button>
              <button
                onClick={() => { setBookType("expense"); setStep(2); }}
                className="w-full text-left p-4 rounded-xl border-2 border-transparent hover:border-amber-400 bg-amber-50 hover:bg-amber-100 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shrink-0">
                    <ArrowUpRight size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Expense / Cost</p>
                    <p className="text-xs text-gray-500 mt-0.5">Money going out — rent, salaries, supplies, software</p>
                  </div>
                  <ChevronRight size={16} className="ml-auto text-gray-400 group-hover:text-amber-600" />
                </div>
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="grid grid-cols-2 gap-2">
                {cats.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => { setCategory(cat.id); setStep(3); }}
                    className={`p-3 rounded-xl border-2 text-left hover:opacity-90 transition-all ${cat.color} ${category === cat.id ? "ring-2 ring-offset-1 ring-green-400" : "border"}`}
                  >
                    <div className="text-2xl mb-1">{cat.emoji}</div>
                    <p className="text-xs font-semibold leading-tight">{cat.label}</p>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(1)} className="mt-4 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                ← Back
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Book as</span>
                  <span className={`font-semibold ${bookType === "revenue" ? "text-green-700" : "text-amber-700"}`}>
                    {bookType === "revenue" ? "Revenue" : "Expense"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Category</span>
                  <span className="font-semibold text-gray-900">
                    {selectedCat?.emoji} {selectedCat?.label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className={`font-bold tabular-nums ${txn.type === "credit" ? "text-green-600" : "text-gray-900"}`}>
                    {txn.type === "credit" ? "+" : "-"}{fmt(txn.amount)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Add a note (optional)</label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Q2 supplier payment, April office rent..."
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                />
              </div>

              <button onClick={() => setStep(2)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                ← Change category
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 3 && (
          <div className="px-6 py-4 border-t border-gray-100">
            <button
              onClick={handleConfirm}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
            >
              <CheckCircle size={16} />
              Pass to Books
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Transactions() {
  const [txns, setTxns] = useState(INITIAL_TXN);
  const [activeSource, setActiveSource] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // all | pending | passed
  const [search, setSearch] = useState("");
  const [panelTxn, setPanelTxn] = useState(null);
  const [toast, setToast] = useState(null);

  const pendingCount = txns.filter((t) => t.status === "pending").length;
  const passedCount = txns.filter((t) => t.status === "passed").length;

  const filtered = txns.filter((t) => {
    if (activeSource !== "all" && t.source !== activeSource) return false;
    if (statusFilter === "pending" && t.status !== "pending") return false;
    if (statusFilter === "passed" && t.status !== "passed") return false;
    if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handlePassConfirm = ({ bookType, category, note }) => {
    setTxns((prev) =>
      prev.map((t) =>
        t.id === panelTxn.id ? { ...t, status: "passed", bookType, category, note } : t
      )
    );
    setPanelTxn(null);
    const allCats = [...EXPENSE_CATS, ...REVENUE_CATS];
    const cat = allCats.find((c) => c.id === category);
    setToast(`✓ Passed to ${bookType === "revenue" ? "Revenue" : "Expenses"} as "${cat?.label}"`);
    setTimeout(() => setToast(null), 3500);
  };

  const getCatLabel = (t) => {
    if (!t.category) return null;
    const allCats = [...EXPENSE_CATS, ...REVENUE_CATS];
    return allCats.find((c) => c.id === t.category);
  };

  return (
    <div className="min-h-screen bg-[#F7F7F8]">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl flex items-center gap-2">
          <CheckCircle size={15} />
          {toast}
        </div>
      )}

      {/* Pass Panel */}
      {panelTxn && (
        <PassPanel txn={panelTxn} onClose={() => setPanelTxn(null)} onConfirm={handlePassConfirm} />
      )}

      <div className="p-6 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500 mt-0.5">Bank and mobile money activity — pass anything to your books</p>
        </div>

        {/* Stat badges */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
              statusFilter === "pending"
                ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                : "bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400"
            }`}
          >
            <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${statusFilter === "pending" ? "bg-amber-400 text-white" : "bg-amber-200 text-amber-800"}`}>
              {pendingCount}
            </span>
            Pending review
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === "passed" ? "all" : "passed")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
              statusFilter === "passed"
                ? "bg-green-500 text-white border-green-500 shadow-sm"
                : "bg-green-50 text-green-700 border-green-200 hover:border-green-400"
            }`}
          >
            <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${statusFilter === "passed" ? "bg-green-400 text-white" : "bg-green-200 text-green-800"}`}>
              {passedCount}
            </span>
            Passed to books
          </button>
          {statusFilter !== "all" && (
            <button onClick={() => setStatusFilter("all")} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 ml-1">
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {/* Source tabs + Search */}
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
            {SOURCES.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSource(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeSource === s.id
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                {s.dot && <span className={`w-2 h-2 rounded-full ${activeSource === s.id ? "bg-white/70" : s.dot}`} />}
                {s.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-400 shadow-sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Search size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No transactions found</p>
              <button
                onClick={() => { setActiveSource("all"); setStatusFilter("all"); setSearch(""); }}
                className="text-sm text-green-600 mt-1 hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((t) => {
                const isPending = t.status === "pending";
                const cat = getCatLabel(t);
                return (
                  <div
                    key={t.id}
                    className={`flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors border-l-[3px] ${
                      isPending ? "border-l-amber-400" : "border-l-green-400"
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${t.type === "credit" ? "bg-green-50" : "bg-gray-100"}`}>
                      {t.type === "credit" ? (
                        <ArrowDownLeft size={16} className="text-green-600" />
                      ) : (
                        <ArrowUpRight size={16} className="text-gray-500" />
                      )}
                    </div>

                    {/* Description + source */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{t.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <SourceBadge sourceId={t.source} />
                        <span className="text-xs text-gray-400">{t.date}</span>
                        {t.note && <span className="text-xs text-gray-400 italic truncate max-w-[140px]">"{t.note}"</span>}
                      </div>
                    </div>

                    {/* Category (if passed) */}
                    {cat && (
                      <div className="hidden md:block">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${cat.color}`}>
                          {cat.emoji} {cat.label}
                        </span>
                      </div>
                    )}

                    {/* Amount */}
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold tabular-nums ${t.type === "credit" ? "text-green-600" : "text-gray-900"}`}>
                        {t.type === "credit" ? "+" : "-"}{fmt(t.amount)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 capitalize">{t.type}</p>
                    </div>

                    {/* Action */}
                    <div className="shrink-0 ml-2">
                      {isPending ? (
                        <button
                          onClick={() => setPanelTxn(t)}
                          className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 hover:border-amber-400 text-xs font-semibold rounded-lg transition-all whitespace-nowrap"
                        >
                          Pass to Books
                        </button>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
                          <CheckCircle size={12} />
                          In Books
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
