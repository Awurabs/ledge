import { useState, useMemo } from "react";
import {
  Plus, Search, X, Mail, Phone, MapPin, Edit2,
  Archive, CheckCircle, AlertCircle, FileText,
  User, TrendingUp, MoreHorizontal, ChevronRight,
} from "lucide-react";
import { useContacts, useCreateContact, useUpdateContact, useArchiveContact } from "../hooks/useContacts";
import { useAuth } from "../context/AuthContext";
import { fmt, fmtDate } from "../lib/fmt";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

const STATUS_CFG = {
  draft:          { bg: "bg-gray-100",  text: "text-gray-500",  label: "Draft"   },
  sent:           { bg: "bg-blue-50",   text: "text-blue-700",  label: "Sent"    },
  paid:           { bg: "bg-green-50",  text: "text-green-700", label: "Paid"    },
  overdue:        { bg: "bg-red-50",    text: "text-red-700",   label: "Overdue" },
  partially_paid: { bg: "bg-amber-50",  text: "text-amber-700", label: "Partial" },
  void:           { bg: "bg-gray-100",  text: "text-gray-400",  label: "Void"    },
};

function avatarColor(name = "") {
  const colors = [
    "from-green-400 to-emerald-600",
    "from-blue-400 to-indigo-600",
    "from-purple-400 to-violet-600",
    "from-orange-400 to-red-500",
    "from-pink-400 to-rose-600",
    "from-teal-400 to-cyan-600",
  ];
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(hash) % colors.length];
}

function Avatar({ name, size = "md" }) {
  const sz  = size === "lg" ? "w-12 h-12 text-base" : size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  const col = avatarColor(name);
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br ${col} flex items-center justify-center text-white font-bold shrink-0`}>
      {(name ?? "?")[0].toUpperCase()}
    </div>
  );
}

// Compute per-contact invoice stats from the joined data
function contactStats(contact) {
  const invoices = contact.invoices ?? [];
  const active   = invoices.filter((i) => i.status !== "void");
  const totalInvoiced  = active.reduce((s, i) => s + (i.total_amount ?? 0), 0);
  const outstanding    = active
    .filter((i) => !["paid", "void"].includes(i.status ?? ""))
    .reduce((s, i) => s + (i.amount_due ?? 0), 0);
  const invoiceCount   = active.length;
  const lastInvoice    = active.sort((a, b) => new Date(b.issue_date) - new Date(a.issue_date))[0];
  return { totalInvoiced, outstanding, invoiceCount, lastInvoice };
}

// ─────────────────────────────────────────────────────────────────────────────
// ContactFormModal  (add + edit)
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: "", email: "", phone: "", address: "",
  tax_id: "", payment_terms: "Net 30", notes: "", type: "customer",
};

function ContactFormModal({ contact, onClose }) {
  const isEdit    = !!contact;
  const createMut = useCreateContact();
  const updateMut = useUpdateContact();
  const isPending = createMut.isPending || updateMut.isPending;
  const mutError  = createMut.error || updateMut.error;

  const [form, setForm] = useState(
    isEdit
      ? { name: contact.name ?? "", email: contact.email ?? "", phone: contact.phone ?? "",
          address: contact.address ?? "", tax_id: contact.tax_id ?? "",
          payment_terms: contact.payment_terms ?? "Net 30", notes: contact.notes ?? "",
          type: contact.type ?? "customer" }
      : { ...EMPTY_FORM }
  );

  const upd = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isEdit) {
      updateMut.mutate({ id: contact.id, ...form }, { onSuccess: onClose });
    } else {
      createMut.mutate(form, { onSuccess: onClose });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
              <User size={16} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {isEdit ? "Edit Customer" : "New Customer"}
              </h2>
              <p className="text-xs text-gray-400">{isEdit ? contact.name : "Add a new customer to invoice"}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
            {mutError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                <AlertCircle size={14} className="shrink-0" />
                {mutError.message ?? "Something went wrong. Please try again."}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                Name <span className="text-red-400">*</span>
              </label>
              <input required value={form.name} onChange={(e) => upd("name", e.target.value)}
                placeholder="Acme Limited"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={(e) => upd("email", e.target.value)}
                  placeholder="billing@acme.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone</label>
                <input value={form.phone} onChange={(e) => upd("phone", e.target.value)}
                  placeholder="+233 24 000 0000"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Address</label>
              <textarea rows={2} value={form.address} onChange={(e) => upd("address", e.target.value)}
                placeholder="Street, City, Country"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>

            {/* Tax ID + Payment Terms */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tax / VAT ID</label>
                <input value={form.tax_id} onChange={(e) => upd("tax_id", e.target.value)}
                  placeholder="GH-TIN-0000000"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Default Payment Terms</label>
                <select value={form.payment_terms} onChange={(e) => upd("payment_terms", e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-400">
                  {["Due on receipt", "Net 7", "Net 14", "Net 30", "Net 60", "Net 90"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Contact Type</label>
              <div className="flex gap-2">
                {[
                  { value: "customer", label: "Customer" },
                  { value: "vendor",   label: "Vendor"   },
                  { value: "both",     label: "Both"     },
                ].map((opt) => (
                  <button key={opt.value} type="button"
                    onClick={() => upd("type", opt.value)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg border-2 transition-all ${
                      form.type === opt.value
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Internal Notes</label>
              <textarea rows={2} value={form.notes} onChange={(e) => upd("notes", e.target.value)}
                placeholder="Any notes about this customer…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
            <button type="submit" disabled={isPending}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {isPending
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                : <><CheckCircle size={14} /> {isEdit ? "Save Changes" : "Add Customer"}</>
              }
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium py-2.5 rounded-xl transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CustomerDetail panel
// ─────────────────────────────────────────────────────────────────────────────

function CustomerDetail({ contact, currency, onEdit, onClose }) {
  const { invoiceCount, totalInvoiced, outstanding, lastInvoice } = contactStats(contact);
  const invoices = [...(contact.invoices ?? [])]
    .filter((i) => i.status !== "void")
    .sort((a, b) => new Date(b.issue_date) - new Date(a.issue_date));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-50 to-white px-6 py-5 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={contact.name} size="lg" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">{contact.name}</h3>
              {contact.email && (
                <a href={`mailto:${contact.email}`}
                  className="text-sm text-green-600 hover:underline flex items-center gap-1 mt-0.5">
                  <Mail size={12} /> {contact.email}
                </a>
              )}
              {contact.phone && (
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                  <Phone size={12} /> {contact.phone}
                </p>
              )}
              {contact.address && (
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <MapPin size={11} /> {contact.address}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              <Edit2 size={12} /> Edit
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: "Total Invoiced",  value: fmt(totalInvoiced, currency),      icon: TrendingUp,  color: "text-green-600"  },
            { label: "Outstanding",     value: fmt(outstanding, currency),         icon: AlertCircle, color: outstanding > 0 ? "text-amber-600" : "text-gray-400" },
            { label: "Invoices",        value: invoiceCount,                       icon: FileText,    color: "text-blue-600"   },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 px-3 py-3 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <s.icon size={12} className={s.color} />
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{s.label}</span>
              </div>
              <p className="text-sm font-bold text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Info strips */}
      <div className="px-6 py-3 border-b border-gray-50 flex items-center justify-between text-xs">
        <span className="text-gray-400">Payment Terms</span>
        <span className="font-semibold text-gray-700">{contact.payment_terms ?? "Net 30"}</span>
      </div>
      {contact.tax_id && (
        <div className="px-6 py-3 border-b border-gray-50 flex items-center justify-between text-xs">
          <span className="text-gray-400">Tax / VAT ID</span>
          <span className="font-mono font-semibold text-gray-700">{contact.tax_id}</span>
        </div>
      )}

      {/* Invoice history */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Invoice History</p>
          {invoices.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileText size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No invoices yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => {
                const cfg = STATUS_CFG[inv.status] ?? STATUS_CFG.draft;
                return (
                  <div key={inv.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-gray-100/60 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 font-mono">{inv.invoice_number}</p>
                      <p className="text-xs text-gray-400">{fmtDate(inv.issue_date)}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                      <p className="text-sm font-bold text-gray-900 tabular-nums">
                        {fmt(inv.total_amount ?? 0, currency)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {contact.notes && (
        <div className="px-6 py-4 border-t border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Notes</p>
          <p className="text-xs text-gray-500 leading-relaxed">{contact.notes}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function Customers() {
  const { orgCurrency } = useAuth();
  const currency = orgCurrency ?? "GHS";

  const [search,          setSearch]          = useState("");
  const [typeFilter,      setTypeFilter]       = useState("all");
  const [selectedId,      setSelectedId]       = useState(null);
  const [showForm,        setShowForm]         = useState(false);
  const [editingContact,  setEditingContact]   = useState(null); // null = new, object = edit
  const [toast,           setToast]            = useState(null);
  const [openMenuId,      setOpenMenuId]       = useState(null);

  const { data: contacts = [], isLoading } = useContacts({
    search: search.trim() || undefined,
  });
  const archiveMut = useArchiveContact();

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Client-side type filter
  const displayed = useMemo(() => {
    if (typeFilter === "all") return contacts;
    return contacts.filter((c) => c.type === typeFilter || c.type === "both");
  }, [contacts, typeFilter]);

  const selectedContact = displayed.find((c) => c.id === selectedId) ?? null;

  // Aggregate stats across all contacts
  const totalCustomers = displayed.length;
  const totalInvoiced  = displayed.reduce((s, c) => s + contactStats(c).totalInvoiced, 0);
  const totalOutstanding = displayed.reduce((s, c) => s + contactStats(c).outstanding, 0);

  function handleArchive(contact) {
    if (!confirm(`Archive "${contact.name}"? They won't appear in new invoices.`)) return;
    archiveMut.mutate(
      { id: contact.id },
      {
        onSuccess: () => { setSelectedId(null); showToast(`${contact.name} archived.`); },
        onError:   (e) => showToast(e.message, "error"),
      }
    );
    setOpenMenuId(null);
  }

  function openEdit(contact) {
    setEditingContact(contact);
    setShowForm(true);
    setOpenMenuId(null);
  }

  function openNew() {
    setEditingContact(null);
    setShowForm(true);
  }

  const TYPE_TABS = [
    { id: "all",      label: "All"       },
    { id: "customer", label: "Customers" },
    { id: "vendor",   label: "Vendors"   },
    { id: "both",     label: "Both"      },
  ];

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[70] text-sm font-medium px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 ${
          toast.type === "error" ? "bg-red-600 text-white" : "bg-gray-900 text-white"
        }`}>
          {toast.type === "error"
            ? <AlertCircle size={15} className="text-red-200" />
            : <CheckCircle size={15} className="text-green-400" />}
          {toast.msg}
        </div>
      )}

      {/* Add / Edit modal */}
      {showForm && (
        <ContactFormModal
          contact={editingContact}
          onClose={() => { setShowForm(false); setEditingContact(null); }}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your customers, vendors, and contacts</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm">
          <Plus size={15} /> Add Customer
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Contacts",  value: isLoading ? "…" : totalCustomers,        sub: "Active contacts",      icon: User,        color: "text-blue-600",   bg: "bg-blue-50"   },
          { label: "Total Invoiced",  value: isLoading ? "…" : fmt(totalInvoiced, currency), sub: "Lifetime",      icon: TrendingUp,  color: "text-green-600",  bg: "bg-green-50"  },
          { label: "Outstanding",     value: isLoading ? "…" : fmt(totalOutstanding, currency), sub: "Unpaid",    icon: AlertCircle, color: totalOutstanding > 0 ? "text-amber-600" : "text-gray-400", bg: "bg-amber-50" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-500">{s.label}</p>
              <div className={`${s.bg} p-2 rounded-lg`}><s.icon size={15} className={s.color} /></div>
            </div>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Main layout */}
      <div className="flex gap-5 items-start">

        {/* Contact list */}
        <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col ${selectedContact ? "w-[420px] shrink-0" : "flex-1"}`}>
          {/* Search + filter */}
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50" />
            </div>
            <div className="flex gap-1">
              {TYPE_TABS.map((tab) => (
                <button key={tab.id} onClick={() => setTypeFilter(tab.id)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    typeFilter === tab.id
                      ? "bg-green-500 text-white"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-40" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-3.5 w-20" />
                  </div>
                ))}
              </div>
            ) : displayed.length === 0 ? (
              <div className="py-20 text-center text-gray-400">
                <User size={32} className="mx-auto mb-3 opacity-20" />
                <p className="font-semibold text-sm">No contacts found</p>
                {!search && (
                  <button onClick={openNew}
                    className="mt-3 text-xs text-green-600 font-semibold hover:underline">
                    Add your first customer →
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {displayed.map((contact) => {
                  const { totalInvoiced: ti, outstanding: ot, invoiceCount: ic } = contactStats(contact);
                  const isSelected = selectedId === contact.id;
                  return (
                    <div key={contact.id}
                      onClick={() => setSelectedId(isSelected ? null : contact.id)}
                      className={`flex items-center gap-3 px-5 py-4 cursor-pointer transition-colors hover:bg-gray-50 group ${
                        isSelected ? "bg-green-50/60 border-l-[3px] border-l-green-500" : "border-l-[3px] border-l-transparent"
                      }`}>
                      <Avatar name={contact.name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{contact.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {contact.email && (
                            <p className="text-xs text-gray-400 truncate">{contact.email}</p>
                          )}
                          {contact.type !== "customer" && (
                            <span className="text-[10px] bg-purple-50 text-purple-600 font-semibold px-1.5 py-0.5 rounded-full capitalize shrink-0">
                              {contact.type}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gray-900 tabular-nums">{fmt(ti, currency)}</p>
                        <p className="text-xs text-gray-400">{ic} invoice{ic !== 1 ? "s" : ""}</p>
                      </div>

                      {/* Actions menu */}
                      <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === contact.id ? null : contact.id)}
                          className="p-1.5 rounded-lg text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-600 transition-all">
                          <MoreHorizontal size={15} />
                        </button>
                        {openMenuId === contact.id && (
                          <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-xl w-40 py-1 overflow-hidden">
                            <button onClick={() => openEdit(contact)}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                              <Edit2 size={13} /> Edit
                            </button>
                            <button onClick={() => handleArchive(contact)}
                              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                              <Archive size={13} /> Archive
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
            {isLoading ? "Loading…" : `${displayed.length} contact${displayed.length !== 1 ? "s" : ""}`}
          </div>
        </div>

        {/* Detail panel */}
        {selectedContact && (
          <div className="flex-1 min-w-0" style={{ minHeight: 500 }}>
            <CustomerDetail
              contact={selectedContact}
              currency={currency}
              onEdit={() => openEdit(selectedContact)}
              onClose={() => setSelectedId(null)}
            />
          </div>
        )}
      </div>

      {/* Click outside to close menu */}
      {openMenuId && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
      )}
    </div>
  );
}
