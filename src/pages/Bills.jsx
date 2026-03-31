import { useState } from "react";
import {
  Plus,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Clock,
  Building2,
  Mail,
  ChevronDown,
  Eye,
  Calendar,
} from "lucide-react";

const inboxItems = [
  { id: 1, vendor: "MTN Business", amount: "4200", date: "Mar 31, 2026", confidence: "High" },
  { id: 2, vendor: "Electricity Company of Ghana", amount: "1840", date: "Mar 31, 2026", confidence: "High" },
  { id: 3, vendor: "Zain Fiber", amount: "980", date: "Mar 30, 2026", confidence: "Medium" },
];

const bills = [
  { id: 1, vendor: "MTN Business", billNo: "BILL-MTN-0847", amount: 4200, due: "Apr 5, 2026", status: "Pending", category: "Telecom", actions: ["Approve", "Schedule"] },
  { id: 2, vendor: "Electricity Co. Ghana", billNo: "BILL-ECG-0291", amount: 1840, due: "Apr 3, 2026", status: "Pending", category: "Utilities", actions: ["Approve", "Schedule"] },
  { id: 3, vendor: "WeWork Accra", billNo: "BILL-WW-0144", amount: 8400, due: "Apr 1, 2026", status: "Scheduled", category: "Facilities", actions: [] },
  { id: 4, vendor: "Databank Software", billNo: "BILL-DB-0562", amount: 6800, due: "Apr 8, 2026", status: "Pending", category: "SaaS", actions: ["Approve", "Schedule"] },
  { id: 5, vendor: "Enterprise Insurance", billNo: "BILL-EI-0089", amount: 12000, due: "Mar 31, 2026", status: "Overdue", category: "Insurance", actions: ["Pay Now"] },
  { id: 6, vendor: "Accra Water Authority", billNo: "BILL-AWA-0441", amount: 520, due: "Apr 2, 2026", status: "Pending", category: "Utilities", actions: ["Approve", "Schedule"] },
  { id: 7, vendor: "Regus Office Space", billNo: "BILL-RG-0203", amount: 3200, due: "Apr 10, 2026", status: "Pending", category: "Facilities", actions: ["Approve", "Schedule"] },
  { id: 8, vendor: "AWS Cloud Services", billNo: "BILL-AWS-1092", amount: 9400, due: "Mar 28, 2026", status: "Paid", category: "Technology", actions: [] },
  { id: 9, vendor: "Salesforce CRM", billNo: "BILL-SF-0338", amount: 5600, due: "Apr 15, 2026", status: "Pending", category: "SaaS", actions: ["Approve", "Schedule"] },
  { id: 10, vendor: "DHL Logistics", billNo: "BILL-DHL-0765", amount: 2100, due: "Apr 6, 2026", status: "Pending", category: "Logistics", actions: ["Approve", "Schedule"] },
  { id: 11, vendor: "Standard Chartered", billNo: "BILL-SC-0912", amount: 4500, due: "Apr 20, 2026", status: "Pending", category: "Finance", actions: ["Approve", "Schedule"] },
  { id: 12, vendor: "Vodafone Business", billNo: "BILL-VF-0234", amount: 1650, due: "Mar 25, 2026", status: "Paid", category: "Telecom", actions: [] },
  { id: 13, vendor: "Jumia Business", billNo: "BILL-JB-0447", amount: 890, due: "Apr 12, 2026", status: "Pending", category: "Office", actions: ["Approve", "Schedule"] },
  { id: 14, vendor: "Google Workspace", billNo: "BILL-GW-0128", amount: 1200, due: "Mar 30, 2026", status: "Paid", category: "Technology", actions: [] },
  { id: 15, vendor: "Acer Enterprise", billNo: "BILL-AC-0093", amount: 7800, due: "Apr 25, 2026", status: "Pending", category: "Equipment", actions: ["Approve", "Schedule"] },
];

const statusConfig = {
  Pending: { bg: "bg-amber-100", text: "text-amber-700" },
  Scheduled: { bg: "bg-blue-100", text: "text-blue-700" },
  Paid: { bg: "bg-green-100", text: "text-green-700" },
  Overdue: { bg: "bg-red-100", text: "text-red-700" },
};

const actionConfig = {
  Approve: "bg-green-500 text-white hover:bg-green-600",
  Schedule: "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50",
  "Pay Now": "bg-red-500 text-white hover:bg-red-600",
};

const fmt = (n) => "$" + n.toLocaleString("en-US");

function StatusPill({ status }) {
  const cfg = statusConfig[status] || { bg: "bg-gray-100", text: "text-gray-600" };
  return (
    <span className={`rounded-full text-xs px-2.5 py-0.5 font-medium ${cfg.bg} ${cfg.text}`}>
      {status}
    </span>
  );
}

function InboxItem({ item }) {
  const [vendor, setVendor] = useState(item.vendor);
  const [amount, setAmount] = useState(item.amount);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="flex items-center gap-4 py-4 border-b border-gray-100 last:border-0">
      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
        <Mail size={18} className="text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <input
            className="font-semibold text-sm text-gray-900 bg-transparent border-b border-dashed border-gray-300 focus:outline-none focus:border-green-500 min-w-0"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
          />
          <span
            className={`rounded-full text-xs px-2 py-0.5 font-medium shrink-0 ${
              item.confidence === "High"
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {item.confidence} confidence
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <span>$</span>
            <input
              className="w-20 bg-transparent border-b border-dashed border-gray-300 focus:outline-none focus:border-green-500 text-sm text-gray-700"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <span className="text-sm text-gray-400">{item.date}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button className="bg-green-500 text-white rounded-md px-3 py-1.5 text-xs font-medium hover:bg-green-600 transition-colors">
          Add to Bills
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export default function Bills() {
  const [activeTab, setActiveTab] = useState("All");
  const tabs = ["All", "Pending", "Scheduled", "Paid", "Overdue"];

  const filtered =
    activeTab === "All" ? bills : bills.filter((b) => b.status === activeTab);

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bills</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage vendor bills and scheduled payments</p>
        </div>
        <div className="flex gap-3">
          <button className="bg-white text-gray-700 border border-gray-300 rounded-md px-4 py-2 hover:bg-gray-50 transition-colors font-medium text-sm flex items-center gap-2">
            <CreditCard size={15} />
            Pay Bills
          </button>
          <button className="flex items-center gap-2 bg-green-500 text-white rounded-md px-4 py-2 hover:bg-green-600 transition-colors font-medium text-sm">
            <Plus size={15} />
            Add Bill
          </button>
        </div>
      </div>

      {/* Bill Inbox */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <Mail size={16} className="text-blue-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Auto-Captured Bills</h2>
          </div>
          <span className="ml-auto text-xs bg-blue-100 text-blue-700 rounded-full px-2.5 py-0.5 font-medium">
            3 new
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-4 ml-11">
          3 bills captured from email in the last 24 hours
        </p>
        <div className="ml-0">
          {inboxItems.map((item) => (
            <InboxItem key={item.id} item={item} />
          ))}
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <h2 className="text-base font-semibold text-gray-900">All Bills</h2>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md px-3 py-1.5">
              <ChevronDown size={14} />
              Filter
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-gray-200 px-6 mt-4">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`mr-5 pb-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-green-500 text-green-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
              {tab !== "All" && (
                <span className="ml-1.5 text-xs text-gray-400">
                  ({bills.filter((b) => b.status === tab).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-6 py-3">
                  Vendor
                </th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-3">
                  Bill #
                </th>
                <th className="text-right text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-3">
                  Amount
                </th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-3">
                  Due Date
                </th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-3">
                  Category
                </th>
                <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((bill, i) => (
                <tr
                  key={bill.id}
                  className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                    i % 2 === 0 ? "" : "bg-gray-50/30"
                  }`}
                >
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-gray-100 rounded-md flex items-center justify-center shrink-0">
                        <Building2 size={13} className="text-gray-400" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{bill.vendor}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="text-sm text-gray-500 font-mono text-xs">{bill.billNo}</span>
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <span className="text-sm font-semibold text-gray-900">{fmt(bill.amount)}</span>
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-gray-400" />
                      <span
                        className={`text-sm ${
                          bill.status === "Overdue" ? "text-red-600 font-medium" : "text-gray-600"
                        }`}
                      >
                        {bill.due}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3.5">
                    <StatusPill status={bill.status} />
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
                      {bill.category}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-2">
                      {bill.actions.map((action) => (
                        <button
                          key={action}
                          className={`text-xs font-medium rounded-md px-2.5 py-1.5 transition-colors ${actionConfig[action]}`}
                        >
                          {action}
                        </button>
                      ))}
                      <button className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors">
                        <Eye size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-400">
            Showing {filtered.length} of {bills.length} bills
          </p>
          <div className="flex gap-2">
            <button className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-md">
              Previous
            </button>
            <button className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-md">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
