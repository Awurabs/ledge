import { useState } from "react";
import { Building2, Shield, CreditCard, Receipt, FileText, ChevronRight, Check, AlertCircle, Plus, Edit2 } from "lucide-react";

const tabs = [
  { id: "company", label: "Company", icon: Building2 },
  { id: "policies", label: "Spend Policies", icon: Shield },
  { id: "tax", label: "Tax & Accounting", icon: FileText },
  { id: "security", label: "Security", icon: Shield },
  { id: "billing", label: "Billing", icon: CreditCard },
];

const policies = [
  {
    id: 1, name: "Travel Policy",
    text: "Single-trip travel expenses may not exceed $1,500 without Finance Lead approval. International travel requires 48-hour advance notice.",
    condition: "Travel expense", operator: "exceeds", value: "$1,500", action: "Require Finance Lead approval",
  },
  {
    id: 2, name: "Meals & Entertainment",
    text: "Meal expenses are capped at $75 per person. Team events require manager approval for groups over 8 people.",
    condition: "Meals expense per person", operator: "exceeds", value: "$75", action: "Flag for review",
  },
  {
    id: 3, name: "SaaS & Software",
    text: "New software subscriptions over $500/month require IT Manager and Finance Lead co-approval. Renewals auto-approve if within 10% of prior year.",
    condition: "SaaS subscription", operator: "exceeds", value: "$500/month", action: "Require IT Manager + Finance Lead co-approval",
  },
  {
    id: 4, name: "Reimbursements",
    text: "Employee reimbursement requests must include a valid receipt and be submitted within 30 days of purchase.",
    condition: "Reimbursement submitted", operator: "is", value: "missing receipt", action: "Block submission",
  },
];

const loginHistory = [
  { date: "Mar 31, 2026 10:42 AM", device: "MacBook Pro", location: "Accra, GH", ip: "197.251.x.x", status: "Success" },
  { date: "Mar 30, 2026 08:15 AM", device: "iPhone 15", location: "Accra, GH", ip: "197.251.x.x", status: "Success" },
  { date: "Mar 29, 2026 07:58 AM", device: "MacBook Pro", location: "Accra, GH", ip: "197.251.x.x", status: "Success" },
  { date: "Mar 28, 2026 11:22 PM", device: "Unknown", location: "Lagos, NG", ip: "105.112.x.x", status: "Blocked" },
  { date: "Mar 27, 2026 09:04 AM", device: "MacBook Pro", location: "Accra, GH", ip: "197.251.x.x", status: "Success" },
];

function CompanyTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Company Information</h3>
        <div className="grid grid-cols-2 gap-4">
          {[["Company Name", "Acme Finance Ltd"], ["Industry", "Financial Services"], ["Company Size", "25–50 employees"], ["Country", "Ghana"], ["Currency", "GHS – Ghanaian Cedi"], ["Timezone", "Africa/Accra"]].map(([label, value]) => (
            <div key={label}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
              <input defaultValue={value} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact Details</h3>
        <div className="grid grid-cols-2 gap-4">
          {[["Admin Email", "abena.owusu@acmefinance.com"], ["Phone", "+233 30 123 4567"], ["Address", "14 Independence Ave, Accra Central"]].map(([label, value]) => (
            <div key={label} className={label === "Address" ? "col-span-2" : ""}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
              <input defaultValue={value} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
            </div>
          ))}
        </div>
      </div>
      <button className="bg-green-500 text-white rounded-md px-5 py-2 text-sm font-medium hover:bg-green-600">Save Changes</button>
    </div>
  );
}

function PoliciesTab() {
  const [editingId, setEditingId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">Define rules that automatically flag or block out-of-policy spending.</p>
        <button onClick={() => setShowAdd(!showAdd)} className="bg-green-500 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-green-600 flex items-center gap-1.5">
          <Plus size={14} /> Add Policy
        </button>
      </div>
      <div className="space-y-3">
        {policies.map(p => (
          <div key={p.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            {editingId === p.id ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-900">{p.name} — Edit</p>
                <div className="flex gap-2 flex-wrap items-center text-sm text-gray-700">
                  <span className="font-medium">IF</span>
                  <input defaultValue={p.condition} className="border border-gray-300 rounded px-2 py-1 text-xs w-36" />
                  <select defaultValue={p.operator} className="border border-gray-300 rounded px-2 py-1 text-xs">
                    <option>exceeds</option><option>is</option><option>less than</option>
                  </select>
                  <input defaultValue={p.value} className="border border-gray-300 rounded px-2 py-1 text-xs w-24" />
                  <span className="font-medium">THEN</span>
                  <input defaultValue={p.action} className="border border-gray-300 rounded px-2 py-1 text-xs flex-1 min-w-[160px]" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingId(null)} className="bg-green-500 text-white rounded px-3 py-1.5 text-xs font-medium">Save Policy</button>
                  <button onClick={() => setEditingId(null)} className="text-gray-500 text-xs hover:text-gray-700">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900 text-sm mb-1">{p.name}</p>
                  <p className="text-sm text-gray-600">{p.text}</p>
                </div>
                <button onClick={() => setEditingId(p.id)} className="shrink-0 flex items-center gap-1 text-xs text-gray-500 border border-gray-200 rounded px-2.5 py-1.5 hover:bg-gray-50">
                  <Edit2 size={11} /> Edit
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TaxTab() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Tax & Accounting Settings</h3>
      <div className="grid grid-cols-2 gap-4">
        {[["Fiscal Year End", "December 31"], ["Accounting Method", "Accrual"], ["Tax ID", "GH-TIN-2024-8847"], ["VAT Number", "VAT/GH-8847-0012"], ["Chart of Accounts Standard", "IFRS"], ["Default Currency", "GHS – Ghanaian Cedi"], ["Standard Tax Rate", "15%"], ["Revenue Recognition", "Completion of Service"]].map(([label, value]) => (
          <div key={label}>
            <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
            <input defaultValue={value} className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
          </div>
        ))}
      </div>
      <button className="mt-5 bg-green-500 text-white rounded-md px-5 py-2 text-sm font-medium hover:bg-green-600">Save Changes</button>
    </div>
  );
}

function SecurityTab() {
  const [twoFA, setTwoFA] = useState(true);
  const [timeout, setTimeout_] = useState("1 hour");
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900 text-sm">Two-Factor Authentication</p>
            <p className="text-xs text-gray-500 mt-0.5">Require 2FA for all team members accessing Ledge</p>
          </div>
          <button onClick={() => setTwoFA(!twoFA)} className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${twoFA ? "bg-green-500" : "bg-gray-300"}`}>
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${twoFA ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <p className="font-semibold text-gray-900 text-sm mb-3">Session Timeout</p>
        <select value={timeout} onChange={e => setTimeout_(e.target.value)} className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500">
          {["30 minutes", "1 hour", "4 hours", "8 hours"].map(o => <option key={o}>{o}</option>)}
        </select>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="font-semibold text-gray-900 text-sm">Login History</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Date & Time", "Device", "Location", "IP Address", "Status"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loginHistory.map((row, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-600">{row.date}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{row.device}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{row.location}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{row.ip}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${row.status === "Success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {row.status === "Success" ? <Check size={10} /> : <AlertCircle size={10} />}
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-6 py-4">
          <button className="text-sm text-red-600 border border-red-300 rounded-md px-4 py-2 hover:bg-red-50 font-medium">Revoke All Sessions</button>
        </div>
      </div>
    </div>
  );
}

function BillingTab() {
  const invoices = ["Mar 2026", "Feb 2026", "Jan 2026", "Dec 2025", "Nov 2025", "Oct 2025"];
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-bold text-gray-900 text-lg">Growth Plan</p>
            <p className="text-2xl font-bold tabular-nums text-gray-900 mt-1">$149<span className="text-sm font-normal text-gray-500">/month</span></p>
          </div>
          <button className="bg-green-500 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-green-600">Upgrade to Enterprise</button>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-4 text-sm text-gray-600">
          {["Up to 25 users", "Up to 50 cards", "Unlimited transactions", "AI Copilot access", "Basic integrations", "Email support"].map(f => (
            <div key={f} className="flex items-center gap-2"><Check size={13} className="text-green-500" />{f}</div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <p className="font-semibold text-gray-900 text-sm mb-4">Usage</p>
        <div className="space-y-3">
          {[{ label: "Users", used: 12, total: 25 }, { label: "Cards", used: 18, total: 50 }, { label: "Transactions this month", used: 847, total: null }].map(item => (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{item.label}</span>
                <span className="tabular-nums text-gray-900 font-medium">{item.used}{item.total ? `/${item.total}` : " (unlimited)"}</span>
              </div>
              {item.total && <div className="h-1.5 bg-gray-100 rounded-full"><div className="h-1.5 bg-green-500 rounded-full" style={{ width: `${(item.used / item.total) * 100}%` }} /></div>}
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
          <span className="text-gray-500">Next billing date</span>
          <span className="font-medium text-gray-900">April 1, 2026</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-gray-500">Payment method</span>
          <span className="font-medium text-gray-900">Visa ending in 4821</span>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="font-semibold text-gray-900 text-sm">Invoice History</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Period", "Amount", "Status", ""].map(h => <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv, i) => (
              <tr key={inv} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-6 py-3 text-gray-700">{inv}</td>
                <td className="px-6 py-3 tabular-nums text-gray-900 font-medium">$149.00</td>
                <td className="px-6 py-3"><span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">Paid</span></td>
                <td className="px-6 py-3"><button className="text-xs text-gray-400 hover:text-green-600">Download PDF</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const tabContent = { company: CompanyTab, policies: PoliciesTab, tax: TaxTab, security: SecurityTab, billing: BillingTab };

export default function Settings() {
  const [activeTab, setActiveTab] = useState("company");
  const TabComponent = tabContent[activeTab];
  return (
    <div className="flex gap-6">
      {/* Left nav */}
      <div className="w-48 shrink-0">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm border-b border-gray-100 last:border-0 transition-colors border-l-[3px] ${active ? "bg-green-50 text-green-700 font-semibold border-l-green-500" : "text-gray-600 hover:bg-gray-50 border-l-transparent hover:border-l-gray-200"}`}>
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <TabComponent />
      </div>
    </div>
  );
}
