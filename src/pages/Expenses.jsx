import { useState } from "react";
import {
  Search, Download, Plus, ChevronDown, ChevronUp,
  Receipt, AlertCircle, FileText, X, CheckCircle,
} from "lucide-react";
import { useExpenses, useUpdateExpense } from "../hooks/useExpenses";
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

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Expenses() {
  const { orgCurrency } = useAuth();
  const currency = orgCurrency ?? "GHS";

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter,   setStatusFilter]   = useState("all");
  const [search,         setSearch]         = useState("");
  const [expandedRow,    setExpandedRow]     = useState(null);

  const queryFilters = {
    ...(statusFilter !== "all"   && { status: statusFilter }),
    ...(categoryFilter !== "all" && { categoryId: categoryFilter }),
    ...(search.trim()            && { search: search.trim() }),
  };

  const { data: expenses = [], isLoading } = useExpenses(queryFilters);
  const { data: categories = [] }          = useTransactionCategories();
  const updateMut = useUpdateExpense();

  const expenseCats = categories.filter((c) => c.type === "expense");

  const total = expenses.reduce((s, e) => s + (e.amount ?? 0), 0);

  const clearFilters = () => {
    setCategoryFilter("all");
    setStatusFilter("all");
    setSearch("");
  };

  const toggleRow = (id) => setExpandedRow((prev) => (prev === id ? null : id));

  const handleNoteChange = (id, note) => {
    updateMut.mutate({ id, note });
  };

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-6">
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
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg shadow-sm hover:bg-green-600">
            <Plus size={15} />
            New Expense
          </button>
        </div>
      </div>

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
                                  defaultValue={exp.note ?? ""}
                                  onClick={(e) => e.stopPropagation()}
                                  onBlur={(e) => {
                                    if (e.target.value !== (exp.note ?? "")) {
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
    </div>
  );
}
