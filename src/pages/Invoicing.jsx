import { useState } from "react";
import {
  Plus, Send, FileText, Clock, CheckCircle,
  AlertCircle, Trash2, ChevronRight,
} from "lucide-react";
import { useInvoices, useClients, useCreateInvoice } from "../hooks/useInvoices";
import { useAuth } from "../context/AuthContext";
import { fmt, fmtDate } from "../lib/fmt";

// ── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

// ── Status config (lowercase DB values) ──────────────────────────────────────
const STATUS_CONFIG = {
  draft:           { bg: "bg-gray-100",   text: "text-gray-600",  label: "Draft"          },
  sent:            { bg: "bg-blue-100",   text: "text-blue-700",  label: "Sent"           },
  paid:            { bg: "bg-green-100",  text: "text-green-700", label: "Paid"           },
  overdue:         { bg: "bg-red-100",    text: "text-red-700",   label: "Overdue"        },
  partially_paid:  { bg: "bg-amber-100",  text: "text-amber-700", label: "Partial"        },
  void:            { bg: "bg-gray-100",   text: "text-gray-500",  label: "Void"           },
};

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status?.toLowerCase()] ?? { bg: "bg-gray-100", text: "text-gray-600", label: status ?? "—" };
  return (
    <span className={`rounded-full text-xs px-2.5 py-0.5 font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

// ── Invoice Preview Panel ──────────────────────────────────────────────────────
function InvoicePreview({ invoice, currency }) {
  if (!invoice) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-full flex items-center justify-center">
        <div className="text-center text-gray-400">
          <FileText size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">Select an invoice to preview</p>
        </div>
      </div>
    );
  }

  const lineItems = invoice.invoice_line_items ?? [];
  const payments  = invoice.invoice_payments  ?? [];
  const subtotal  = lineItems.reduce((s, li) => s + (li.amount ?? 0), 0);
  const total     = invoice.total_amount ?? 0;
  const paid      = invoice.paid_amount ?? 0;
  const balance   = total - paid;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 h-full overflow-auto">
      {/* Invoice header */}
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            L
          </div>
          <span className="text-xl font-bold text-gray-900">Ledge</span>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{invoice.invoice_number ?? "—"}</p>
          <p className="text-sm text-gray-500 mt-1">Date: {fmtDate(invoice.invoice_date)}</p>
          <p className="text-sm text-gray-500">Due: {fmtDate(invoice.due_date)}</p>
          <div className="mt-1"><StatusPill status={invoice.status} /></div>
        </div>
      </div>

      {/* From / To */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">From</p>
          <p className="font-semibold text-gray-900">Your Organisation</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">To</p>
          <p className="font-semibold text-gray-900">{invoice.clients?.name ?? "—"}</p>
          {invoice.clients?.email && (
            <p className="text-sm text-gray-500">{invoice.clients.email}</p>
          )}
        </div>
      </div>

      {/* Line items */}
      <table className="w-full mb-6">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-2 w-1/2">Description</th>
            <th className="text-right text-xs font-semibold text-gray-400 uppercase pb-2">Qty</th>
            <th className="text-right text-xs font-semibold text-gray-400 uppercase pb-2">Rate</th>
            <th className="text-right text-xs font-semibold text-gray-400 uppercase pb-2">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-4 text-sm text-gray-400 text-center">No line items</td>
            </tr>
          ) : (
            lineItems.map((li) => (
              <tr key={li.id} className="border-b border-gray-100">
                <td className="py-3 text-sm text-gray-700">{li.description}</td>
                <td className="py-3 text-sm text-gray-700 text-right">{li.quantity}</td>
                <td className="py-3 text-sm text-gray-700 text-right">{fmt(li.unit_price ?? 0, currency)}</td>
                <td className="py-3 text-sm text-gray-700 text-right">{fmt(li.amount ?? 0, currency)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-56">
          <div className="flex justify-between text-sm text-gray-600 py-1">
            <span>Subtotal</span>
            <span>{fmt(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-2 mt-1">
            <span>Total</span>
            <span className="text-green-600">{fmt(total, currency)}</span>
          </div>
          {paid > 0 && (
            <>
              <div className="flex justify-between text-sm text-green-600 py-1">
                <span>Paid</span>
                <span>−{fmt(paid, currency)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-gray-100 pt-1">
                <span>Balance</span>
                <span>{fmt(balance, currency)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Payment history */}
      {payments.length > 0 && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Payments</p>
          {payments.map((p) => (
            <div key={p.id} className="flex justify-between text-sm py-1.5">
              <span className="text-gray-500">{fmtDate(p.payment_date)} · {p.payment_method ?? "—"}</span>
              <span className="font-semibold text-green-600">{fmt(p.amount, currency)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {invoice.notes && (
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 mt-4">
          {invoice.payment_terms && (
            <p><span className="font-medium text-gray-700">Payment Terms:</span> {invoice.payment_terms}</p>
          )}
          <p className="mt-1 text-gray-500">{invoice.notes}</p>
        </div>
      )}
    </div>
  );
}

// ── New Invoice Builder ────────────────────────────────────────────────────────
const emptyItem = () => ({ description: "", quantity: 1, unit_price: "" });

function InvoiceBuilder({ clients, currency, onClose, onSave }) {
  const [step, setStep] = useState(1); // 1=client, 2=items, 3=review
  const [selectedClient, setSelectedClient] = useState(null);
  const [form, setForm] = useState({
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate:     "",
    notes:       "",
    paymentTerms: "Net 30",
    taxRate:     "0",
    items:       [emptyItem()],
  });

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const updItem = (i, k, v) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((it, idx) => idx === i ? { ...it, [k]: v } : it),
    }));

  const lineAmounts = form.items.map((it) =>
    Math.round((parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0) * 100)
  );
  const subtotalMinor = lineAmounts.reduce((s, a) => s + a, 0);
  const taxMinor      = Math.round(subtotalMinor * (parseFloat(form.taxRate) || 0) / 100);
  const totalMinor    = subtotalMinor + taxMinor;

  const canStep2 = !!selectedClient;
  const canStep3 = form.items.some((it) => it.description.trim() && it.unit_price);

  function handleSave() {
    const invNumber = "INV-" + Date.now().toString().slice(-6);
    onSave({
      invoice: {
        client_id:    selectedClient.id,
        invoice_number: invNumber,
        invoice_date: form.invoiceDate,
        due_date:     form.dueDate || null,
        notes:        form.notes || null,
        payment_terms: form.paymentTerms,
        status:       "draft",
        total_amount: totalMinor,
        paid_amount:  0,
      },
      lineItems: form.items
        .filter((it) => it.description.trim())
        .map((it, i) => ({
          description: it.description,
          quantity:    parseFloat(it.quantity) || 1,
          unit_price:  Math.round((parseFloat(it.unit_price) || 0) * 100),
          amount:      lineAmounts[i],
          sort_order:  i,
        })),
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[480px] bg-white shadow-2xl flex flex-col z-50">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">New Invoice</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Step {step} of 3 — {step === 1 ? "Select client" : step === 2 ? "Add line items" : "Review & save"}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded text-lg">×</button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center px-6 pt-4 pb-0">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
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
          {/* Step 1 — Client */}
          {step === 1 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Select Client</p>
              {clients.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No clients found — add one first</p>
              ) : (
                <div className="space-y-2">
                  {clients.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedClient(c)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-lg border-2 text-left transition-all ${
                        selectedClient?.id === c.id
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-xs font-bold text-green-700 shrink-0">
                        {c.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                        {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                      </div>
                      {selectedClient?.id === c.id && <CheckCircle size={16} className="text-green-500 ml-auto shrink-0" />}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                  <input type="date" value={form.invoiceDate} onChange={(e) => upd("invoiceDate", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input type="date" value={form.dueDate} onChange={(e) => upd("dueDate", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Line items */}
          {step === 2 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">Line Items</p>
              <div className="space-y-3">
                {form.items.map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-500">Item {i + 1}</p>
                      {form.items.length > 1 && (
                        <button
                          onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updItem(i, "description", e.target.value)}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updItem(i, "quantity", e.target.value)}
                        className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                      />
                      <input
                        type="text"
                        placeholder={`Rate (${currency === "GHS" ? "GH₵" : currency})`}
                        value={item.unit_price}
                        onChange={(e) => updItem(i, "unit_price", e.target.value)}
                        className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                      />
                    </div>
                    {item.description && item.unit_price && (
                      <p className="text-xs text-green-600 font-semibold text-right">
                        = {fmt(lineAmounts[i], currency)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }))}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-green-600 border-2 border-dashed border-green-300 rounded-lg hover:bg-green-50"
              >
                <Plus size={14} /> Add Item
              </button>

              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tax Rate (%)</label>
                    <input type="number" min="0" max="100" value={form.taxRate}
                      onChange={(e) => upd("taxRate", e.target.value)}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Payment Terms</label>
                    <input type="text" value={form.paymentTerms}
                      onChange={(e) => upd("paymentTerms", e.target.value)}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
                  <textarea rows={2} value={form.notes} onChange={(e) => upd("notes", e.target.value)}
                    placeholder="Payment instructions, thank-you note..."
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Review */}
          {step === 3 && (
            <div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 mb-5">
                <p className="text-xs text-green-600 font-semibold uppercase tracking-wide mb-1">Invoice Total</p>
                <p className="text-3xl font-bold text-green-700">{fmt(totalMinor, currency)}</p>
                <p className="text-sm text-green-600 mt-1">To: {selectedClient?.name}</p>
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  { label: "Client",         value: selectedClient?.name },
                  { label: "Invoice Date",   value: form.invoiceDate },
                  { label: "Due Date",       value: form.dueDate || "—" },
                  { label: "Items",          value: `${form.items.filter((it) => it.description).length} line item(s)` },
                  { label: "Subtotal",       value: fmt(subtotalMinor, currency) },
                  { label: `Tax (${form.taxRate}%)`, value: fmt(taxMinor, currency) },
                  { label: "Total",          value: fmt(totalMinor, currency) },
                  { label: "Payment Terms",  value: form.paymentTerms },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-2.5">
                    <span className="text-sm text-gray-500">{label}</span>
                    <span className="text-sm font-semibold text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          {step > 1 && (
            <button onClick={() => setStep((s) => s - 1)}
              className="flex-1 bg-white text-gray-700 border border-gray-300 rounded-md py-2.5 text-sm font-medium hover:bg-gray-50">
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 ? !canStep2 : !canStep3}
              className="flex-1 bg-green-500 text-white rounded-md py-2.5 text-sm font-semibold hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Continue <ChevronRight size={15} />
            </button>
          ) : (
            <button onClick={handleSave}
              className="flex-1 bg-green-500 text-white rounded-md py-2.5 text-sm font-semibold hover:bg-green-600 flex items-center justify-center gap-2">
              <Send size={15} />
              Save Invoice
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Invoicing() {
  const { orgCurrency } = useAuth();
  const currency = orgCurrency ?? "GHS";

  const [activeTab,       setActiveTab]       = useState("all");
  const [selectedId,      setSelectedId]      = useState(null);
  const [showBuilder,     setShowBuilder]     = useState(false);
  const [toast,           setToast]           = useState(null);

  const queryFilters = activeTab !== "all" ? { status: activeTab } : {};
  const { data: invoices = [], isLoading } = useInvoices(queryFilters);
  const { data: clients  = [] }            = useClients();
  const createMut = useCreateInvoice();

  const tabs = ["all", "draft", "sent", "overdue", "paid"];

  const selectedInvoice = invoices.find((inv) => inv.id === selectedId) ?? invoices[0] ?? null;

  // Summary stats across all invoices (unfiltered)
  const allInvoices = useInvoices({}).data ?? invoices;
  const outstanding = allInvoices.filter((inv) => !["paid", "void"].includes(inv.status ?? "")).reduce((s, inv) => s + ((inv.total_amount ?? 0) - (inv.paid_amount ?? 0)), 0);
  const paidTotal   = allInvoices.filter((inv) => inv.status === "paid").reduce((s, inv) => s + (inv.total_amount ?? 0), 0);
  const overdueCount = allInvoices.filter((inv) => inv.status === "overdue").length;
  const draftCount   = allInvoices.filter((inv) => inv.status === "draft").length;

  function handleSave(payload) {
    createMut.mutate(payload, {
      onSuccess: (inv) => {
        setShowBuilder(false);
        setSelectedId(inv.id);
        setToast(`Invoice ${inv.invoice_number} created.`);
        setTimeout(() => setToast(null), 3500);
      },
    });
  }

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl flex items-center gap-2">
          <CheckCircle size={15} className="text-green-400" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoicing</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage and track all your invoices</p>
        </div>
        <button
          onClick={() => setShowBuilder(true)}
          className="flex items-center gap-2 bg-green-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-600"
        >
          <Plus size={15} />
          New Invoice
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Outstanding",   value: outstanding,   icon: Clock,        color: "text-blue-600",   bg: "bg-blue-50"   },
          { label: "Paid MTD",      value: paidTotal,     icon: CheckCircle,  color: "text-green-600",  bg: "bg-green-50"  },
          { label: "Overdue",       value: overdueCount,  icon: AlertCircle,  color: "text-red-600",    bg: "bg-red-50",   isCount: true },
          { label: "Drafts",        value: draftCount,    icon: FileText,     color: "text-gray-500",   bg: "bg-gray-100", isCount: true },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <div className={`${stat.bg} p-2 rounded-lg`}>
                <stat.icon size={16} className={stat.color} />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <p className="text-xl font-bold text-gray-900">
                {stat.isCount ? stat.value : fmt(stat.value, currency)}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="flex gap-5 items-start">
        {/* Left: Invoice list */}
        <div className="w-[40%] flex-shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 px-4 pt-4 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`mr-4 pb-3 text-sm font-medium border-b-2 whitespace-nowrap capitalize transition-colors ${
                  activeTab === tab
                    ? "border-green-500 text-green-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab === "all" ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Invoice list */}
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : invoices.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <FileText size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No invoices yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => setSelectedId(inv.id)}
                  className={`flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedInvoice?.id === inv.id ? "bg-green-50/50 border-l-2 border-l-green-500" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {inv.clients?.name ?? "—"}
                      </p>
                      <p className="text-sm font-bold text-gray-900 tabular-nums shrink-0">
                        {fmt(inv.total_amount ?? 0, currency)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-400 font-mono">{inv.invoice_number}</p>
                      <StatusPill status={inv.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Invoice preview */}
        <div className="flex-1 min-w-0">
          <InvoicePreview invoice={selectedInvoice} currency={currency} />
        </div>
      </div>

      {/* Invoice Builder */}
      {showBuilder && (
        <InvoiceBuilder
          clients={clients}
          currency={currency}
          onClose={() => setShowBuilder(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
