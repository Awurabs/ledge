import { useState } from "react";
import {
  Plus, CheckCircle, AlertCircle, Clock, Building2,
  ChevronDown, Calendar, Mail,
} from "lucide-react";
import {
  useBills, useBillInbox, useApproveBill, useMarkBillPaid,
} from "../hooks/useBills";
import { useAuth } from "../context/AuthContext";
import { fmt, fmtDate } from "../lib/fmt";

// ── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

// ── Status config (lowercase DB values) ──────────────────────────────────────
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
        <button className="px-3 py-1.5 text-xs font-semibold bg-green-500 text-white rounded-lg hover:bg-green-600">
          Create Bill
        </button>
        <button className="px-3 py-1.5 text-xs font-medium bg-white text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Bills() {
  const { orgCurrency } = useAuth();
  const currency = orgCurrency ?? "GHS";

  const [activeTab, setActiveTab] = useState("all");

  const queryFilters = activeTab !== "all" ? { status: activeTab } : {};
  if (activeTab === "overdue") queryFilters.overdue = true;

  const { data: bills = [],       isLoading }  = useBills(queryFilters);
  const { data: inboxItems = [] }               = useBillInbox();
  const approveMut  = useApproveBill();
  const markPaidMut = useMarkBillPaid();

  const allBills = useBills({}).data ?? bills;

  // Summary stats
  const pendingTotal  = bills.filter((b) => b.status === "pending").reduce((s, b) => s + (b.amount ?? 0), 0);
  const overdueTotal  = bills.filter((b) => b.status === "overdue").reduce((s, b) => s + (b.amount ?? 0), 0);
  const scheduledTotal = bills.filter((b) => b.status === "scheduled").reduce((s, b) => s + (b.amount ?? 0), 0);
  const paidTotal     = bills.filter((b) => b.status === "paid").reduce((s, b) => s + (b.amount ?? 0), 0);

  const tabs = ["all", "pending", "scheduled", "paid", "overdue"];

  const handleApprove = (id) => approveMut.mutate({ id });
  const handlePayNow  = (id) => markPaidMut.mutate({
    id,
    paymentDate: new Date().toISOString().slice(0, 10),
  });

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bills & Payables</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage vendor bills and payment schedules</p>
        </div>
        <button className="flex items-center gap-2 bg-green-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-600">
          <Plus size={15} />
          Add Bill
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Pending",   value: pendingTotal,   icon: Clock,        color: "text-amber-600",   bg: "bg-amber-50"   },
          { label: "Overdue",   value: overdueTotal,   icon: AlertCircle,  color: "text-red-600",     bg: "bg-red-50"     },
          { label: "Scheduled", value: scheduledTotal, icon: Calendar,     color: "text-blue-600",    bg: "bg-blue-50"    },
          { label: "Paid MTD",  value: paidTotal,      icon: CheckCircle,  color: "text-green-600",   bg: "bg-green-50"   },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <div className={`${stat.bg} p-2 rounded-lg`}>
                <stat.icon size={16} className={stat.color} />
              </div>
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-28" />
            ) : (
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
          {inboxItems.map((item) => (
            <InboxItem key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Bills Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Header + tabs */}
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

        {/* Table */}
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
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
                  const vendor   = bill.bill_vendors;
                  const status   = bill.status ?? "pending";
                  const isPending  = status === "pending";
                  const isOverdue  = status === "overdue";
                  const isPaid     = status === "paid";
                  const isScheduled = status === "scheduled";
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
                          {vendor?.category ?? bill.chart_of_accounts?.name ?? "—"}
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
                      <td className="px-3 py-3.5">
                        <StatusPill status={status} />
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex items-center gap-1.5">
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
            {bills.length} bill{bills.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
