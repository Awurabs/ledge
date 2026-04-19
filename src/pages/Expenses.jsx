import { useState } from "react";
import {
  Search, Download, Plus, ChevronDown, ChevronUp,
  Receipt, AlertCircle, FileText, X, CheckCircle,
  Banknote, TrendingDown, Clock, BadgeCheck,
} from "lucide-react";
import { useExpenses, useCreateExpense, useUpdateExpense } from "../hooks/useExpenses";
import { useTransactionCategories } from "../hooks/useTransactions";
import { useAuth } from "../context/AuthContext";
import { fmt, fmtDate } from "../lib/fmt";

// ── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  approved:    { color: "bg-green-50 text-green-700",  label: "Approved"  },
  submitted:   { color: "bg-amber-50 text-amber-700",  label: "Submitted" },
  pending:     { color: "bg-gray-100 text-gray-600",   label: "Draft"     },
  draft:       { color: "bg-gray-100 text-gray-600",   label: "Draft"     },
  rejected:    { color: "bg-red-50 text-red-700",      label: "Rejected"  },
  reimbursed:  { color: "bg-blue-50 text-blue-700",    label: "Reimbursed"},
};

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

// ── New Expense Panel ──────────────────────────────────────────────────────────
function NewExpensePanel({ categories, currency, onClose, onCreate }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    merchant_name: "",
    amount: "",
    expense_date: today,
    category_id: "",
    description: "",
    is_reimbursable: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const expenseCats = categories.filter((c) => c.type === "expense");
  const amountMinor = Math.round((parseFloat(form.amount.replace(/,/g, "")) || 0) * 100);
  const canSave     = form.merchant_name.trim() && form.amount.trim() && form.expense_date;

  async function handleSubmit(submitForApproval) {
    if (!canSave) { setError("Please fill in merchant, amount and date."); return; }
    setError(""); setSaving(true);
    try {
      await onCreate({
        merchant_name:   form.merchant_name.trim(),
        amount:          amountMinor,
        expense_date:    form.expense_date,
        category_id:     form.category_id || null,
        description:     form.description.trim() || null,
        is_reimbursable: form.is_reimbursable,
        status:          submitForApproval ? "submitted" : "draft",
        ...(submitForApproval && { submitted_at: new Date().toISOString() }),
      });
      onClose();
    } catch (err) {
      setError(err.message ?? "Failed to save expense.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[420px] bg-white shadow-2xl flex flex-col z-50">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">New Expense</h2>
            <p className="text-xs text-gray-400 mt-0.5">Fill in the details below</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              <AlertCircle size={13} className="shrink-0" />{error}
            </div>
          )}

          {/* Merchant */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Merchant / Vendor <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.merchant_name}
              onChange={(e) => upd("merchant_name", e.target.value)}
              placeholder="e.g. Shell, Shoprite, Uber"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount ({currency === "GHS" ? "GH₵" : currency}) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Banknote size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => upd("amount", e.target.value)}
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-md pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              value={form.expense_date}
              onChange={(e) => upd("expense_date", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={form.category_id}
              onChange={(e) => upd("category_id", e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">— No category —</option>
              {expenseCats.map((c) => (
                <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description / Note</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => upd("description", e.target.value)}
              placeholder="What was this expense for?"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          {/* Reimbursable */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => upd("is_reimbursable", !form.is_reimbursable)}
              className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${
                form.is_reimbursable ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                form.is_reimbursable ? "translate-x-4" : "translate-x-0"
              }`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Reimbursable</p>
              <p className="text-xs text-gray-400">Eligible for expense reimbursement</p>
            </div>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={() => handleSubmit(false)}
            disabled={saving || !canSave}
            className="flex-1 border border-gray-300 text-gray-700 rounded-md py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save as Draft"}
          </button>
          <button
            onClick={() => handleSubmit(true)}
            disabled={saving || !canSave}
            className="flex-1 bg-green-500 text-white rounded-md py-2.5 text-sm font-semibold hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : <CheckCircle size={14} />}
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Expenses() {
  const { orgCurrency } = useAuth();
  const currency = orgCurrency ?? "GHS";

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter,   setStatusFilter]   = useState("all");
  const [search,         setSearch]         = useState("");
  const [expandedRow,    setExpandedRow]     = useState(null);
  const [showNewPanel,   setShowNewPanel]   = useState(false);
  const [toast,          setToast]          = useState(null);

  const queryFilters = {
    ...(statusFilter !== "all"   && { status: statusFilter }),
    ...(categoryFilter !== "all" && { categoryId: categoryFilter }),
    ...(search.trim()            && { search: search.trim() }),
  };

  const { data: expenses = [], isLoading } = useExpenses(queryFilters);
  const { data: categories = [] }          = useTransactionCategories();
  const updateMut  = useUpdateExpense();
  const createMut  = useCreateExpense();

  const expenseCats = categories.filter((c) => c.type === "expense");

  async function handleCreate(values) {
    await createMut.mutateAsync(values);
    setToast(`Expense "${values.merchant_name}" ${values.status === "submitted" ? "submitted for approval" : "saved as draft"}.`);
    setTimeout(() => setToast(null), 4000);
  }

  const total = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);

  const clearFilters = () => {
    setCategoryFilter("all");
    setStatusFilter("all");
    setSearch("");
  };

  const toggleRow = (id) => setExpandedRow((prev) => (prev === id ? null : id));

  const handleNoteChange = (id, description) => {
    updateMut.mutate({ id, description });
  };

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl flex items-center gap-2.5">
          <CheckCircle size={15} className="text-green-400 shrink-0" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track and manage all submitted expenses</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50">
            <Download size={15} />
            Export CSV
          </button>
          <button
            onClick={() => setShowNewPanel(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg shadow-sm hover:bg-green-600"
          >
            <Plus size={15} />
            New Expense
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      {(() => {
        const totalAll      = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);
        const totalApproved = expenses.filter((e) => e.status === "approved" || e.status === "reimbursed").reduce((s, e) => s + (e.amount ?? 0), 0);
        const totalPending  = expenses.filter((e) => e.status === "submitted").reduce((s, e) => s + (e.amount ?? 0), 0);
        const totalDraft    = expenses.filter((e) => e.status === "draft" || e.status === "pending").reduce((s, e) => s + (e.amount ?? 0), 0);
        const cards = [
          { label: "Total Expenses",  value: totalAll,      icon: TrendingDown, color: "text-red-600",    bg: "bg-red-50",    badge: `${expenses.length} entries`                                                          },
          { label: "Approved",        value: totalApproved, icon: BadgeCheck,   color: "text-green-600",  bg: "bg-green-50",  badge: `${expenses.filter((e) => e.status === "approved" || e.status === "reimbursed").length} expenses` },
          { label: "Pending Approval",value: totalPending,  icon: Clock,        color: "text-amber-600",  bg: "bg-amber-50",  badge: `${expenses.filter((e) => e.status === "submitted").length} submitted`                },
          { label: "Drafts",          value: totalDraft,    icon: FileText,     color: "text-gray-500",   bg: "bg-gray-100",  badge: `${expenses.filter((e) => e.status === "draft" || e.status === "pending").length} drafts` },
        ];
        return (
          <div className="grid grid-cols-4 gap-4 mb-5">
            {cards.map((c) => (
              <div key={c.label} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-gray-500">{c.label}</p>
                  <div className={`${c.bg} p-2 rounded-lg`}>
                    <c.icon size={16} className={c.color} />
                  </div>
                </div>
                {isLoading ? (
                  <Skeleton className="h-7 w-28 mb-1" />
                ) : (
                  <p className="text-xl font-bold text-gray-900 mb-1">{fmt(c.value, currency)}</p>
                )}
                <p className="text-xs text-gray-400">{c.badge}</p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Filter Bar */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          {/* Category filter */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-300 cursor-pointer"
            >
              <option value="all">All Categories</option>
              {expenseCats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-300 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search merchant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-300"
            />
          </div>

          {/* Clear */}
          <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
            <X size={13} />
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-900">{expenses.length}</span> expenses
          </span>
          <span className="text-sm text-gray-500">
            Total: <span className="font-semibold text-gray-900 tabular-nums">{fmt(total, currency)}</span>
          </span>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : expenses.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Search size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No expenses found</p>
            <button onClick={clearFilters} className="text-sm text-green-600 mt-1 hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {["Date", "Merchant", "Submitted By", "Category", "Amount", "Receipt", "Status", ""].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => {
                  const cat         = exp.transaction_categories;
                  const profile     = exp.organization_members?.profiles;
                  const hasReceipt  = (exp.expense_attachments?.length ?? 0) > 0;
                  const statusCfg   = STATUS_CONFIG[exp.status] ?? { color: "bg-gray-100 text-gray-600", label: exp.status ?? "—" };
                  const dept        = exp.departments?.name;
                  const initials    = getInitials(profile?.full_name);

                  return (
                    <>
                      <tr
                        key={exp.id}
                        onClick={() => toggleRow(exp.id)}
                        className={`border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${!hasReceipt ? "border-l-4 border-l-amber-400" : "border-l-4 border-l-transparent"}`}
                      >
                        <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                          {fmtDate(exp.expense_date)}
                        </td>
                        <td className="px-5 py-3.5 font-medium text-gray-900 whitespace-nowrap">
                          {exp.merchant_name ?? "—"}
                        </td>
                        <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-xs font-semibold text-green-700 shrink-0">
                              {initials}
                            </div>
                            <span className="truncate max-w-[120px]">{profile?.full_name ?? "—"}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-medium bg-gray-100 text-gray-700 rounded-full px-2.5 py-0.5">
                            {cat?.emoji} {cat?.name ?? "—"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                          {fmt(exp.amount, currency)}
                        </td>
                        <td className="px-5 py-3.5">
                          {hasReceipt ? (
                            <span className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
                              <Receipt size={13} /> Receipt
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-amber-600 text-xs font-medium">
                              <AlertCircle size={13} /> Missing
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`rounded-full text-xs px-2.5 py-0.5 font-medium ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            {expandedRow === exp.id
                              ? <ChevronUp size={14} className="text-gray-500" />
                              : <ChevronDown size={14} className="text-gray-500" />
                            }
                          </div>
                        </td>
                      </tr>

                      {/* Expanded detail */}
                      {expandedRow === exp.id && (
                        <tr key={`detail-${exp.id}`} className="bg-green-50/40">
                          <td colSpan={8} className="px-6 py-5 border-b border-gray-100">
                            <div className="grid grid-cols-3 gap-6">
                              {/* Submitter & details */}
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Expense Details</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Merchant</span>
                                    <span className="font-medium text-gray-900">{exp.merchant_name ?? "—"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Submitted by</span>
                                    <span className="font-medium text-gray-900">{profile?.full_name ?? "—"}</span>
                                  </div>
                                  {dept && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Department</span>
                                      <span className="font-medium text-gray-900">{dept}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Date</span>
                                    <span className="text-gray-700">{fmtDate(exp.expense_date)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">Amount</span>
                                    <span className="font-semibold text-gray-900">{fmt(exp.amount, currency)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Note */}
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Notes</h4>
                                <textarea
                                  rows={3}
                                  defaultValue={exp.description ?? ""}
                                  onClick={(e) => e.stopPropagation()}
                                  onBlur={(e) => {
                                    if (e.target.value !== (exp.description ?? "")) {
                                      handleNoteChange(exp.id, e.target.value);
                                    }
                                  }}
                                  placeholder="Add a note..."
                                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
                                />
                              </div>

                              {/* Actions */}
                              <div>
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Actions</h4>
                                <div className="space-y-2">
                                  <button
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                                  >
                                    <FileText size={14} />
                                    View Details
                                  </button>
                                  {exp.status === "submitted" && (
                                    <>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); updateMut.mutate({ id: exp.id, status: "approved" }); }}
                                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-green-500 rounded-lg hover:bg-green-600"
                                      >
                                        <CheckCircle size={14} />
                                        Approve
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); updateMut.mutate({ id: exp.id, status: "rejected" }); }}
                                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}
                                  {!hasReceipt && (
                                    <button
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100"
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
                  );
                })}

                {/* Totals row */}
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td colSpan={4} className="px-5 py-3.5 text-sm font-semibold text-gray-700">
                    Total ({expenses.length} expenses)
                  </td>
                  <td className="px-5 py-3.5 font-bold text-gray-900 tabular-nums text-sm">
                    {fmt(total, currency)}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNewPanel && (
        <NewExpensePanel
          categories={categories}
          currency={currency}
          onClose={() => setShowNewPanel(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
