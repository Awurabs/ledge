import { useState } from "react";
import { Upload, FileText, X, Eye } from "lucide-react";
import {
  useReimbursements, useUpdateReimbursement, useCreateReimbursement,
} from "../hooks/useReimbursements";
import { useTransactionCategories } from "../hooks/useTransactions";
import { useAuth } from "../context/AuthContext";
import { fmt, fmtDate } from "../lib/fmt";

// ── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:      { bg: "bg-amber-100",  text: "text-amber-700",  label: "Pending"      },
  approved:     { bg: "bg-green-100",  text: "text-green-700",  label: "Approved"     },
  rejected:     { bg: "bg-red-100",    text: "text-red-700",    label: "Declined"     },
  under_review: { bg: "bg-blue-100",   text: "text-blue-700",   label: "Under Review" },
  paid:         { bg: "bg-green-100",  text: "text-green-700",  label: "Paid"         },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status?.toLowerCase()] ?? {
    bg: "bg-gray-100", text: "text-gray-600", label: status ?? "—",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

// ── Avatar helpers ─────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-purple-100 text-purple-700", "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",   "bg-orange-100 text-orange-700",
  "bg-teal-100 text-teal-700",     "bg-red-100 text-red-700",
  "bg-indigo-100 text-indigo-700", "bg-pink-100 text-pink-700",
  "bg-yellow-100 text-yellow-700", "bg-cyan-100 text-cyan-700",
];

function avatarColor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initials(name = "") {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

// Total across all line items (minor units)
function totalAmount(req) {
  return (req.reimbursement_items ?? []).reduce((s, i) => s + (i.amount ?? 0), 0);
}

const TABS = ["all", "pending", "approved", "rejected"];

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Reimbursements() {
  const { orgCurrency } = useAuth();
  const currency = orgCurrency ?? "GHS";

  const [activeTab,  setActiveTab]  = useState("all");
  const [showModal,  setShowModal]  = useState(false);
  const [form, setForm] = useState({
    category: "", description: "", amount: "", date: "", notes: "",
  });

  const filters = activeTab !== "all" ? { status: activeTab } : {};
  const { data: requests = [], isLoading } = useReimbursements(filters);
  const { data: allReqs  = [] }            = useReimbursements({});
  const { data: categories = [] }          = useTransactionCategories();
  const updateMut = useUpdateReimbursement();
  const createMut = useCreateReimbursement();

  const pendingReqs  = allReqs.filter(r => r.status === "pending");
  const approvedReqs = allReqs.filter(r => r.status === "approved" || r.status === "paid");
  const pendingTotal  = pendingReqs.reduce((s, r) => s + totalAmount(r), 0);
  const approvedTotal = approvedReqs.reduce((s, r) => s + totalAmount(r), 0);

  function handleApprove(id) { updateMut.mutate({ id, status: "approved" }); }
  function handleReject(id)  { updateMut.mutate({ id, status: "rejected" }); }

  function handleSubmit() {
    const amountMinor = Math.round(parseFloat(form.amount || 0) * 100);
    createMut.mutate(
      {
        request: { title: form.description, notes: form.notes, status: "pending" },
        items: [{
          description:   form.description,
          merchant_name: "",
          amount:        amountMinor,
          expense_date:  form.date || new Date().toISOString().slice(0, 10),
          category_id:   form.category || null,
        }],
      },
      {
        onSuccess: () => {
          setShowModal(false);
          setForm({ category: "", description: "", amount: "", date: "", notes: "" });
        },
      },
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reimbursements</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track and manage employee expense submissions</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-green-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-600 flex items-center gap-2"
        >
          <Upload size={15} />
          Submit Expense
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-sm text-gray-500">Pending Review</p>
          {isLoading
            ? <Skeleton className="h-7 w-28 mt-1" />
            : <p className="text-xl font-bold text-amber-600 tabular-nums mt-1">{fmt(pendingTotal, currency)}</p>}
          <p className="text-xs text-gray-400 mt-0.5">
            {pendingReqs.length} submission{pendingReqs.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-sm text-gray-500">Approved This Month</p>
          {isLoading
            ? <Skeleton className="h-7 w-28 mt-1" />
            : <p className="text-xl font-bold text-green-600 tabular-nums mt-1">{fmt(approvedTotal, currency)}</p>}
          <p className="text-xs text-gray-400 mt-0.5">
            {approvedReqs.length} submission{approvedReqs.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-sm text-gray-500">Total Requests</p>
          {isLoading
            ? <Skeleton className="h-7 w-28 mt-1" />
            : <p className="text-xl font-bold text-gray-900 tabular-nums mt-1">{allReqs.length}</p>}
          <p className="text-xs text-gray-400 mt-0.5">all time</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <h2 className="text-base font-semibold text-gray-900">Employee Expense Submissions</h2>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 mt-4">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`mr-5 pb-3 text-sm font-medium border-b-2 capitalize transition-colors ${
                activeTab === tab
                  ? "border-green-500 text-green-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "all" ? "All" : (STATUS_CONFIG[tab]?.label ?? tab)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <FileText size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No reimbursement requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Employee", "Description", "Amount", "Date Submitted", "Receipt", "Status", "Action"].map(h => (
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
                {requests.map((req, i) => {
                  const name       = req.organization_members?.profiles?.full_name ?? "Unknown";
                  const color      = avatarColor(name);
                  const total      = totalAmount(req);
                  const status     = req.status ?? "pending";
                  const isPending  = status === "pending";
                  const hasReceipt = !!req.receipt_url;
                  return (
                    <tr
                      key={req.id}
                      className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i % 2 !== 0 ? "bg-gray-50/30" : ""}`}
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${color}`}>
                            {initials(name)}
                          </div>
                          <span className="font-medium text-gray-900 truncate max-w-[120px]">{name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-gray-600 max-w-[180px] truncate">
                        {req.title ?? req.reimbursement_items?.[0]?.description ?? "—"}
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <span className="text-sm font-bold text-gray-900">{fmt(total, currency)}</span>
                      </td>
                      <td className="px-3 py-3.5 text-gray-500 text-sm">{fmtDate(req.created_at)}</td>
                      <td className="px-3 py-3.5">
                        {hasReceipt ? (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <div className="w-6 h-7 bg-gray-100 rounded flex items-center justify-center">
                              <FileText size={12} className="text-gray-500" />
                            </div>
                            <span className="text-xs">receipt</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            Missing
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-3 py-3.5">
                        {isPending && !hasReceipt ? (
                          <button className="text-xs text-amber-600 hover:text-amber-700 font-medium">
                            Request Receipt
                          </button>
                        ) : isPending ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(req.id)}
                              disabled={updateMut.isPending}
                              className="text-xs text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(req.id)}
                              disabled={updateMut.isPending}
                              className="text-xs text-red-500 hover:text-red-600 font-medium disabled:opacity-50"
                            >
                              Decline
                            </button>
                          </div>
                        ) : (
                          <button className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                            <Eye size={12} /> View
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-6 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-400">
            {requests.length} request{requests.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Submit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Submit Expense</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                >
                  <option value="">Select category</option>
                  {categories.filter(c => c.type === "expense").map(c => (
                    <option key={c.id} value={c.id}>
                      {c.emoji ? `${c.emoji} ` : ""}{c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="What was this expense for?"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount ({currency})</label>
                  <input
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    type="number"
                    placeholder="0.00"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    type="date"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Receipt</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 cursor-pointer transition-colors">
                  <Upload size={20} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">
                    Drop file here or <span className="text-green-600 font-medium">browse</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF up to 10MB</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Any additional context..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-white text-gray-700 border border-gray-300 rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={createMut.isPending || !form.description || !form.amount}
                className="flex-1 bg-green-500 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-green-600 disabled:opacity-50"
              >
                {createMut.isPending ? "Submitting…" : "Submit for Approval"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
