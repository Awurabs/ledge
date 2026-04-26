import { useState, useRef, useEffect } from "react";
import {
  Upload, FileText, X, Eye, CheckCircle, XCircle,
  CreditCard, Paperclip, AlertCircle, ExternalLink,
  Pencil, Trash2,
} from "lucide-react";
import {
  useReimbursements,
  useCreateReimbursement,
  useUpdateReimbursement,
  useApproveReimbursement,
  useDeclineReimbursement,
  useMarkReimbursementPaid,
  useDeleteReimbursement,
  getReceiptUrl,
} from "../hooks/useReimbursements";
import { useTransactionCategories } from "../hooks/useTransactions";
import { useAuth } from "../context/AuthContext";
import { fmt, fmtDate } from "../lib/fmt";

// ── Helpers ────────────────────────────────────────────────────────────────────
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

// DB status enum: draft | submitted | approved | paid | rejected
const STATUS_CONFIG = {
  draft:     { bg: "bg-gray-100",   text: "text-gray-500",   label: "Draft"          },
  submitted: { bg: "bg-amber-100",  text: "text-amber-700",  label: "Pending Review" },
  approved:  { bg: "bg-blue-100",   text: "text-blue-700",   label: "Approved"       },
  paid:      { bg: "bg-green-100",  text: "text-green-700",  label: "Paid"           },
  rejected:  { bg: "bg-red-100",    text: "text-red-700",    label: "Declined"       },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { bg: "bg-gray-100", text: "text-gray-500", label: status ?? "—" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

const AVATAR_COLORS = [
  "bg-purple-100 text-purple-700", "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",   "bg-orange-100 text-orange-700",
  "bg-teal-100 text-teal-700",     "bg-red-100 text-red-700",
  "bg-indigo-100 text-indigo-700", "bg-pink-100 text-pink-700",
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

function totalAmount(req) {
  return (req.reimbursement_items ?? []).reduce((s, i) => s + (i.amount ?? 0), 0);
}

// ── Submit Expense Modal ───────────────────────────────────────────────────────
function SubmitModal({ onClose, currency }) {
  const { data: categories = [] } = useTransactionCategories();
  const createMut = useCreateReimbursement();
  const fileInputRef = useRef(null);

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm]           = useState({ category: "", description: "", amount: "", date: today, notes: "" });
  const [receiptFile, setReceiptFile] = useState(null);
  const [dragOver, setDragOver]   = useState(false);
  const [error, setError]         = useState("");

  function pickFile(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError("File must be under 10 MB."); return; }
    setReceiptFile(file);
    setError("");
  }

  async function handleSubmit() {
    setError("");
    if (!form.description.trim()) { setError("Please enter a description."); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { setError("Please enter a valid amount."); return; }
    if (!form.date) { setError("Please select the expense date."); return; }

    try {
      await createMut.mutateAsync({
        request: { title: form.description.trim(), notes: form.notes || null },
        items: [{
          description:   form.description.trim(),
          merchant_name: "",
          amount:        Math.round(parseFloat(form.amount) * 100),
          expense_date:  form.date,
          category_id:   form.category || null,
        }],
        receiptFile: receiptFile ?? null,
      });
      onClose();
    } catch (err) {
      console.error("Submit reimbursement error:", err);
      setError(err?.message ?? "Submission failed. Please try again.");
    }
  }

  const expenseCategories = categories.filter(c => c.type === "expense");

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Submit Expense</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {error && (
          <div className="flex items-center gap-2 mb-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            <AlertCircle size={13} className="shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              <option value="">Select category</option>
              {expenseCategories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.emoji ? `${c.emoji} ` : ""}{c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-400">*</span>
            </label>
            <input
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What was this expense for?"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount ({currency}) <span className="text-red-400">*</span>
              </label>
              <input
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 tabular-nums"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date <span className="text-red-400">*</span>
              </label>
              <input
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                type="date"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Receipt upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Receipt</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={e => pickFile(e.target.files?.[0])}
            />
            {receiptFile ? (
              <div className="flex items-center gap-2 border border-green-200 bg-green-50 rounded-lg px-3 py-2.5">
                <Paperclip size={14} className="text-green-600 shrink-0" />
                <span className="text-sm text-green-700 truncate flex-1">{receiptFile.name}</span>
                <button
                  type="button"
                  onClick={() => setReceiptFile(null)}
                  className="text-green-500 hover:text-green-700 shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0]); }}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  dragOver ? "border-green-400 bg-green-50" : "border-gray-300 hover:border-green-400"
                }`}
              >
                <Upload size={20} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">
                  Drop file here or <span className="text-green-600 font-medium">browse</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF up to 10 MB</p>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Any additional context…"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-white text-gray-700 border border-gray-300 rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={createMut.isPending}
            className="flex-1 bg-green-500 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-green-600 disabled:opacity-50"
          >
            {createMut.isPending ? "Submitting…" : "Submit for Approval"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Decline Modal ──────────────────────────────────────────────────────────────
function DeclineModal({ request, onClose }) {
  const declineMut = useDeclineReimbursement();
  const [reason, setReason] = useState("");
  const [error, setError]   = useState("");

  async function handleDecline() {
    setError("");
    try {
      await declineMut.mutateAsync({ id: request.id, reason: reason.trim() || null });
      onClose();
    } catch (err) {
      setError(err?.message ?? "Failed to decline. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Decline Request</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          You're declining <span className="font-medium text-gray-900">{request.title}</span>.
          Optionally provide a reason so the employee knows what to fix.
        </p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          placeholder="Reason for declining (optional)…"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-400 resize-none"
        />
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleDecline}
            disabled={declineMut.isPending}
            className="flex-1 bg-red-500 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-red-600 disabled:opacity-50"
          >
            {declineMut.isPending ? "Declining…" : "Decline"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mark as Paid Modal ─────────────────────────────────────────────────────────
function MarkPaidModal({ request, onClose, currency }) {
  const paidMut  = useMarkReimbursementPaid();
  const [form, setForm] = useState({ method: "", reference: "" });
  const [error, setError] = useState("");

  const METHODS = [
    { value: "bank_transfer",  label: "Bank Transfer"  },
    { value: "cash",           label: "Cash"           },
    { value: "mobile_money",   label: "Mobile Money"   },
    { value: "cheque",         label: "Cheque"         },
    { value: "other",          label: "Other"          },
  ];

  async function handlePay() {
    setError("");
    if (!form.method) { setError("Please select a payment method."); return; }
    try {
      await paidMut.mutateAsync({
        id:               request.id,
        paymentMethod:    form.method,
        paymentReference: form.reference.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err?.message ?? "Failed to record payment. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Record Payment</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="bg-green-50 rounded-lg px-4 py-3 mb-4">
          <p className="text-xs text-green-600 font-medium">Amount to reimburse</p>
          <p className="text-xl font-bold text-green-700 tabular-nums">
            {fmt(totalAmount(request), currency)}
          </p>
          <p className="text-xs text-green-500 mt-0.5">{request.title}</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method <span className="text-red-400">*</span>
            </label>
            <select
              value={form.method}
              onChange={e => setForm(f => ({ ...f, method: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
            >
              <option value="">Select method…</option>
              {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference / Transaction ID (optional)</label>
            <input
              value={form.reference}
              onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
              placeholder="e.g. TXN-001234"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
        </div>
        {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handlePay}
            disabled={paidMut.isPending}
            className="flex-1 bg-green-500 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-green-600 disabled:opacity-50"
          >
            {paidMut.isPending ? "Saving…" : "Mark as Paid"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── View Modal ─────────────────────────────────────────────────────────────────
function ViewModal({ request, onClose, currency }) {
  const name  = request.organization_members?.profiles?.full_name ?? "Unknown";
  const items = request.reimbursement_items ?? [];
  const [receiptUrls, setReceiptUrls] = useState({});

  useEffect(() => {
    // Fetch signed URLs for any items that have a receipt
    items.forEach(async (item) => {
      if (item.receipt_storage_key && !receiptUrls[item.id]) {
        const url = await getReceiptUrl(item.receipt_storage_key);
        if (url) setReceiptUrls(prev => ({ ...prev, [item.id]: url }));
      }
    });
  }, [items]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-gray-900">Expense Request</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {/* Employee + Status */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${avatarColor(name)}`}>
              {initials(name)}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">{name}</p>
              <p className="text-xs text-gray-400">{fmtDate(request.submitted_at ?? request.created_at)}</p>
            </div>
          </div>
          <StatusBadge status={request.status} />
        </div>

        {/* Title + notes */}
        <div className="mb-4">
          <p className="font-medium text-gray-900">{request.title}</p>
          {request.notes && <p className="text-sm text-gray-500 mt-1">{request.notes}</p>}
        </div>

        {/* Line items */}
        <div className="border border-gray-100 rounded-lg overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase px-4 py-2.5">Item</th>
                <th className="text-right text-xs font-semibold text-gray-400 uppercase px-4 py-2.5">Amount</th>
                <th className="text-center text-xs font-semibold text-gray-400 uppercase px-4 py-2.5">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{item.description}</p>
                    <p className="text-xs text-gray-400">
                      {fmtDate(item.expense_date)}
                      {item.transaction_categories?.name && ` · ${item.transaction_categories.name}`}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">
                    {fmt(item.amount, currency)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {receiptUrls[item.id] ? (
                      <a
                        href={receiptUrls[item.id]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
                      >
                        <FileText size={12} /> View <ExternalLink size={10} />
                      </a>
                    ) : item.receipt_storage_key ? (
                      <span className="text-xs text-gray-400">Loading…</span>
                    ) : (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Missing</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t border-gray-100">
                <td className="px-4 py-2.5 text-sm font-semibold text-gray-700">Total</td>
                <td className="px-4 py-2.5 text-right text-sm font-bold text-gray-900 tabular-nums">
                  {fmt(totalAmount(request), currency)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Rejection reason */}
        {request.status === "rejected" && request.rejection_reason && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-4 py-3 mb-4">
            <XCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-700">Reason for declining</p>
              <p className="text-sm text-red-600 mt-0.5">{request.rejection_reason}</p>
            </div>
          </div>
        )}

        {/* Payment info */}
        {request.status === "paid" && (
          <div className="flex items-start gap-2 bg-green-50 border border-green-100 rounded-lg px-4 py-3 mb-4">
            <CheckCircle size={15} className="text-green-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-green-700">Payment recorded</p>
              <p className="text-sm text-green-600 mt-0.5">
                {request.payment_method?.replace(/_/g, " ") ?? "—"}
                {request.payment_reference && ` · Ref: ${request.payment_reference}`}
                {` · ${fmtDate(request.paid_at)}`}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full border border-gray-200 text-gray-600 rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-50 mt-2"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ── Edit Reimbursement Modal ───────────────────────────────────────────────────
function EditReimbursementModal({ request, onClose, currency }) {
  const updateMut = useUpdateReimbursement();
  const items     = request.reimbursement_items ?? [];
  const firstItem = items[0];

  const [form, setForm] = useState({
    title:       request.title ?? "",
    description: request.description ?? "",
    amount:      firstItem ? String((firstItem.amount / 100).toFixed(2)) : "",
    date:        firstItem?.expense_date ?? new Date().toISOString().slice(0, 10),
  });
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");
    if (!form.title.trim())                     { setError("Title is required.");          return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { setError("Enter a valid amount."); return; }

    const amountMinor = Math.round(parseFloat(form.amount) * 100);
    try {
      await updateMut.mutateAsync({
        id:           request.id,
        title:        form.title.trim(),
        description:  form.description.trim() || null,
        total_amount: amountMinor,
      });
      onClose();
    } catch (err) {
      setError(err?.message ?? "Failed to update. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Edit Request</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {error && (
          <div className="flex items-center gap-2 mb-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            <AlertCircle size={13} className="shrink-0" />{error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title / Description <span className="text-red-400">*</span>
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="What was this expense for?"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount ({currency}) <span className="text-red-400">*</span>
              </label>
              <input
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 tabular-nums"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                type="date"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Any additional context…"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={updateMut.isPending}
            className="flex-1 bg-green-500 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-green-600 disabled:opacity-50"
          >
            {updateMut.isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
const TABS = [
  { key: "all",       label: "All"            },
  { key: "submitted", label: "Pending Review" },
  { key: "approved",  label: "Approved"       },
  { key: "paid",      label: "Paid"           },
  { key: "rejected",  label: "Declined"       },
];

export default function Reimbursements() {
  const { orgCurrency } = useAuth();
  const currency = orgCurrency ?? "GHS";

  const [activeTab,     setActiveTab]     = useState("all");
  const [showSubmit,    setShowSubmit]     = useState(false);
  const [viewRequest,   setViewRequest]   = useState(null);
  const [declineTarget, setDeclineTarget] = useState(null);
  const [payTarget,     setPayTarget]     = useState(null);
  const [editTarget,    setEditTarget]    = useState(null);
  const [toast,         setToast]         = useState(null);

  const filters = activeTab !== "all" ? { status: activeTab } : {};
  const { data: requests = [], isLoading } = useReimbursements(filters);
  const { data: allReqs  = [] }            = useReimbursements({});
  const approveMut = useApproveReimbursement();
  const deleteMut  = useDeleteReimbursement();

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  function handleDelete(req) {
    const label = req.title ?? "request";
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
    deleteMut.mutate(
      { id: req.id },
      {
        onSuccess: () => showToast(`"${label}" deleted.`),
        onError:   (err) => showToast(`Error: ${err.message}`),
      },
    );
  }

  const submittedReqs = allReqs.filter(r => r.status === "submitted");
  const approvedReqs  = allReqs.filter(r => r.status === "approved" || r.status === "paid");
  const pendingTotal  = submittedReqs.reduce((s, r) => s + totalAmount(r), 0);
  const approvedTotal = approvedReqs.reduce((s, r)  => s + totalAmount(r), 0);

  async function handleApprove(req) {
    try { await approveMut.mutateAsync({ id: req.id }); }
    catch (e) { console.error(e); }
  }

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl flex items-center gap-2.5">
          <CheckCircle size={15} className="text-green-400 shrink-0" />
          {toast}
        </div>
      )}

      {/* Modals */}
      {showSubmit    && <SubmitModal              onClose={() => setShowSubmit(false)}    currency={currency} />}
      {viewRequest   && <ViewModal     request={viewRequest}   onClose={() => setViewRequest(null)}    currency={currency} />}
      {declineTarget && <DeclineModal  request={declineTarget} onClose={() => setDeclineTarget(null)} />}
      {payTarget     && <MarkPaidModal request={payTarget}     onClose={() => setPayTarget(null)}      currency={currency} />}
      {editTarget    && <EditReimbursementModal request={editTarget} onClose={() => setEditTarget(null)} currency={currency} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reimbursements</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track and manage employee expense submissions</p>
        </div>
        <button
          onClick={() => setShowSubmit(true)}
          className="bg-green-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-600 flex items-center gap-2"
        >
          <Upload size={15} /> Submit Expense
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
            {submittedReqs.length} submission{submittedReqs.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <p className="text-sm text-gray-500">Approved / Paid</p>
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
        <div className="flex border-b border-gray-200 px-6 mt-4 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`mr-5 pb-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? "border-green-500 text-green-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
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
            <p className="font-medium">No reimbursement requests</p>
            <p className="text-sm mt-1">Click "Submit Expense" to create one</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Employee", "Description", "Amount", "Date", "Receipt", "Status", "Actions"].map(h => (
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
                  const total      = totalAmount(req);
                  const status     = req.status ?? "submitted";
                  const hasReceipt = (req.reimbursement_items ?? []).some(it => it.receipt_storage_key);

                  return (
                    <tr
                      key={req.id}
                      className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i % 2 !== 0 ? "bg-gray-50/30" : ""}`}
                    >
                      {/* Employee */}
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${avatarColor(name)}`}>
                            {initials(name)}
                          </div>
                          <span className="font-medium text-gray-900 truncate max-w-[120px]">{name}</span>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="px-3 py-3.5 text-gray-600 max-w-[180px] truncate">
                        {req.title ?? req.reimbursement_items?.[0]?.description ?? "—"}
                      </td>

                      {/* Amount */}
                      <td className="px-3 py-3.5 text-right">
                        <span className="text-sm font-bold text-gray-900">{fmt(total, currency)}</span>
                      </td>

                      {/* Date */}
                      <td className="px-3 py-3.5 text-gray-500 text-sm">
                        {fmtDate(req.submitted_at ?? req.created_at)}
                      </td>

                      {/* Receipt */}
                      <td className="px-3 py-3.5">
                        {hasReceipt ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                            <Paperclip size={10} /> Attached
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            Missing
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3.5">
                        <StatusBadge status={status} />
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {status === "submitted" && (
                            <>
                              <button
                                onClick={() => handleApprove(req)}
                                disabled={approveMut.isPending}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                              >
                                <CheckCircle size={11} /> Approve
                              </button>
                              <button
                                onClick={() => setDeclineTarget(req)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                              >
                                <XCircle size={11} /> Decline
                              </button>
                            </>
                          )}
                          {status === "approved" && (
                            <>
                              <button
                                onClick={() => setPayTarget(req)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-green-500 text-white rounded-lg hover:bg-green-600"
                              >
                                <CreditCard size={11} /> Mark Paid
                              </button>
                              <button
                                onClick={() => setViewRequest(req)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
                              >
                                <Eye size={11} /> View
                              </button>
                            </>
                          )}
                          {(status === "paid" || status === "rejected") && (
                            <button
                              onClick={() => setViewRequest(req)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                              <Eye size={11} /> View
                            </button>
                          )}
                          {/* Edit — draft or submitted only */}
                          {(status === "submitted" || status === "draft") && (
                            <button
                              onClick={() => setEditTarget(req)}
                              title="Edit request"
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                          {/* Delete — always available */}
                          <button
                            onClick={() => handleDelete(req)}
                            disabled={deleteMut.isPending}
                            title="Delete request"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-40"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
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
    </div>
  );
}
