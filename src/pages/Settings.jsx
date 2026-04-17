import { useState, useEffect } from "react";
import { Building2, Shield, CreditCard, FileText, Check, AlertCircle, Plus, Edit2 } from "lucide-react";
import {
  useOrganization, useUpdateOrganization,
  useOrgSettings, useUpdateOrgSettings,
} from "../hooks/useOrg";

// ── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

// ── Nav tabs ───────────────────────────────────────────────────────────────────
const TABS = [
  { id: "company",  label: "Company",          icon: Building2 },
  { id: "policies", label: "Spend Policies",   icon: Shield    },
  { id: "tax",      label: "Tax & Accounting", icon: FileText  },
  { id: "security", label: "Security",         icon: Shield    },
  { id: "billing",  label: "Billing",          icon: CreditCard },
];

// ── Static policies (no DB table for spend policies yet) ──────────────────────
const STATIC_POLICIES = [
  {
    id: 1, name: "Travel Policy",
    text: "Single-trip travel expenses may not exceed GH₵ 1,500 without Finance Lead approval. International travel requires 48-hour advance notice.",
    condition: "Travel expense", operator: "exceeds", value: "GH₵ 1,500", action: "Require Finance Lead approval",
  },
  {
    id: 2, name: "Meals & Entertainment",
    text: "Meal expenses are capped at GH₵ 75 per person. Team events require manager approval for groups over 8 people.",
    condition: "Meals expense per person", operator: "exceeds", value: "GH₵ 75", action: "Flag for review",
  },
  {
    id: 3, name: "Reimbursements",
    text: "Employee reimbursement requests must include a valid receipt and be submitted within 30 days of purchase.",
    condition: "Reimbursement submitted", operator: "is", value: "missing receipt", action: "Block submission",
  },
];

const LOGIN_HISTORY = [
  { date: "Apr 16, 2026 10:42 AM", device: "MacBook Pro",  location: "Accra, GH", ip: "197.251.x.x", status: "Success" },
  { date: "Apr 15, 2026 08:15 AM", device: "iPhone 15",    location: "Accra, GH", ip: "197.251.x.x", status: "Success" },
  { date: "Apr 14, 2026 07:58 AM", device: "MacBook Pro",  location: "Accra, GH", ip: "197.251.x.x", status: "Success" },
  { date: "Apr 13, 2026 11:22 PM", device: "Unknown",      location: "Lagos, NG", ip: "105.112.x.x", status: "Blocked" },
];

// ── Company Tab ────────────────────────────────────────────────────────────────
function CompanyTab() {
  const { data: org, isLoading } = useOrganization();
  const updateOrg = useUpdateOrganization();
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (org && !form) {
      setForm({
        name:        org.name        ?? "",
        industry:    org.industry    ?? "",
        size:        org.size        ?? "",
        country:     org.country     ?? "",
        currency:    org.currency    ?? "",
        timezone:    org.timezone    ?? "",
        admin_email: org.admin_email ?? "",
        phone:       org.phone       ?? "",
        address:     org.address     ?? "",
      });
    }
  }, [org]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  if (isLoading) return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
    </div>
  );

  const f = form ?? {};
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Company Information</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            ["Company Name", "name"],
            ["Industry",     "industry"],
            ["Company Size", "size"],
            ["Country",      "country"],
            ["Currency",     "currency"],
            ["Timezone",     "timezone"],
          ].map(([label, field]) => (
            <div key={field}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
              <input
                value={f[field] ?? ""}
                onChange={set(field)}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact Details</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            ["Admin Email", "admin_email", false],
            ["Phone",       "phone",       false],
            ["Address",     "address",     true ],
          ].map(([label, field, full]) => (
            <div key={field} className={full ? "col-span-2" : ""}>
              <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
              <input
                value={f[field] ?? ""}
                onChange={set(field)}
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => {
          const { admin_email, phone, address, ...orgFields } = f;
          updateOrg.mutate(orgFields);
        }}
        disabled={updateOrg.isPending}
        className="bg-green-500 text-white rounded-md px-5 py-2 text-sm font-medium hover:bg-green-600 disabled:opacity-50"
      >
        {updateOrg.isPending ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

// ── Policies Tab ───────────────────────────────────────────────────────────────
function PoliciesTab() {
  const [editingId, setEditingId] = useState(null);
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          Define rules that automatically flag or block out-of-policy spending.
        </p>
        <button className="bg-green-500 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-green-600 flex items-center gap-1.5">
          <Plus size={14} /> Add Policy
        </button>
      </div>
      <div className="space-y-3">
        {STATIC_POLICIES.map(p => (
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
                  <button onClick={() => setEditingId(null)} className="bg-green-500 text-white rounded px-3 py-1.5 text-xs font-medium">
                    Save Policy
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-gray-500 text-xs hover:text-gray-700">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900 text-sm mb-1">{p.name}</p>
                  <p className="text-sm text-gray-600">{p.text}</p>
                </div>
                <button
                  onClick={() => setEditingId(p.id)}
                  className="shrink-0 flex items-center gap-1 text-xs text-gray-500 border border-gray-200 rounded px-2.5 py-1.5 hover:bg-gray-50"
                >
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

// ── Tax Tab ────────────────────────────────────────────────────────────────────
function TaxTab() {
  const { data: settings, isLoading } = useOrgSettings();
  const updateSettings = useUpdateOrgSettings();
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (settings && !form) {
      setForm({
        fiscal_year_end:              settings.fiscal_year_end              ?? "",
        accounting_method:            settings.accounting_method            ?? "",
        tax_id:                       settings.tax_id                       ?? "",
        vat_number:                   settings.vat_number                   ?? "",
        chart_of_accounts_standard:   settings.chart_of_accounts_standard   ?? "",
        default_currency:             settings.default_currency             ?? "",
        standard_tax_rate:            settings.standard_tax_rate            ?? "",
        revenue_recognition:          settings.revenue_recognition          ?? "",
      });
    }
  }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

  if (isLoading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
    </div>
  );

  const f = form ?? {};
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Tax & Accounting Settings</h3>
      <div className="grid grid-cols-2 gap-4">
        {[
          ["Fiscal Year End",              "fiscal_year_end"],
          ["Accounting Method",            "accounting_method"],
          ["Tax ID",                       "tax_id"],
          ["VAT Number",                   "vat_number"],
          ["Chart of Accounts Standard",   "chart_of_accounts_standard"],
          ["Default Currency",             "default_currency"],
          ["Standard Tax Rate",            "standard_tax_rate"],
          ["Revenue Recognition",          "revenue_recognition"],
        ].map(([label, field]) => (
          <div key={field}>
            <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
            <input
              value={f[field] ?? ""}
              onChange={set(field)}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
        ))}
      </div>
      <button
        onClick={() => updateSettings.mutate(form)}
        disabled={updateSettings.isPending}
        className="mt-5 bg-green-500 text-white rounded-md px-5 py-2 text-sm font-medium hover:bg-green-600 disabled:opacity-50"
      >
        {updateSettings.isPending ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}

// ── Security Tab ───────────────────────────────────────────────────────────────
function SecurityTab() {
  const [twoFA,          setTwoFA]          = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState("1 hour");
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900 text-sm">Two-Factor Authentication</p>
            <p className="text-xs text-gray-500 mt-0.5">Require 2FA for all team members accessing Ledge</p>
          </div>
          <button
            onClick={() => setTwoFA(!twoFA)}
            className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${twoFA ? "bg-green-500" : "bg-gray-300"}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${twoFA ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <p className="font-semibold text-gray-900 text-sm mb-3">Session Timeout</p>
        <select
          value={sessionTimeout}
          onChange={e => setSessionTimeout(e.target.value)}
          className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
        >
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
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LOGIN_HISTORY.map((row, i) => (
              <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-600">{row.date}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{row.device}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{row.location}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{row.ip}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    row.status === "Success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {row.status === "Success" ? <Check size={10} /> : <AlertCircle size={10} />}
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-6 py-4">
          <button className="text-sm text-red-600 border border-red-300 rounded-md px-4 py-2 hover:bg-red-50 font-medium">
            Revoke All Sessions
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Billing Tab ────────────────────────────────────────────────────────────────
function BillingTab() {
  const { data: org, isLoading } = useOrganization();
  const plan = org?.org_subscriptions?.[0]?.saas_plans;
  const invoiceMonths = ["Apr 2026", "Mar 2026", "Feb 2026", "Jan 2026", "Dec 2025", "Nov 2025"];

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        {isLoading ? <Skeleton className="h-20 w-full" /> : (
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-gray-900 text-lg">{plan?.name ?? "Growth Plan"}</p>
              <p className="text-2xl font-bold tabular-nums text-gray-900 mt-1">
                {plan?.price_monthly ? `$${plan.price_monthly}` : "$149"}
                <span className="text-sm font-normal text-gray-500">/month</span>
              </p>
            </div>
            <button className="bg-green-500 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-green-600">
              Upgrade Plan
            </button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-4 text-sm text-gray-600">
          {["Up to 25 users", "Up to 50 cards", "Unlimited transactions", "AI Copilot access", "Basic integrations", "Email support"].map(f => (
            <div key={f} className="flex items-center gap-2">
              <Check size={13} className="text-green-500" />{f}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="font-semibold text-gray-900 text-sm">Invoice History</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {["Period", "Amount", "Status", ""].map(h => (
                <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {invoiceMonths.map(inv => (
              <tr key={inv} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-6 py-3 text-gray-700">{inv}</td>
                <td className="px-6 py-3 tabular-nums text-gray-900 font-medium">$149.00</td>
                <td className="px-6 py-3">
                  <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">Paid</span>
                </td>
                <td className="px-6 py-3">
                  <button className="text-xs text-gray-400 hover:text-green-600">Download PDF</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
const TAB_CONTENT = {
  company:  CompanyTab,
  policies: PoliciesTab,
  tax:      TaxTab,
  security: SecurityTab,
  billing:  BillingTab,
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState("company");
  const TabComponent = TAB_CONTENT[activeTab];

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your organization settings and preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Left nav */}
        <div className="w-48 shrink-0">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {TABS.map(tab => {
              const Icon   = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm border-b border-gray-100 last:border-0 transition-colors border-l-[3px] ${
                    active
                      ? "bg-green-50 text-green-700 font-semibold border-l-green-500"
                      : "text-gray-600 hover:bg-gray-50 border-l-transparent hover:border-l-gray-200"
                  }`}
                >
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
    </div>
  );
}
