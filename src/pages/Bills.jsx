import { useState } from "react";
import {
  Plus, CheckCircle, AlertCircle, Clock, Building2,
  ChevronDown, Calendar, Mail, X, Pencil, Trash2,
} from "lucide-react";
import {
  useBills, useBillInbox, useApproveBill, useMarkBillPaid,
  useCreateBill, useUpdateBill, useDeleteBill,
  useBillVendors, useCreateBillVendor,
} from "../hooks/useBills";
import { useAuth } from "../context/AuthContext";
import { fmt, fmtDate } from "../lib/fmt";

// ── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:   { bg: "bg-amber-100",  text: "text-amber-700",  label: "Pending"   },
  scheduled: { bg: "bg-blue-100",   text: "text-blue-700",   label: "Scheduled" },
  paid:      { bg: "bg-green-100",  text: "text-green-700",  label: "Paid"      },
  overdue:   { bg: "bg-red-100",    text: "text-red-700",    label: "Overdue"   },
  void:      { bg: "bg-gray-100",   text: "text-gray-500",   label: "Void"      },
};

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status?.toLowerCase()] ?? { bg: "bg-gray-100", text: "text-gray-600", label: status ?? "—" };
  return (
    <span className={`rounded-full text-xs px-2.5 py-0.5 font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

const BILL_CATEGORIES = [
  "Rent & Lease", "Utilities", "Telecom & Internet",
  "Salaries & Wages", "Professional Services", "Insurance",
  "Office Supplies", "Marketing & Advertising", "Transport & Logistics",
  "Subscriptions & Software", "Repairs & Maintenance", "Taxes & Levies", "Other",
];

// ── Bill Inbox Item ────────────────────────────────────────────────────────────
function InboxItem({ item }) {
  const confidence = item.confidence ?? "Medium";
  const confColor  = confidence === "High" ? "text-green-600 bg-green-50" : "text-amber-600 bg-amber-50";
  return (
    <div className="flex items-center gap-4 py-4 border-b border-gray-100 last:border-0">
      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
        <Mail size={18} className="text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-semibold text-sm text-gray-900 truncate">
            {item.vendor_name ?? item.extracted_vendor ?? "Unknown Vendor"}
          </p>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${confColor}`}>
            {confidence}
          </span>
        </div>
        <p className="text-xs text-gray-500">
          {item.amount_raw ? `Detected: ${item.amount_raw}` : "Amount not detected"} · {fmtDate(item.created_at)}
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button className="px-3 py-1.5 text-xs font-semibold bg-green-500 text-white rounded-lg hover:bg-green-600">Create Bill</button>
        <button className="px-3 py-1.5 text-xs font-medium bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Dismiss</button>
      </div>
    </div>
  );
}

// ── Bill Form Modal (create + edit) ───────────────────────────────────────────
function BillFormModal({ onClose, currency, initial }) {
  const { data: vendors = [] } = useBillVendors();
  const createBillMut   = useCreateBill();
  const updateBillMut   = useUpdateBill();
  const createVendorMut = useCreateBillVendor();
  const isEdit = !!initial;

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    vendorId:         initial?.contact_id          ?? "",
    newVendorName:    "",
    billNumber:       initial?.bill_number          ?? "",
    billDate:         initial?.bill_date            ?? today,
    dueDate:          initial?.due_date             ?? "",
    scheduledPayDate: initial?.scheduled_pay_date   ?? "",
    amount:           initial ? String((initial.amount / 100).toFixed(2)) : "",
    category:         initial?.category             ?? "",
    description:      initial?.notes ?? initial?.description ?? "",
  });
  const [creatingVendor, setCreatingVendor] = useState(false);
  const [submitError,    setSubmitError]    = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    let vendorId   = form.vendorId;
    let vendorName = vendors.find((v) => v.id === vendorId)?.name ?? "";

    try {
      if (creatingVendor && form.newVendorName.trim()) {
        const v = await createVendorMut.mutateAsync({ name: form.newVendorName.trim() });
        vendorId   = v.id;
        vendorName = v.name;
      }
      if (!vendorId && !isEdit) { setSubmitError("Please select a vendor."); return; }

      const amountMinor = Math.round(parseFloat(form.amount || "0") * 100);
      const payload = {
        ...(vendorId    && { contact_id: vendorId }),
        ...(vendorName  && { vendor_name: vendorName }),
        bill_number:        form.billNumber || undefined,
        bill_date:          form.billDate,
        due_date:           form.dueDate           || null,
        scheduled_pay_date: form.scheduledPayDate  || null,
        amount:             amountMinor,
        category:           form.category.trim()   || null,
        notes:              form.description       || null,
      };

      if (isEdit) {
        await updateBillMut.mutateAsync({ id: initial.id, ...payload });
      } else {
        const status = form.scheduledPayDate ? "scheduled" : "pending";
        await createBillMut.mutateAsync({ ...payload, status });
      }
      onClose();
    } catch (err) {
      setSubmitError(err?.message ?? `Failed to ${isEdit ? "update" : "create"} bill.`);
    }
  };

  const isBusy = createBillMut.isPending || updateBillMut.isPending || createVendorMut.isPending;
  const currencySymbol = currency === "USD" ? "$" : currency === "GBP" ? "£" : "₵";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
        <h2 className="text-base font-semibold text-gray-900 mb-5">{isEdit ? "Edit Bill" : "Add Bill"}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Vendor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vendor {!isEdit && <span className="text-red-400">*</span>}
            </label>
            {creatingVendor ? (
              <div className="flex gap-2">
                <input
                  required
                  type="text"
                  className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                  placeholder="Vendor name"
                  value={form.newVendorName}
                  onChange={(e) => setForm((f) => ({ ...f, newVendorName: e.target.value }))}
                />
                <button type="button" onClick={() => setCreatingVendor(false)} className="text-xs text-gray-500 hover:text-gray-700 px-2">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  required={!isEdit}
                  className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
                  value={form.vendorId}
                  onChange={(e) => setForm((f) => ({ ...f, vendorId: e.target.value }))}
                >
                  <option value="">Select vendor…</option>
                  {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
                <button type="button" onClick={() => setCreatingVendor(true)} className="text-xs text-green-600 hover:text-green-700 font-medium whitespace-nowrap">
                  + New
                </button>
              </div>
            )}
          </div>

          {/* Bill number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bill Number</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="e.g. INV-2026-042"
              value={form.billNumber}
              onChange={(e) => setForm((f) => ({ ...f, billNumber: e.target.value }))}
            />
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bill Date</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                value={form.billDate}
                onChange={(e) => setForm((f) => ({ ...f, billDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Scheduled pay date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schedule Payment Date
              <span className="ml-1 text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              value={form.scheduledPayDate}
              onChange={(e) => setForm((f) => ({ ...f, scheduledPayDate: e.target.value }))}
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currencySymbol}</span>
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

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              <option value="">Select category…</option>
              {BILL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={2}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
              placeholder="Optional notes…"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          {submitError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">{submitError}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isBusy}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50"
            >
              {isBusy ? (isEdit ? "Saving…" : "Creating…") : (isEdit ? "Save Changes" : "Create Bill")}
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

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Bills() {
  const { orgCurrency } = useAuth();
  const currency = orgCurrency ?? "GHS";

  const [activeTab,    setActiveTab]   = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editBill,     setEditBill]    = useState(null);
  const [toast,        setToast]       = useState(null);

  const queryFilters = activeTab !== "all" ? { status: activeTab } : {};
  if (activeTab === "overdue") queryFilters.overdue = true;

  const { data: bills = [],      isLoading } = useBills(queryFilters);
  const { data: inboxItems = [] }             = useBillInbox();
  const approveMut  = useApproveBill();
  const markPaidMut = useMarkBillPaid();
  const deleteMut   = useDeleteBill();

  const allBills = useBills({}).data ?? bills;

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  function handleDelete(bill) {
    const vendorName = bill.contact?.name ?? bill.bill_number ?? "bill";
    if (!window.confirm(`Delete "${vendorName}"? This cannot be undone.`)) return;
    deleteMut.mutate(
      { id: bill.id },
      {
        onSuccess: () => showToast(`Bill "${vendorName}" deleted.`),
        onError:   (err) => showToast(`Error: ${err.message}`),
      },
    );
  }

  const pendingTotal   = bills.filter((b) => b.status === "pending").reduce((s, b) => s + (b.amount ?? 0), 0);
  const overdueTotal   = bills.filter((b) => b.status === "overdue").reduce((s, b) => s + (b.amount ?? 0), 0);
  const scheduledTotal = bills.filter((b) => b.status === "scheduled").reduce((s, b) => s + (b.amount ?? 0), 0);
  const paidTotal      = bills.filter((b) => b.status === "paid").reduce((s, b) => s + (b.amount ?? 0), 0);

  const tabs = ["all", "pending", "scheduled", "paid", "overdue"];

  const handleApprove = (id) => approveMut.mutate({ id });
  const handlePayNow  = (id) => markPaidMut.mutate({
    id,
    paymentDate: new Date().toISOString().slice(0, 10),
  });

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl flex items-center gap-2.5">
          <CheckCircle size={15} className="text-green-400 shrink-0" />
          {toast}
        </div>
      )}

      {showAddModal && <BillFormModal onClose={() => setShowAddModal(false)} currency={currency} />}
      {editBill     && <BillFormModal onClose={() => setEditBill(null)}      currency={currency} initial={editBill} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bills & Payables</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage vendor bills and payment schedules</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-green-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-600"
        >
          <Plus size={15} /> Add Bill
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Pending",   value: pendingTotal,   icon: Clock,       color: "text-amber-600", bg: "bg-amber-50"  },
          { label: "Overdue",   value: overdueTotal,   icon: AlertCircle, color: "text-red-600",   bg: "bg-red-50"    },
          { label: "Scheduled", value: scheduledTotal, icon: Calendar,    color: "text-blue-600",  bg: "bg-blue-50"   },
          { label: "Paid MTD",  value: paidTotal,      icon: CheckCircle, color: "text-green-600", bg: "bg-green-50"  },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <div className={`${stat.bg} p-2 rounded-lg`}><stat.icon size={16} className={stat.color} /></div>
            </div>
            {isLoading ? <Skeleton className="h-7 w-28" /> : (
              <p className="text-xl font-bold text-gray-900">{fmt(stat.value, currency)}</p>
            )}
          </div>
        ))}
      </div>

      {/* Bill Inbox */}
      {inboxItems.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Bill Inbox</h2>
            <span className="rounded-full bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5">
              {inboxItems.length} new
            </span>
          </div>
          {inboxItems.map((item) => <InboxItem key={item.id} item={item} />)}
        </div>
      )}

      {/* Bills Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <h2 className="text-base font-semibold text-gray-900">Bills</h2>
          <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md px-3 py-1.5">
            <ChevronDown size={14} /> Export
          </button>
        </div>

        <div className="flex border-b border-gray-200 px-6 mt-4">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`mr-5 pb-3 text-sm font-medium border-b-2 capitalize transition-colors ${
                activeTab === tab
                  ? "border-green-500 text-green-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "all" ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : bills.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Building2 size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No bills found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Vendor", "Bill #", "Category", "Due Date", "Amount", "Status", "Actions"].map((h) => (
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
                {bills.map((bill, i) => {
                  const vendor      = bill.contact;
                  const status      = bill.status ?? "pending";
                  const isPending   = status === "pending";
                  const isOverdue   = status === "overdue";
                  const isPaid      = status === "paid";
                  const isScheduled = status === "scheduled";
                  const canEdit     = !isPaid && status !== "void";

                  return (
                    <tr
                      key={bill.id}
                      className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i % 2 !== 0 ? "bg-gray-50/30" : ""}`}
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-gray-100 rounded-md flex items-center justify-center shrink-0">
                            <Building2 size={13} className="text-gray-400" />
                          </div>
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[140px]">
                            {vendor?.name ?? "—"}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="text-xs text-gray-400 font-mono">{bill.bill_number ?? "—"}</span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="text-xs text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">
                          {bill.category ?? bill.chart_of_accounts?.name ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={`text-sm ${isOverdue ? "text-red-600 font-semibold" : "text-gray-600"}`}>
                          {fmtDate(bill.due_date)}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <span className="text-sm font-bold text-gray-900">{fmt(bill.amount, currency)}</span>
                      </td>
                      <td className="px-3 py-3.5"><StatusPill status={status} /></td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(isPending || isOverdue) && (
                            <button
                              onClick={() => handleApprove(bill.id)}
                              disabled={approveMut.isPending}
                              className="px-2.5 py-1 text-xs font-semibold bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 whitespace-nowrap"
                            >
                              Approve
                            </button>
                          )}
                          {(isScheduled || isOverdue || isPending) && (
                            <button
                              onClick={() => handlePayNow(bill.id)}
                              disabled={markPaidMut.isPending}
                              className={`px-2.5 py-1 text-xs font-semibold rounded-lg disabled:opacity-50 whitespace-nowrap ${
                                isOverdue
                                  ? "bg-red-500 text-white hover:bg-red-600"
                                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                              }`}
                            >
                              {isOverdue ? "Pay Now" : "Mark Paid"}
                            </button>
                          )}
                          {isPaid && (
                            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                              <CheckCircle size={12} /> Paid
                            </span>
                          )}
                          {/* Edit */}
                          {canEdit && (
                            <button
                              onClick={() => setEditBill(bill)}
                              title="Edit bill"
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(bill)}
                            disabled={deleteMut.isPending}
                            title="Delete bill"
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
          <p className="text-sm text-gray-400">{bills.length} bill{bills.length !== 1 ? "s" : ""}</p>
        </div>
      </div>
    </div>
  );
}
