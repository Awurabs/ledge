import { useState } from "react";
import { Search, X, CheckCircle, ChevronRight, ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react";
import { useTransactions, useUpdateTransaction, useTransactionCategories, useCreateTransaction } from "../hooks/useTransactions";
import { useBankAccounts } from "../hooks/useBankAccounts";
import { useAuth } from "../context/AuthContext";
import { fmt, fmtDate } from "../lib/fmt";

// ── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

// ── Account badge using real account color ──────────────────────────────────────
function AccountBadge({ account }) {
  if (!account) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: account.color ?? "#9CA3AF" }}
      />
      {account.name}
    </span>
  );
}

// ── PassPanel — 3-step categorisation wizard ────────────────────────────────────
function PassPanel({ txn, categories, currency, onClose, onConfirm }) {
  const [step, setStep]         = useState(1);
  const [bookType, setBookType] = useState(null);
  const [categoryId, setCategoryId] = useState(null);
  const [note, setNote]         = useState(txn.note ?? "");

  const cats       = (categories ?? []).filter((c) => c.type === bookType);
  const selectedCat = cats.find((c) => c.id === categoryId);

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
            <div
              key={n}
              className={`h-1 flex-1 rounded-full transition-colors ${n <= step ? "bg-green-500" : "bg-gray-200"}`}
            />
          ))}
        </div>

        {/* Transaction chip */}
        <div className="mx-6 mt-4 mb-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{txn.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <AccountBadge account={txn.bank_accounts} />
                <span className="text-xs text-gray-400">{fmtDate(txn.txn_date)}</span>
              </div>
            </div>
            <div className="text-right ml-4 shrink-0">
              <p className={`text-sm font-bold tabular-nums ${txn.direction === "credit" ? "text-green-600" : "text-gray-900"}`}>
                {txn.direction === "credit" ? "+" : "-"}{fmt(txn.amount, currency)}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Step 1 — Revenue or Expense */}
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

          {/* Step 2 — Category picker */}
          {step === 2 && (
            <div>
              {cats.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  No {bookType} categories found
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {cats.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => { setCategoryId(cat.id); setStep(3); }}
                      className={`p-3 rounded-xl border-2 text-left hover:opacity-90 transition-all bg-gray-50 ${
                        categoryId === cat.id
                          ? "border-green-400 ring-2 ring-offset-1 ring-green-400"
                          : "border-gray-200 hover:border-green-300"
                      }`}
                    >
                      <div className="text-2xl mb-1">{cat.emoji ?? "📦"}</div>
                      <p className="text-xs font-semibold leading-tight text-gray-800">{cat.name}</p>
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => setStep(1)}
                className="mt-4 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                ← Back
              </button>
            </div>
          )}

          {/* Step 3 — Review */}
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
                    {selectedCat?.emoji ?? "📦"} {selectedCat?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className={`font-bold tabular-nums ${txn.direction === "credit" ? "text-green-600" : "text-gray-900"}`}>
                    {txn.direction === "credit" ? "+" : "-"}{fmt(txn.amount, currency)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Add a note (optional)
                </label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Q2 supplier payment, April office rent..."
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                />
              </div>

              <button
                onClick={() => setStep(2)}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                ← Change category
              </button>
            </div>
          )}
        </div>

        {/* Footer confirm button */}
        {step === 3 && (
          <div className="px-6 py-4 border-t border-gray-100">
            <button
              onClick={() => onConfirm({ categoryId, bookType, note })}
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

// ── Add Transaction Modal ─────────────────────────────────────────────────────
function AddTransactionModal({ onClose, bankAccounts, categories, currency }) {
  const createMut = useCreateTransaction();
  const currencySymbol = currency === "USD" ? "$" : currency === "GBP" ? "£" : "₵";
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    description: "",
    amount:      "",
    direction:   "debit",
    txn_date:    today,
    bankAccountId: bankAccounts[0]?.id ?? "",
    categoryId:    "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMut.mutate(
      {
        description:     form.description,
        amount:          Math.round(parseFloat(form.amount || "0") * 100),
        direction:       form.direction,
        txn_date:        form.txn_date,
        bank_account_id: form.bankAccountId || null,
        category_id:     form.categoryId || null,
        status:          "pending",
      },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
        <h2 className="text-base font-semibold text-gray-900 mb-5">Add Transaction</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-400">*</span>
            </label>
            <input
              required
              type="text"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="e.g. Office supplies, Client payment…"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Amount + Direction */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  {currencySymbol}
                </span>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-200 rounded-md pl-7 pr-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-green-300"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <div className="flex gap-1 border border-gray-200 rounded-md overflow-hidden text-sm">
                {[
                  { value: "debit",  label: "Expense" },
                  { value: "credit", label: "Income"  },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, direction: opt.value }))}
                    className={`flex-1 py-2 text-xs font-medium transition-colors ${
                      form.direction === opt.value
                        ? opt.value === "credit"
                          ? "bg-green-500 text-white"
                          : "bg-gray-800 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              value={form.txn_date}
              onChange={(e) => setForm((f) => ({ ...f, txn_date: e.target.value }))}
            />
          </div>

          {/* Bank Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account</label>
            <select
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
              value={form.bankAccountId}
              onChange={(e) => setForm((f) => ({ ...f, bankAccountId: e.target.value }))}
            >
              <option value="">No account selected</option>
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category (optional)</label>
            <select
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji ? `${c.emoji} ` : ""}{c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={createMut.isPending}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50"
            >
              {createMut.isPending ? "Adding…" : "Add Transaction"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium px-4 py-2 rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────────
export default function Transactions() {
  const { orgCurrency } = useAuth();
  const currency = orgCurrency ?? "GHS";

  const [activeSource,  setActiveSource]  = useState("all"); // "all" | bank_account UUID
  const [statusFilter,  setStatusFilter]  = useState("all"); // all | pending | categorized
  const [search,        setSearch]        = useState("");
  const [panelTxn,      setPanelTxn]      = useState(null);
  const [toast,         setToast]         = useState(null);
  const [showAddModal,  setShowAddModal]  = useState(false);

  // Build query filters for the hook
  const queryFilters = {
    ...(activeSource !== "all"   && { bankId: activeSource }),
    ...(statusFilter !== "all"   && { status: statusFilter }),
    ...(search.trim()            && { search: search.trim() }),
    limit: 150,
  };

  const { data: txns = [],        isLoading }  = useTransactions(queryFilters);
  const { data: bankAccounts = [] }             = useBankAccounts();
  const { data: categories = [] }               = useTransactionCategories();
  const updateMut = useUpdateTransaction();

  const pendingCount    = txns.filter((t) => t.status === "pending").length;
  const categorizedCount = txns.filter((t) => t.status === "categorized").length;

  const handlePassConfirm = ({ categoryId, bookType, note }) => {
    updateMut.mutate({
      id:          panelTxn.id,
      category_id: categoryId,
      type:        bookType,       // expense | revenue
      status:      "categorized",
      note,
    });
    const cat = categories.find((c) => c.id === categoryId);
    setToast(`✓ Passed to ${bookType === "revenue" ? "Revenue" : "Expenses"} as "${cat?.name ?? ""}"`);
    setTimeout(() => setToast(null), 3500);
    setPanelTxn(null);
  };

  // Source tabs: "All Accounts" + real bank accounts
  const sourceTabs = [{ id: "all", name: "All Accounts", color: null }, ...bankAccounts];

  return (
    <div className="min-h-screen bg-[#F7F7F8]">
      {/* ── Toast ── */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl flex items-center gap-2">
          <CheckCircle size={15} />
          {toast}
        </div>
      )}

      {/* ── PassPanel ── */}
      {panelTxn && (
        <PassPanel
          txn={panelTxn}
          categories={categories}
          currency={currency}
          onClose={() => setPanelTxn(null)}
          onConfirm={handlePassConfirm}
        />
      )}

      {/* ── Add Transaction Modal ── */}
      {showAddModal && (
        <AddTransactionModal
          onClose={() => setShowAddModal(false)}
          bankAccounts={bankAccounts}
          categories={categories}
          currency={currency}
        />
      )}

      <div className="p-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Bank and mobile money activity — pass anything to your books
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-xl shadow-sm transition-colors shrink-0 mt-1"
          >
            <Plus size={15} />
            Add Transaction
          </button>
        </div>

        {/* Stat filter badges */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
              statusFilter === "pending"
                ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                : "bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400"
            }`}
          >
            <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
              statusFilter === "pending" ? "bg-amber-400 text-white" : "bg-amber-200 text-amber-800"
            }`}>
              {isLoading ? "…" : pendingCount}
            </span>
            Pending review
          </button>

          <button
            onClick={() => setStatusFilter(statusFilter === "categorized" ? "all" : "categorized")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
              statusFilter === "categorized"
                ? "bg-green-500 text-white border-green-500 shadow-sm"
                : "bg-green-50 text-green-700 border-green-200 hover:border-green-400"
            }`}
          >
            <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
              statusFilter === "categorized" ? "bg-green-400 text-white" : "bg-green-200 text-green-800"
            }`}>
              {isLoading ? "…" : categorizedCount}
            </span>
            Passed to books
          </button>

          {statusFilter !== "all" && (
            <button
              onClick={() => setStatusFilter("all")}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 ml-1"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {/* Source tabs + Search */}
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm overflow-x-auto max-w-full">
            {sourceTabs.map((acc) => (
              <button
                key={acc.id}
                onClick={() => setActiveSource(acc.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeSource === acc.id
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                {acc.color && (
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: activeSource === acc.id ? "rgba(255,255,255,0.6)" : acc.color }}
                  />
                )}
                {acc.name}
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
          <div className="px-6 py-3 border-b border-gray-100">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
              {isLoading ? "Loading…" : `${txns.length} transaction${txns.length !== 1 ? "s" : ""}`}
            </span>
          </div>

          {/* Loading skeletons */}
          {isLoading ? (
            <div className="divide-y divide-gray-100">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-24 rounded-lg" />
                </div>
              ))}
            </div>
          ) : txns.length === 0 ? (
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
              {txns.map((t) => {
                const isPending = t.status === "pending";
                const cat       = t.transaction_categories;
                return (
                  <div
                    key={t.id}
                    className={`flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors border-l-[3px] ${
                      isPending ? "border-l-amber-400" : "border-l-green-400"
                    }`}
                  >
                    {/* Direction icon */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      t.direction === "credit" ? "bg-green-50" : "bg-gray-100"
                    }`}>
                      {t.direction === "credit"
                        ? <ArrowDownLeft size={16} className="text-green-600" />
                        : <ArrowUpRight  size={16} className="text-gray-500" />
                      }
                    </div>

                    {/* Description + account badge */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{t.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <AccountBadge account={t.bank_accounts} />
                        <span className="text-xs text-gray-400">{fmtDate(t.txn_date)}</span>
                        {t.note && (
                          <span className="text-xs text-gray-400 italic truncate max-w-[140px]">
                            "{t.note}"
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Category badge (after passing to books) */}
                    {cat && (
                      <div className="hidden md:block shrink-0">
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-700">
                          {cat.emoji ?? "📦"} {cat.name}
                        </span>
                      </div>
                    )}

                    {/* Amount */}
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold tabular-nums ${t.direction === "credit" ? "text-green-600" : "text-gray-900"}`}>
                        {t.direction === "credit" ? "+" : "-"}{fmt(t.amount, currency)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 capitalize">{t.direction}</p>
                    </div>

                    {/* Action button */}
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
