import { useState, useMemo, useRef, useCallback } from "react";
import {
  Plus, Send, FileText, Clock, CheckCircle, AlertCircle,
  Trash2, ChevronRight, X, Download, Share2, Ban,
  Mail, Copy, Check, CreditCard, Building2, Banknote,
  Smartphone, ChevronDown, Search, User, ArrowLeft,
} from "lucide-react";
import {
  useInvoices, useCreateInvoice, useUpdateInvoice,
  useMarkInvoiceSent, useRecordInvoicePayment, useVoidInvoice,
  useDeleteInvoice,
} from "../hooks/useInvoices";
import { useContacts, useCreateContact } from "../hooks/useContacts";
import { useOrgSettings } from "../hooks/useOrg";
import { useAuth } from "../context/AuthContext";
import { fmt, fmtDate } from "../lib/fmt";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

const CURRENCY_SYMBOL = { GHS: "GH₵", USD: "$", GBP: "£", EUR: "€", NGN: "₦", KES: "KSh" };
const sym = (c) => CURRENCY_SYMBOL[c] ?? c;

const STATUS_CFG = {
  draft:          { bg: "bg-gray-100",   text: "text-gray-600",   dot: "bg-gray-400",   label: "Draft"    },
  sent:           { bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-500",   label: "Sent"     },
  paid:           { bg: "bg-green-50",   text: "text-green-700",  dot: "bg-green-500",  label: "Paid"     },
  overdue:        { bg: "bg-red-50",     text: "text-red-700",    dot: "bg-red-500",    label: "Overdue"  },
  partially_paid: { bg: "bg-amber-50",   text: "text-amber-700",  dot: "bg-amber-500",  label: "Partial"  },
  void:           { bg: "bg-gray-100",   text: "text-gray-400",   dot: "bg-gray-300",   label: "Void"     },
};

function StatusPill({ status, size = "sm" }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.draft;
  const p   = size === "lg" ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${p} ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

const PAYMENT_METHODS = [
  { value: "bank_transfer",  label: "Bank Transfer",  icon: Building2   },
  { value: "mobile_money",   label: "Mobile Money",   icon: Smartphone  },
  { value: "cash",           label: "Cash",           icon: Banknote    },
  { value: "card",           label: "Card",           icon: CreditCard  },
  { value: "cheque",         label: "Cheque",         icon: FileText    },
];

// ─────────────────────────────────────────────────────────────────────────────
// PDF download helper  — opens a print-ready window
// ─────────────────────────────────────────────────────────────────────────────

function buildPrintHTML(invoice, orgName, currency) {
  const contact  = invoice.contacts ?? {};
  const items    = [...(invoice.invoice_line_items ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const payments = invoice.invoice_payments ?? [];
  const sub      = invoice.subtotal ?? 0;
  const tax      = invoice.tax_amount ?? 0;
  const disc     = invoice.discount_amount ?? 0;
  const total    = invoice.total_amount ?? 0;
  const paid     = invoice.amount_paid ?? 0;
  const due      = invoice.amount_due ?? total - paid;
  const fmtN     = (n) => {
    const v = (n ?? 0) / 100;
    return `${sym(currency)} ${v.toLocaleString("en", { minimumFractionDigits: 2 })}`;
  };
  const fmtD = (d) => d ? new Date(d).toLocaleDateString("en-GH", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const itemRows = items.map((li, i) => `
    <tr style="background:${i % 2 === 0 ? "#fff" : "#f9fafb"}">
      <td style="padding:10px 12px;font-size:13px;color:#374151">${li.description}</td>
      <td style="padding:10px 12px;text-align:right;font-size:13px;color:#374151">${li.quantity}</td>
      <td style="padding:10px 12px;text-align:right;font-size:13px;color:#374151">${fmtN(li.unit_price)}</td>
      <td style="padding:10px 12px;text-align:right;font-size:13px;font-weight:600;color:#111827">${fmtN(li.line_total)}</td>
    </tr>`).join("");

  const paymentRows = payments.map(p => `
    <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:12px">
      <span style="color:#6b7280">${fmtD(p.payment_date)} · ${p.payment_method?.replace("_", " ") ?? ""} ${p.reference ? "· " + p.reference : ""}</span>
      <span style="color:#16a34a;font-weight:600">${fmtN(p.amount)}</span>
    </div>`).join("");

  const watermark = invoice.status === "paid"
    ? `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:100px;font-weight:900;color:rgba(34,197,94,0.08);letter-spacing:4px;pointer-events:none;z-index:0">PAID</div>`
    : invoice.status === "void"
    ? `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:100px;font-weight:900;color:rgba(156,163,175,0.15);letter-spacing:4px;pointer-events:none;z-index:0">VOID</div>`
    : invoice.status === "overdue"
    ? `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:90px;font-weight:900;color:rgba(239,68,68,0.07);letter-spacing:4px;pointer-events:none;z-index:0">OVERDUE</div>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Invoice ${invoice.invoice_number}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',system-ui,sans-serif;background:#fff;color:#111827;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  @page{size:A4;margin:0}
  @media print{body{margin:0}}
</style></head><body>
<div style="max-width:800px;margin:0 auto;min-height:100vh;position:relative">
  ${watermark}
  <!-- Header gradient -->
  <div style="background:linear-gradient(135deg,#16a34a 0%,#059669 100%);padding:32px 40px;display:flex;justify-content:space-between;align-items:flex-start">
    <div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
        <div style="width:36px;height:36px;background:rgba(255,255,255,0.25);border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;color:#fff">L</div>
        <span style="color:#fff;font-size:18px;font-weight:800;letter-spacing:-0.3px">${orgName}</span>
      </div>
    </div>
    <div style="text-align:right">
      <div style="color:rgba(255,255,255,0.7);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px">Invoice</div>
      <div style="color:#fff;font-size:22px;font-weight:900;letter-spacing:-0.5px">${invoice.invoice_number}</div>
    </div>
  </div>

  <!-- Body -->
  <div style="padding:36px 40px">
    <!-- Bill to / dates -->
    <div style="display:flex;justify-content:space-between;gap:32px;margin-bottom:32px">
      <div>
        <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">Bill To</div>
        <div style="font-size:16px;font-weight:700;color:#111827;margin-bottom:4px">${contact.name ?? "—"}</div>
        ${contact.email ? `<div style="font-size:13px;color:#6b7280;margin-bottom:2px">${contact.email}</div>` : ""}
        ${contact.phone ? `<div style="font-size:13px;color:#6b7280;margin-bottom:2px">${contact.phone}</div>` : ""}
        ${contact.address ? `<div style="font-size:13px;color:#6b7280;white-space:pre-line">${contact.address}</div>` : ""}
        ${contact.tax_id ? `<div style="font-size:11px;color:#9ca3af;margin-top:4px">Tax ID: ${contact.tax_id}</div>` : ""}
      </div>
      <div style="text-align:right">
        <div style="display:flex;flex-direction:column;gap:6px">
          <div><span style="font-size:11px;color:#9ca3af;display:block">Issue Date</span><span style="font-size:14px;font-weight:600;color:#111827">${fmtD(invoice.issue_date)}</span></div>
          ${invoice.due_date ? `<div><span style="font-size:11px;color:#9ca3af;display:block">Due Date</span><span style="font-size:14px;font-weight:600;color:#111827">${fmtD(invoice.due_date)}</span></div>` : ""}
          ${invoice.payment_terms ? `<div><span style="font-size:11px;color:#9ca3af;display:block">Terms</span><span style="font-size:13px;color:#374151">${invoice.payment_terms}</span></div>` : ""}
        </div>
      </div>
    </div>

    <!-- Divider -->
    <div style="height:1px;background:linear-gradient(to right,#e5e7eb,transparent);margin-bottom:24px"></div>

    <!-- Line items -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead>
        <tr style="background:#f9fafb;border-radius:8px">
          <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px">Description</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px">Qty</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px">Rate</th>
          <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px">Amount</th>
        </tr>
      </thead>
      <tbody>${itemRows || `<tr><td colspan="4" style="padding:20px;text-align:center;color:#9ca3af;font-size:13px">No items</td></tr>`}</tbody>
    </table>

    <!-- Totals -->
    <div style="display:flex;justify-content:flex-end;margin-bottom:24px">
      <div style="width:280px">
        ${sub !== total ? `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px"><span style="color:#6b7280">Subtotal</span><span style="color:#374151">${fmtN(sub)}</span></div>` : ""}
        ${tax > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px"><span style="color:#6b7280">Tax (${invoice.tax_rate ?? 0}%)</span><span style="color:#374151">${fmtN(tax)}</span></div>` : ""}
        ${disc > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px"><span style="color:#6b7280">Discount</span><span style="color:#dc2626">-${fmtN(disc)}</span></div>` : ""}
        <div style="display:flex;justify-content:space-between;padding:10px 12px;background:#f0fdf4;border-radius:8px;margin:6px 0">
          <span style="font-size:15px;font-weight:800;color:#111827">Total</span>
          <span style="font-size:15px;font-weight:800;color:#16a34a">${fmtN(total)}</span>
        </div>
        ${paid > 0 ? `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px"><span style="color:#16a34a">Amount Paid</span><span style="color:#16a34a;font-weight:600">-${fmtN(paid)}</span></div>` : ""}
        ${due > 0 && paid > 0 ? `<div style="display:flex;justify-content:space-between;padding:8px 12px;background:#fff7ed;border-radius:8px;border:1px solid #fed7aa"><span style="font-size:14px;font-weight:700;color:#111827">Balance Due</span><span style="font-size:14px;font-weight:700;color:#c2410c">${fmtN(due)}</span></div>` : ""}
      </div>
    </div>

    ${payments.length > 0 ? `
    <div style="margin-bottom:24px">
      <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:10px">Payment History</div>
      ${paymentRows}
    </div>` : ""}

    ${invoice.notes ? `
    <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px">
      <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px">Notes</div>
      <div style="font-size:13px;color:#374151;white-space:pre-wrap">${invoice.notes}</div>
    </div>` : ""}

    <!-- Footer -->
    <div style="border-top:1px solid #e5e7eb;padding-top:20px;display:flex;justify-content:space-between;align-items:center">
      <div style="font-size:12px;color:#9ca3af">Thank you for your business!</div>
      <div style="font-size:11px;color:#d1d5db">${invoice.invoice_number} · Generated ${new Date().toLocaleDateString()}</div>
    </div>
  </div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// AddContactModal
// ─────────────────────────────────────────────────────────────────────────────

function AddContactModal({ onClose, onCreated }) {
  const createMut = useCreateContact();
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", payment_terms: "Net 30" });
  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    createMut.mutate(
      { ...form, type: "customer" },
      {
        onSuccess: (contact) => { onCreated(contact); onClose(); },
        onError:   () => { /* error shown inline below */ },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
            <User size={16} className="text-green-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">New Customer</h2>
            <p className="text-xs text-gray-400">Add a customer you can invoice</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {createMut.error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
              <AlertCircle size={13} className="shrink-0" />
              {createMut.error.message ?? "Failed to save. Please try again."}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Name <span className="text-red-400">*</span></label>
            <input required value={form.name} onChange={(e) => upd("name", e.target.value)}
              placeholder="Acme Limited"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => upd("email", e.target.value)}
                placeholder="client@acme.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
              <input value={form.phone} onChange={(e) => upd("phone", e.target.value)}
                placeholder="+233 24 000 0000"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Address</label>
            <textarea rows={2} value={form.address} onChange={(e) => upd("address", e.target.value)}
              placeholder="Street, City, Country"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Default Payment Terms</label>
            <select value={form.payment_terms} onChange={(e) => upd("payment_terms", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400">
              {["Due on receipt", "Net 7", "Net 14", "Net 30", "Net 60", "Net 90"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={createMut.isPending}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50">
              {createMut.isPending ? "Saving…" : "Add Customer"}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium py-2.5 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RecordPaymentModal
// ─────────────────────────────────────────────────────────────────────────────

function RecordPaymentModal({ invoice, currency, onClose }) {
  const recordMut = useRecordInvoicePayment();
  const due       = invoice.amount_due ?? invoice.total_amount ?? 0;
  const [form, setForm] = useState({
    amount:        (due / 100).toFixed(2),
    paymentDate:   new Date().toISOString().slice(0, 10),
    paymentMethod: "bank_transfer",
    reference:     "",
    note:          "",
  });
  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    recordMut.mutate(
      {
        invoiceId:     invoice.id,
        amount:        Math.round(parseFloat(form.amount) * 100),
        paymentDate:   form.paymentDate,
        paymentMethod: form.paymentMethod,
        reference:     form.reference || null,
        note:          form.note || null,
      },
      { onSuccess: onClose }
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={18} /></button>
        <div className="mb-5">
          <h2 className="text-base font-bold text-gray-900">Record Payment</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {invoice.invoice_number} · Balance: <span className="font-semibold text-gray-700">{fmt(due, currency)}</span>
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Amount <span className="text-red-400">*</span></label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{sym(currency)}</span>
              <input required type="number" min="0.01" step="0.01" value={form.amount}
                onChange={(e) => upd("amount", e.target.value)}
                className="w-full border border-gray-200 rounded-lg pl-10 pr-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Date</label>
            <input type="date" value={form.paymentDate} onChange={(e) => upd("paymentDate", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Method</label>
            <div className="grid grid-cols-5 gap-1.5">
              {PAYMENT_METHODS.map((m) => (
                <button key={m.value} type="button" onClick={() => upd("paymentMethod", m.value)}
                  title={m.label}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 text-xs font-medium transition-all ${
                    form.paymentMethod === m.value
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}>
                  <m.icon size={14} />
                  <span className="text-[10px] leading-tight text-center">{m.label.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Reference / Txn ID (optional)</label>
            <input value={form.reference} onChange={(e) => upd("reference", e.target.value)}
              placeholder="e.g. GHC-123456"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={recordMut.isPending}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              <CheckCircle size={14} />
              {recordMut.isPending ? "Saving…" : "Record Payment"}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// InvoiceDocument — the beautiful printable preview
// ─────────────────────────────────────────────────────────────────────────────

function InvoiceDocument({ invoice, currency, orgName }) {
  const contact  = invoice.contacts ?? {};
  const items    = useMemo(() =>
    [...(invoice.invoice_line_items ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  [invoice]);
  const payments = invoice.invoice_payments ?? [];
  const sub      = invoice.subtotal ?? 0;
  const tax      = invoice.tax_amount ?? 0;
  const disc     = invoice.discount_amount ?? 0;
  const total    = invoice.total_amount ?? 0;
  const paid     = invoice.amount_paid ?? 0;
  const due      = invoice.amount_due ?? total - paid;

  const isVoid    = invoice.status === "void";
  const isPaid    = invoice.status === "paid";
  const isOverdue = invoice.status === "overdue";

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden relative">

      {/* Watermark */}
      {(isPaid || isVoid || isOverdue) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 overflow-hidden">
          <span
            className={`text-8xl font-black tracking-widest select-none rotate-[-30deg] ${
              isPaid    ? "text-green-500/10"
              : isVoid  ? "text-gray-400/15"
              : "text-red-500/10"
            }`}
          >
            {isPaid ? "PAID" : isVoid ? "VOID" : "OVERDUE"}
          </span>
        </div>
      )}

      {/* Header gradient */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-500 px-8 py-7 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-white font-black text-xl">
            L
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-tight">{orgName}</p>
            <p className="text-green-100 text-xs mt-0.5">Financial Services</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-green-100 text-xs font-semibold uppercase tracking-[2px] mb-1">Invoice</p>
          <p className="text-white font-black text-2xl tracking-tight">{invoice.invoice_number}</p>
          <div className="mt-2">
            <StatusPill status={invoice.status} />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-8 py-7">
        {/* Bill To + Dates */}
        <div className="flex items-start justify-between gap-8 mb-7">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[1.5px] mb-2">Bill To</p>
            <p className="text-base font-bold text-gray-900">{contact.name ?? "—"}</p>
            {contact.email    && <p className="text-sm text-gray-500 mt-0.5">{contact.email}</p>}
            {contact.phone    && <p className="text-sm text-gray-500">{contact.phone}</p>}
            {contact.address  && <p className="text-sm text-gray-500 whitespace-pre-line">{contact.address}</p>}
            {contact.tax_id   && <p className="text-xs text-gray-400 mt-1">Tax ID: {contact.tax_id}</p>}
          </div>
          <div className="text-right shrink-0 space-y-3">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Issue Date</p>
              <p className="text-sm font-semibold text-gray-800">{fmtDate(invoice.issue_date)}</p>
            </div>
            {invoice.due_date && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Due Date</p>
                <p className={`text-sm font-semibold ${isOverdue ? "text-red-600" : "text-gray-800"}`}>
                  {fmtDate(invoice.due_date)}
                </p>
              </div>
            )}
            {invoice.payment_terms && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Terms</p>
                <p className="text-sm text-gray-600">{invoice.payment_terms}</p>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-gray-200 via-gray-100 to-transparent mb-6" />

        {/* Line items */}
        <div className="mb-7">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 rounded-lg overflow-hidden">
                <th className="text-left px-3 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider rounded-l-lg w-1/2">Description</th>
                <th className="text-right px-3 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Qty</th>
                <th className="text-right px-3 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rate</th>
                <th className="text-right px-3 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider rounded-r-lg">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-gray-400">No items</td>
                </tr>
              ) : items.map((li, i) => (
                <tr key={li.id} className={`border-b border-gray-50 ${i % 2 === 1 ? "bg-gray-50/40" : ""}`}>
                  <td className="px-3 py-3 text-sm text-gray-700">{li.description}</td>
                  <td className="px-3 py-3 text-sm text-gray-500 text-right tabular-nums">{li.quantity}</td>
                  <td className="px-3 py-3 text-sm text-gray-500 text-right tabular-nums">{fmt(li.unit_price, currency)}</td>
                  <td className="px-3 py-3 text-sm font-semibold text-gray-900 text-right tabular-nums">{fmt(li.line_total, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-7">
          <div className="w-64 space-y-1">
            {sub !== total && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-700 tabular-nums">{fmt(sub, currency)}</span>
              </div>
            )}
            {tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax ({invoice.tax_rate ?? 0}%)</span>
                <span className="text-gray-700 tabular-nums">{fmt(tax, currency)}</span>
              </div>
            )}
            {disc > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="text-red-600 tabular-nums">−{fmt(disc, currency)}</span>
              </div>
            )}
            {(sub !== total || tax > 0 || disc > 0) && <div className="h-px bg-gray-200 my-1" />}
            <div className="flex justify-between items-center bg-green-50 rounded-xl px-3 py-2.5">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-black text-lg text-green-600 tabular-nums">{fmt(total, currency)}</span>
            </div>
            {paid > 0 && (
              <>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-green-600 font-medium">Amount Paid</span>
                  <span className="text-green-600 font-semibold tabular-nums">−{fmt(paid, currency)}</span>
                </div>
                {due > 0 && (
                  <div className="flex justify-between items-center bg-orange-50 rounded-xl px-3 py-2 border border-orange-100 mt-1">
                    <span className="font-bold text-gray-900 text-sm">Balance Due</span>
                    <span className="font-bold text-orange-700 tabular-nums">{fmt(due, currency)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Payment history */}
        {payments.length > 0 && (
          <div className="mb-6">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[1.5px] mb-3">Payment History</p>
            <div className="space-y-1.5">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 text-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <span>{fmtDate(p.payment_date)}</span>
                    <span className="text-gray-300">·</span>
                    <span className="capitalize">{p.payment_method?.replace("_", " ")}</span>
                    {p.reference && <><span className="text-gray-300">·</span><span className="font-mono text-xs">{p.reference}</span></>}
                  </div>
                  <span className="font-semibold text-green-600 tabular-nums">{fmt(p.amount, currency)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[1.5px] mb-1.5">Notes</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-100 pt-5 flex items-center justify-between">
          <p className="text-sm text-gray-400 italic">Thank you for your business!</p>
          <p className="text-xs text-gray-300 font-mono">{invoice.invoice_number}</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ContactCombobox — searchable autocomplete for picking a customer
// ─────────────────────────────────────────────────────────────────────────────

function ContactCombobox({ contacts, value, onChange, onAddNew }) {
  const [query,    setQuery]    = useState("");
  const [open,     setOpen]     = useState(false);
  const inputRef                = useRef(null);
  const closeTimer              = useRef(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const results = q
      ? contacts.filter((c) =>
          c.name.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.includes(q)
        )
      : contacts;
    return results.slice(0, 8);
  }, [contacts, query]);

  const handleSelect = useCallback((c) => {
    onChange(c);
    setQuery("");
    setOpen(false);
  }, [onChange]);

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Use mouseDown on dropdown items so the click fires before the input's blur
  const keepOpen = () => {
    clearTimeout(closeTimer.current);
  };
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 160);
  };

  return (
    <div className="relative">
      {/* ── Selected contact card ── */}
      {value && !open ? (
        <div className="flex items-center gap-3 px-3 py-2.5 border-2 border-green-500 bg-green-50 rounded-xl">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {value.name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{value.name}</p>
            {value.email && <p className="text-xs text-gray-400 truncate">{value.email}</p>}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-white/60 transition-colors"
            title="Change customer"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        /* ── Search input ── */
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={scheduleClose}
            placeholder="Search by name, email or phone…"
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onMouseDown={keepOpen}
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* ── Dropdown ── */}
      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl border border-gray-200 shadow-xl z-20 overflow-hidden"
          onMouseDown={keepOpen}
        >
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-4 text-center">
                <p className="text-sm text-gray-400">
                  {query ? `No customers match "${query}"` : "No customers yet"}
                </p>
              </div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={() => handleSelect(c)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-green-50 text-left transition-colors group"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {c.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-green-700">
                      {c.name}
                    </p>
                    {c.email && <p className="text-xs text-gray-400 truncate">{c.email}</p>}
                  </div>
                  {c.phone && <p className="text-xs text-gray-300 shrink-0">{c.phone}</p>}
                </button>
              ))
            )}
          </div>

          {/* Add new customer footer */}
          <div className="border-t border-gray-100 bg-gray-50/50">
            <button
              type="button"
              onMouseDown={() => { setOpen(false); onAddNew(); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-green-600 hover:bg-green-50 transition-colors"
            >
              <Plus size={14} />
              {query ? `Add "${query}" as new customer` : "Add new customer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Invoice Builder (multi-step modal)
// ─────────────────────────────────────────────────────────────────────────────

const emptyItem = () => ({ description: "", quantity: "1", unit_price: "" });

function InvoiceBuilder({ contacts, currency, onClose, onSave, onNeedContact, isSaving }) {
  const [step, setStep]         = useState(1);
  const [contact, setContact]   = useState(null);
  const [taxesInited, setTaxesInited] = useState(false);
  const [form, setForm]         = useState({
    issue_date:    new Date().toISOString().slice(0, 10),
    due_date:      "",
    payment_terms: "Net 30",
    tax_rate:      "0",
    taxes:         [],   // [{ id, name, rate, enabled }] when using named tax types
    notes:         "",
    footer:        "",
    items:         [emptyItem()],
  });

  const { data: orgSettings } = useOrgSettings();
  const savedTaxTypes = orgSettings?.tax_rates ?? [];
  const usingNamedTaxes = savedTaxTypes.length > 0;

  // Initialise taxes from org settings once loaded
  const upd     = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const updItem = (i, k, v) => setForm((f) => ({
    ...f, items: f.items.map((it, idx) => idx === i ? { ...it, [k]: v } : it),
  }));

  useState(() => {
    // note: using the setter as an effect-like initializer is intentional —
    // we only want to run once after orgSettings loads
  });

  // Sync org settings into form once on first load
  if (orgSettings && !taxesInited) {
    setTaxesInited(true);
    if (savedTaxTypes.length > 0) {
      setForm((f) => ({ ...f, taxes: savedTaxTypes.map((t) => ({ ...t, enabled: true })) }));
    } else {
      setForm((f) => ({ ...f, tax_rate: String(orgSettings.default_tax_rate ?? "0") }));
    }
  }

  const lineAmounts = form.items.map((it) =>
    Math.round((parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0) * 100)
  );
  const subtotalMinor = lineAmounts.reduce((s, a) => s + a, 0);

  // Effective tax rate: sum of enabled named taxes, or direct input
  const activeTaxes       = usingNamedTaxes ? (form.taxes ?? []).filter((t) => t.enabled) : [];
  const effectiveTaxRate  = usingNamedTaxes
    ? activeTaxes.reduce((s, t) => s + (parseFloat(t.rate) || 0), 0)
    : (parseFloat(form.tax_rate) || 0);
  const taxMinor      = Math.round(subtotalMinor * effectiveTaxRate / 100);
  const totalMinor    = subtotalMinor + taxMinor;

  const validItems  = form.items.filter((it) => it.description.trim() && it.unit_price);
  const canContinue = [null, !!contact, validItems.length > 0, true][step] ?? true;

  function buildPayload() {
    return {
      invoice: {
        contact_id:      contact.id,
        issue_date:      form.issue_date,
        due_date:        form.due_date || null,
        payment_terms:   form.payment_terms,
        tax_rate:        effectiveTaxRate,
        subtotal:        subtotalMinor,
        tax_amount:      taxMinor,
        discount_amount: 0,
        total_amount:    totalMinor,
        notes:           form.notes || null,
        footer:          form.footer || null,
        currency,
      },
      lineItems: validItems.map((it, i) => ({
        description: it.description,
        quantity:    parseFloat(it.quantity) || 1,
        unit_price:  Math.round((parseFloat(it.unit_price) || 0) * 100),
        line_total:  lineAmounts[form.items.indexOf(it)],
        sort_order:  i,
      })),
    };
  }

  const STEPS = ["Client", "Items", "Review"];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[500px] bg-white shadow-2xl flex flex-col z-50">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">New Invoice</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
              <X size={18} />
            </button>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-0">
            {STEPS.map((label, i) => {
              const s = i + 1;
              const done    = s < step;
              const active  = s === step;
              return (
                <div key={s} className="flex items-center flex-1 last:flex-none">
                  <button
                    onClick={() => done && setStep(s)}
                    className={`flex items-center gap-2 ${done ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      done   ? "bg-green-500 text-white"
                      : active ? "bg-green-500 text-white ring-4 ring-green-100"
                      : "bg-gray-100 text-gray-400"
                    }`}>
                      {done ? <Check size={12} /> : s}
                    </div>
                    <span className={`text-sm font-medium hidden sm:block ${active ? "text-gray-900" : done ? "text-green-600" : "text-gray-400"}`}>
                      {label}
                    </span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-3 rounded-full ${s < step ? "bg-green-400" : "bg-gray-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Step 1: Client ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-2">Select Customer</p>
                <ContactCombobox
                  contacts={contacts}
                  value={contact}
                  onChange={setContact}
                  onAddNew={onNeedContact}
                />
                {!contact && (
                  <p className="text-xs text-gray-400 mt-2">
                    Type a name, email or phone number to search, or{" "}
                    <button type="button" onClick={onNeedContact} className="text-green-600 font-semibold hover:underline">
                      add a new customer
                    </button>
                  </p>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Issue Date</label>
                  <input type="date" value={form.issue_date} onChange={(e) => upd("issue_date", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Due Date</label>
                  <input type="date" value={form.due_date} onChange={(e) => upd("due_date", e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Payment Terms</label>
                <select value={form.payment_terms} onChange={(e) => upd("payment_terms", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400">
                  {["Due on receipt", "Net 7", "Net 14", "Net 30", "Net 60", "Net 90"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ── Step 2: Line items ── */}
          {step === 2 && (
            <div>
              <div className="space-y-3">
                {form.items.map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-3.5 space-y-2.5 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Item {i + 1}</p>
                      {form.items.length > 1 && (
                        <button onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))}
                          className="text-red-400 hover:text-red-600 p-0.5 rounded">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <input type="text" placeholder="Description of service or product"
                      value={item.description} onChange={(e) => updItem(i, "description", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400" />
                    <div className="grid grid-cols-3 gap-2 items-end">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">QTY</label>
                        <input type="number" min="0.01" step="any" placeholder="1"
                          value={item.quantity} onChange={(e) => updItem(i, "quantity", e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white tabular-nums focus:outline-none focus:ring-2 focus:ring-green-400" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">RATE ({sym(currency)})</label>
                        <input type="number" min="0" step="0.01" placeholder="0.00"
                          value={item.unit_price} onChange={(e) => updItem(i, "unit_price", e.target.value)}
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white tabular-nums focus:outline-none focus:ring-2 focus:ring-green-400" />
                      </div>
                      <div className="text-right">
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">TOTAL</label>
                        <p className="text-sm font-bold text-green-600 py-2 tabular-nums">
                          {item.description && item.unit_price ? fmt(lineAmounts[i], currency) : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }))}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-green-600 border-2 border-dashed border-green-200 rounded-xl hover:bg-green-50 hover:border-green-400 transition-all">
                <Plus size={14} /> Add Line Item
              </button>

              {/* Subtotals preview */}
              {subtotalMinor > 0 && (
                <div className="mt-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                  <div className="flex justify-between text-sm text-gray-600 mb-3">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{fmt(subtotalMinor, currency)}</span>
                  </div>

                  {/* ── Named tax types ── */}
                  {usingNamedTaxes ? (
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Tax</p>
                      <div className="space-y-2">
                        {(form.taxes ?? []).map((tax, i) => {
                          const taxAmt = Math.round(subtotalMinor * (parseFloat(tax.rate) || 0) / 100);
                          return (
                            <div key={tax.id} className="flex items-center gap-2">
                              {/* Checkbox toggle */}
                              <button
                                type="button"
                                onClick={() => {
                                  const next = [...(form.taxes ?? [])];
                                  next[i] = { ...next[i], enabled: !next[i].enabled };
                                  upd("taxes", next);
                                }}
                                className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                  tax.enabled
                                    ? "bg-green-500 border-green-500"
                                    : "border-gray-300 bg-white"
                                }`}
                              >
                                {tax.enabled && <Check size={10} className="text-white" />}
                              </button>
                              {/* Name */}
                              <span className={`text-sm flex-1 ${tax.enabled ? "text-gray-800 font-medium" : "text-gray-400"}`}>
                                {tax.name}
                              </span>
                              {/* Rate (editable per-invoice) */}
                              <input
                                type="number" min="0" max="100" step="0.01"
                                value={tax.rate}
                                onChange={(e) => {
                                  const next = [...(form.taxes ?? [])];
                                  next[i] = { ...next[i], rate: e.target.value };
                                  upd("taxes", next);
                                }}
                                disabled={!tax.enabled}
                                className="w-16 border border-green-200 rounded-md px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-400 bg-white disabled:opacity-40 disabled:bg-gray-50 tabular-nums"
                              />
                              <span className="text-xs text-gray-500">%</span>
                              {/* Per-tax amount */}
                              {tax.enabled && taxAmt > 0 && (
                                <span className="text-xs text-gray-500 tabular-nums w-20 text-right">
                                  {fmt(taxAmt, currency)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {taxMinor > 0 && (
                        <div className="flex justify-between text-sm text-gray-600 mt-3 pt-2 border-t border-green-100">
                          <span>Total Tax ({effectiveTaxRate % 1 === 0 ? effectiveTaxRate : effectiveTaxRate.toFixed(2)}%)</span>
                          <span className="tabular-nums">{fmt(taxMinor, currency)}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ── Simple rate input (no named types saved) ── */
                    <div className="flex items-center gap-2">
                      <input type="number" min="0" max="100" step="0.5" value={form.tax_rate}
                        onChange={(e) => upd("tax_rate", e.target.value)}
                        className="w-16 border border-green-200 rounded-md px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-green-400 bg-white" />
                      <span className="text-sm text-gray-500">% tax</span>
                      {taxMinor > 0 && <span className="text-sm text-gray-600 ml-auto tabular-nums">{fmt(taxMinor, currency)}</span>}
                    </div>
                  )}

                  <div className="flex justify-between font-bold text-gray-900 mt-3 pt-2 border-t border-green-200">
                    <span>Total</span>
                    <span className="text-green-600 text-base tabular-nums">{fmt(totalMinor, currency)}</span>
                  </div>
                </div>
              )}

              <div className="mt-4">
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notes / Payment Instructions (optional)</label>
                <textarea rows={3} value={form.notes} onChange={(e) => upd("notes", e.target.value)}
                  placeholder="e.g. Please pay within 30 days to account 0123456789 at GCB Bank…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
            </div>
          )}

          {/* ── Step 3: Review ── */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-green-600 to-emerald-500 rounded-2xl p-5 text-white">
                <p className="text-green-100 text-xs font-semibold uppercase tracking-wider mb-1">Invoice Total</p>
                <p className="text-4xl font-black tabular-nums">{fmt(totalMinor, currency)}</p>
                <p className="text-green-100 text-sm mt-1">{contact?.name}</p>
              </div>
              <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
                {[
                  { label: "Customer",     value: contact?.name },
                  { label: "Email",        value: contact?.email ?? "—" },
                  { label: "Issue Date",   value: fmtDate(form.issue_date) },
                  { label: "Due Date",     value: form.due_date ? fmtDate(form.due_date) : "—" },
                  { label: "Payment Terms", value: form.payment_terms },
                  { label: "Line Items",   value: `${validItems.length} item${validItems.length !== 1 ? "s" : ""}` },
                  { label: "Subtotal",     value: fmt(subtotalMinor, currency) },
                  ...(usingNamedTaxes
                    ? activeTaxes.map((t) => ({
                        label: `${t.name} (${t.rate}%)`,
                        value: fmt(Math.round(subtotalMinor * (parseFloat(t.rate) || 0) / 100), currency),
                      }))
                    : [parseFloat(form.tax_rate) > 0 && { label: `Tax (${form.tax_rate}%)`, value: fmt(taxMinor, currency) }]
                  ).filter(Boolean),
                  { label: "Total",        value: fmt(totalMinor, currency), bold: true },
                ].filter(Boolean).map(({ label, value, bold }) => (
                  <div key={label} className="flex justify-between px-4 py-2.5">
                    <span className="text-sm text-gray-500">{label}</span>
                    <span className={`text-sm ${bold ? "font-bold text-green-600" : "font-semibold text-gray-900"} tabular-nums`}>{value}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 text-center">Invoice will be saved as a draft. You can send it once reviewed.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              <ArrowLeft size={14} /> Back
            </button>
          )}
          {step < 3 ? (
            <button onClick={() => setStep((s) => s + 1)} disabled={!canContinue}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors">
              Continue <ChevronRight size={15} />
            </button>
          ) : (
            <div className="flex-1 flex flex-col gap-2">
              {/* Primary: Save & Send */}
              <button
                onClick={() => onSave(buildPayload(), { sendImmediately: true })}
                disabled={isSaving}
                className="w-full bg-green-500 hover:bg-green-600 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                <Send size={14} /> {isSaving ? "Saving…" : "Save & Send"}
              </button>
              {/* Secondary: Save as Draft */}
              <button
                onClick={() => onSave(buildPayload(), { sendImmediately: false })}
                disabled={isSaving}
                className="w-full border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl py-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                <FileText size={13} /> Save as Draft
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function Invoicing() {
  const { orgCurrency, orgName } = useAuth();
  const currency  = orgCurrency ?? "GHS";
  const org       = orgName ?? "Your Organisation";

  const [activeTab,        setActiveTab]        = useState("all");
  const [selectedId,       setSelectedId]       = useState(null);
  const [showBuilder,      setShowBuilder]      = useState(false);
  const [showAddContact,   setShowAddContact]   = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [search,           setSearch]           = useState("");
  const [toast,            setToast]            = useState(null);
  const [copied,           setCopied]           = useState(false);

  const qf = activeTab !== "all" ? { status: activeTab } : {};
  const { data: invoices = [], isLoading } = useInvoices(qf);
  const { data: allData  = [] }            = useInvoices({});
  const { data: contacts = [] }            = useContacts();

  const createMut = useCreateInvoice();
  const sentMut   = useMarkInvoiceSent();
  const voidMut   = useVoidInvoice();
  const deleteMut = useDeleteInvoice();

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const TABS = [
    { id: "all",           label: "All" },
    { id: "draft",         label: "Draft" },
    { id: "sent",          label: "Sent" },
    { id: "overdue",       label: "Overdue" },
    { id: "partially_paid", label: "Partial" },
    { id: "paid",          label: "Paid" },
  ];

  // Summary stats
  const outstanding  = allData.filter((i) => !["paid","void"].includes(i.status ?? "")).reduce((s, i) => s + (i.amount_due ?? 0), 0);
  const paidTotal    = allData.filter((i) => i.status === "paid").reduce((s, i) => s + (i.total_amount ?? 0), 0);
  const overdueCount = allData.filter((i) => i.status === "overdue").length;
  const draftCount   = allData.filter((i) => i.status === "draft").length;

  // Filtered list with search
  const displayed = useMemo(() =>
    invoices.filter((inv) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.contacts?.name?.toLowerCase().includes(q)
      );
    }),
  [invoices, search]);

  const selectedInvoice = displayed.find((i) => i.id === selectedId)
    ?? (selectedId ? null : displayed[0] ?? null);

  // ── Actions ──────────────────────────────────────────────────────────────

  function handleSend() {
    if (!selectedInvoice) return;
    sentMut.mutate(
      { id: selectedInvoice.id },
      {
        onSuccess: () => showToast(`${selectedInvoice.invoice_number} marked as sent. Revenue recorded.`),
        onError: (e) => showToast(e.message, "error"),
      }
    );
  }

  function handleVoid() {
    if (!selectedInvoice) return;
    if (!confirm(`Void ${selectedInvoice.invoice_number}? This cannot be undone.`)) return;
    voidMut.mutate(
      { id: selectedInvoice.id },
      {
        onSuccess: () => showToast(`${selectedInvoice.invoice_number} voided.`),
        onError: (e) => showToast(e.message, "error"),
      }
    );
  }

  function handleDelete() {
    if (!selectedInvoice) return;
    if (!confirm(`Delete draft ${selectedInvoice.invoice_number}?`)) return;
    deleteMut.mutate(
      { id: selectedInvoice.id },
      {
        onSuccess: () => { setSelectedId(null); showToast("Draft deleted."); },
        onError: (e) => showToast(e.message, "error"),
      }
    );
  }

  function handleDownload() {
    if (!selectedInvoice) return;
    const html = buildPrintHTML(selectedInvoice, org, currency);
    const win  = window.open("", "_blank");
    if (!win) { alert("Please allow pop-ups to download the invoice."); return; }
    win.document.write(html);
    win.document.close();
  }

  function handleShare() {
    if (!selectedInvoice) return;
    const inv     = selectedInvoice;
    const contact = inv.contacts ?? {};
    const subject = encodeURIComponent(`Invoice ${inv.invoice_number} from ${org}`);
    const body    = encodeURIComponent(
      `Dear ${contact.name ?? "Customer"},\n\nPlease find your invoice details below:\n\n` +
      `Invoice Number: ${inv.invoice_number}\n` +
      `Issue Date: ${inv.issue_date ?? "—"}\n` +
      `Due Date: ${inv.due_date ?? "—"}\n` +
      `Amount Due: ${fmt(inv.amount_due ?? inv.total_amount, currency)}\n\n` +
      (inv.notes ? `Notes: ${inv.notes}\n\n` : "") +
      `Please make payment at your earliest convenience.\n\nThank you,\n${org}`
    );
    const mailto = `mailto:${contact.email ?? ""}?subject=${subject}&body=${body}`;
    window.open(mailto, "_blank");
  }

  function handleCopyNumber() {
    if (!selectedInvoice) return;
    navigator.clipboard.writeText(selectedInvoice.invoice_number).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleSaveInvoice(payload, { sendImmediately = false } = {}) {
    createMut.mutate(payload, {
      onSuccess: (inv) => {
        if (sendImmediately) {
          sentMut.mutate(
            { id: inv.id },
            {
              onSuccess: () => {
                setShowBuilder(false);
                setSelectedId(inv.id);
                showToast(`${inv.invoice_number} created and sent. Revenue recorded.`);
              },
              onError: (e) => {
                setShowBuilder(false);
                setSelectedId(inv.id);
                showToast(`${inv.invoice_number} saved — but send failed: ${e.message}`, "error");
              },
            }
          );
        } else {
          setShowBuilder(false);
          setSelectedId(inv.id);
          showToast(`${inv.invoice_number} saved as draft.`);
        }
      },
      onError: (e) => showToast(e.message, "error"),
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F7F7F8] p-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[70] text-sm font-medium px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 ${
          toast.type === "error" ? "bg-red-600 text-white" : "bg-gray-900 text-white"
        }`}>
          {toast.type === "error"
            ? <AlertCircle size={15} className="text-red-200" />
            : <CheckCircle size={15} className="text-green-400" />
          }
          {toast.msg}
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddContact && (
        <AddContactModal
          onClose={() => setShowAddContact(false)}
          onCreated={(c) => { /* contacts query auto-refreshes */ }}
        />
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <RecordPaymentModal
          invoice={selectedInvoice}
          currency={currency}
          onClose={() => { setShowPaymentModal(false); showToast("Payment recorded."); }}
        />
      )}

      {/* Invoice Builder */}
      {showBuilder && (
        <InvoiceBuilder
          contacts={contacts}
          currency={currency}
          onClose={() => setShowBuilder(false)}
          onSave={handleSaveInvoice}
          onNeedContact={() => setShowAddContact(true)}
          isSaving={createMut.isPending || sentMut.isPending}
        />
      )}

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoicing</h1>
          <p className="text-sm text-gray-500 mt-0.5">Accrual basis — revenue recognised when invoice is sent</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAddContact(true)}
            className="flex items-center gap-2 px-3.5 py-2 border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors shadow-sm">
            <User size={14} /> Add Customer
          </button>
          <button onClick={() => setShowBuilder(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">
            <Plus size={15} /> New Invoice
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Outstanding",  value: outstanding,  icon: Clock,        color: "text-blue-600",  bg: "bg-blue-50"  },
          { label: "Collected",    value: paidTotal,    icon: CheckCircle,  color: "text-green-600", bg: "bg-green-50" },
          { label: "Overdue",      value: overdueCount, icon: AlertCircle,  color: "text-red-600",   bg: "bg-red-50",   isCount: true },
          { label: "Drafts",       value: draftCount,   icon: FileText,     color: "text-gray-500",  bg: "bg-gray-100", isCount: true },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500 font-medium">{s.label}</p>
              <div className={`${s.bg} p-2 rounded-lg`}><s.icon size={15} className={s.color} /></div>
            </div>
            {isLoading ? <Skeleton className="h-7 w-28" /> : (
              <p className={`text-xl font-bold ${s.isCount && s.value > 0 ? "text-red-600" : "text-gray-900"}`}>
                {s.isCount ? s.value : fmt(s.value, currency)}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ── Two-column layout ── */}
      <div className="flex gap-5 items-start">

        {/* Left: Invoice list */}
        <div className="w-[360px] shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by number or client…"
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50" />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 px-3 overflow-x-auto">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 mr-1 pb-2.5 pt-3 px-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-[60px] rounded-xl" />)}
              </div>
            ) : displayed.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <FileText size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No invoices found</p>
                <button onClick={() => setShowBuilder(true)}
                  className="mt-2 text-xs text-green-600 font-semibold hover:underline">
                  Create your first invoice →
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {displayed.map((inv) => {
                  const isSelected = selectedInvoice?.id === inv.id;
                  const cfg = STATUS_CFG[inv.status] ?? STATUS_CFG.draft;
                  return (
                    <div key={inv.id} onClick={() => setSelectedId(inv.id)}
                      className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-gray-50 ${
                        isSelected ? "bg-green-50/60 border-l-[3px] border-l-green-500" : "border-l-[3px] border-l-transparent"
                      }`}>
                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isSelected ? "bg-green-500 text-white" : "bg-gray-100 text-gray-500"
                      }`}>
                        {(inv.contacts?.name ?? "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">{inv.contacts?.name ?? "—"}</p>
                          <p className="text-sm font-bold tabular-nums text-gray-900 shrink-0">{fmt(inv.total_amount ?? 0, currency)}</p>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-gray-400 font-mono">{inv.invoice_number}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                        </div>
                        {inv.due_date && (
                          <p className="text-[10px] text-gray-300 mt-0.5">Due {fmtDate(inv.due_date)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Invoice detail */}
        <div className="flex-1 min-w-0 space-y-4">
          {!selectedInvoice ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm h-80 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <FileText size={36} className="mx-auto mb-3 opacity-20" />
                <p className="font-semibold text-sm">Select an invoice to preview</p>
                <p className="text-xs mt-1">or create a new one</p>
              </div>
            </div>
          ) : (
            <>
              {/* Action bar */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <StatusPill status={selectedInvoice.status} size="lg" />
                  <button onClick={handleCopyNumber}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 font-mono bg-gray-50 hover:bg-gray-100 px-2.5 py-1.5 rounded-lg transition-colors">
                    {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
                    {selectedInvoice.invoice_number}
                  </button>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Send */}
                  {selectedInvoice.status === "draft" && (
                    <button onClick={handleSend} disabled={sentMut.isPending}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50">
                      <Send size={13} /> {sentMut.isPending ? "Sending…" : "Mark Sent"}
                    </button>
                  )}
                  {/* Record Payment */}
                  {["sent", "overdue", "partially_paid"].includes(selectedInvoice.status) && (
                    <button onClick={() => setShowPaymentModal(true)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-xl transition-colors">
                      <CreditCard size={13} /> Record Payment
                    </button>
                  )}
                  {/* Share via email */}
                  <button onClick={handleShare}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-xs font-semibold rounded-xl transition-colors">
                    <Mail size={13} /> Share
                  </button>
                  {/* Download PDF */}
                  <button onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-xs font-semibold rounded-xl transition-colors">
                    <Download size={13} /> Download
                  </button>
                  {/* Void */}
                  {!["paid", "void"].includes(selectedInvoice.status) && (
                    <button onClick={handleVoid} disabled={voidMut.isPending}
                      className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white hover:bg-red-50 text-gray-500 hover:text-red-600 hover:border-red-200 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50">
                      <Ban size={13} /> Void
                    </button>
                  )}
                  {/* Delete draft */}
                  {selectedInvoice.status === "draft" && (
                    <button onClick={handleDelete} disabled={deleteMut.isPending}
                      className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 bg-white hover:bg-red-50 text-gray-400 hover:text-red-600 hover:border-red-200 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Invoice document */}
              <InvoiceDocument invoice={selectedInvoice} currency={currency} orgName={org} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
