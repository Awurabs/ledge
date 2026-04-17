import { useState, useMemo } from "react";
import { Search, Plus, Edit2, Archive, X, ChevronRight } from "lucide-react";
import { useChartOfAccounts, useCreateAccount, useUpdateAccount } from "../hooks/useChartOfAccounts";
import { useAuth } from "../context/AuthContext";

const TYPE_MAP = {
  Assets: "asset",
  Liabilities: "liability",
  Equity: "equity",
  Revenue: "revenue",
  Expenses: "expense",
};

const TYPE_DISPLAY = {
  asset: "ASSETS",
  liability: "LIABILITIES",
  equity: "EQUITY",
  revenue: "REVENUE",
  expense: "EXPENSES",
};

const TYPE_ORDER = ["asset", "liability", "equity", "revenue", "expense"];
const ACCOUNT_TYPES = ["Assets", "Liabilities", "Equity", "Revenue", "Expenses"];

function fmt(val) {
  const amount = (val ?? 0) / 100;
  const abs = Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `($${abs})` : `$${abs}`;
}

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

function AddAccountModal({ onClose, accounts }) {
  const createMut = useCreateAccount();
  const [form, setForm] = useState({
    name: "", type: "", code: "", description: "", parentId: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMut.mutate(
      {
        name: form.name,
        type: TYPE_MAP[form.type],
        code: form.code,
        description: form.description || null,
        parent_id: form.parentId || null,
        is_active: true,
      },
      { onSuccess: () => onClose() }
    );
  };

  const parentOptions = accounts.filter((a) => !a.parent_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
        <h2 className="text-base font-semibold text-[#111827] mb-5">Add New Account</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Name <span className="text-red-400">*</span>
            </label>
            <input
              required
              type="text"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="e.g. Prepaid Insurance"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Type <span className="text-red-400">*</span>
            </label>
            <select
              required
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="">Select type...</option>
              {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Code <span className="text-red-400">*</span>
            </label>
            <input
              required
              type="text"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="e.g. 1350"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={2}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
              placeholder="Brief description of this account..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Account</label>
            <select
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
              value={form.parentId}
              onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
            >
              <option value="">None (top-level)</option>
              {parentOptions.map((a) => (
                <option key={a.id} value={a.id}>{a.code} – {a.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={createMut.isPending}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50"
            >
              {createMut.isPending ? "Creating…" : "Create Account"}
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

function AccountRow({ account }) {
  const updateMut = useUpdateAccount();
  const balance = account.current_balance ?? account.balance ?? 0;
  const isNegative = balance < 0;

  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors group">
      <td className={`py-2.5 pr-4 ${account.parent_id ? "pl-12" : "pl-6"}`}>
        <div className="flex items-center gap-2">
          <ChevronRight size={12} className="text-gray-300 flex-shrink-0" />
          <span className="text-sm text-[#111827]">{account.name}</span>
        </div>
      </td>
      <td className="py-2.5 pr-4">
        <span className="text-xs text-[#6B7280] capitalize">{account.type}</span>
      </td>
      <td className="py-2.5 pr-4">
        <span className="text-sm text-[#6B7280] tabular-nums font-mono">{account.code}</span>
      </td>
      <td className="py-2.5 pr-4">
        <span className={`text-sm tabular-nums font-medium ${isNegative ? "text-red-500" : "text-[#111827]"}`}>
          {fmt(balance)}
        </span>
      </td>
      <td className="py-2.5 pr-4">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            account.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {account.is_active ? "Active" : "Archived"}
        </span>
      </td>
      <td className="py-2.5">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#111827] transition-colors">
            <Edit2 size={12} /> Edit
          </button>
          <span className="text-gray-200">|</span>
          <button
            onClick={() =>
              updateMut.mutate({
                id: account.id,
                is_active: !account.is_active,
              })
            }
            disabled={updateMut.isPending}
            className="flex items-center gap-1 text-xs text-[#6B7280] hover:text-red-500 transition-colors disabled:opacity-50"
          >
            <Archive size={12} />
            {account.is_active ? "Archive" : "Restore"}
          </button>
        </div>
      </td>
    </tr>
  );
}

function CategoryHeader({ label }) {
  return (
    <tr className="bg-gray-100">
      <td colSpan={6} className="py-2 pl-4 text-xs font-bold text-[#111827] uppercase tracking-wider">
        {label}
      </td>
    </tr>
  );
}

export default function ChartOfAccounts() {
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("Active");

  const { data: accounts = [], isLoading } = useChartOfAccounts({
    type: typeFilter !== "All" ? TYPE_MAP[typeFilter] : undefined,
    isActive:
      statusFilter === "Active" ? true :
      statusFilter === "Archived" ? false :
      undefined,
    search: search || undefined,
  });

  const grouped = useMemo(() => {
    const map = {};
    for (const a of accounts) {
      const t = a.type;
      if (!map[t]) map[t] = [];
      map[t].push(a);
    }
    return map;
  }, [accounts]);

  return (
    <div className="min-h-screen bg-[#F7F7F8] py-8 px-4">
      {showModal && (
        <AddAccountModal
          onClose={() => setShowModal(false)}
          accounts={accounts}
        />
      )}

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">Chart of Accounts</h1>
            <p className="text-[#6B7280] text-sm mt-1">
              {isLoading
                ? "Loading…"
                : `${accounts.length} account${accounts.length !== 1 ? "s" : ""}${
                    search || typeFilter !== "All" ? " matching filters" : ""
                  }`}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors shadow-sm"
          >
            <Plus size={16} />
            Add Account
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-300 placeholder:text-gray-400"
              placeholder="Search accounts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-300"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="All">All Types</option>
            {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-300"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="Active">Active</option>
            <option value="Archived">Archived</option>
            <option value="All">All Status</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(10)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-white">
                  {["Account Name", "Type", "Code", "Balance", "Status", "Actions"].map((col) => (
                    <th
                      key={col}
                      className="text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide px-4 py-3 last:px-4"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {accounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                      No accounts found
                    </td>
                  </tr>
                ) : (
                  TYPE_ORDER.filter((t) => grouped[t]?.length > 0).map((type) => (
                    <>
                      <CategoryHeader key={`cat-${type}`} label={TYPE_DISPLAY[type]} />
                      {grouped[type].map((account) => (
                        <AccountRow key={account.id} account={account} />
                      ))}
                    </>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-[#6B7280] text-center pb-4">
          Showing {accounts.length} account{accounts.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
