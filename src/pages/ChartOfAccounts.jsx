import { useState } from "react";
import { Search, Plus, Edit2, Archive, X, ChevronRight } from "lucide-react";

const ACCOUNT_TYPES = ["Assets", "Liabilities", "Equity", "Revenue", "Expenses"];

const ACCOUNTS_DATA = [
  {
    category: "ASSETS",
    groups: [
      {
        label: "Current Assets",
        items: [
          { code: "1010", name: "Cash – Ecobank Main", type: "Asset", balance: 248320, status: "Active" },
          { code: "1020", name: "Cash – GCB Operating", type: "Asset", balance: 36000, status: "Active" },
          { code: "1100", name: "Accounts Receivable", type: "Asset", balance: 142800, status: "Active" },
          { code: "1200", name: "Inventory", type: "Asset", balance: 67200, status: "Active" },
          { code: "1300", name: "Prepaid Expenses", type: "Asset", balance: 18400, status: "Active" },
        ],
      },
      {
        label: "Fixed Assets",
        items: [
          { code: "1500", name: "Property & Equipment", type: "Asset", balance: 340000, status: "Active" },
          { code: "1510", name: "Accum. Depreciation", type: "Asset", balance: -87600, status: "Active" },
          { code: "1600", name: "Intangible Assets", type: "Asset", balance: 125000, status: "Active" },
        ],
      },
    ],
  },
  {
    category: "LIABILITIES",
    groups: [
      {
        label: "Current Liabilities",
        items: [
          { code: "2000", name: "Accounts Payable", type: "Liability", balance: 47230, status: "Active" },
          { code: "2100", name: "Accrued Expenses", type: "Liability", balance: 28400, status: "Active" },
          { code: "2200", name: "Short-term Debt", type: "Liability", balance: 50000, status: "Active" },
          { code: "2300", name: "Deferred Revenue", type: "Liability", balance: 34600, status: "Active" },
        ],
      },
      {
        label: "Long-term Liabilities",
        items: [
          { code: "2500", name: "Long-term Debt", type: "Liability", balance: 200000, status: "Active" },
          { code: "2600", name: "Deferred Tax", type: "Liability", balance: 12400, status: "Active" },
        ],
      },
    ],
  },
  {
    category: "EQUITY",
    groups: [
      {
        label: null,
        items: [
          { code: "3000", name: "Common Stock", type: "Equity", balance: 100000, status: "Active" },
          { code: "3100", name: "Additional Paid-in Capital", type: "Equity", balance: 280000, status: "Active" },
          { code: "3200", name: "Retained Earnings", type: "Equity", balance: 137490, status: "Active" },
        ],
      },
    ],
  },
  {
    category: "REVENUE",
    groups: [
      {
        label: null,
        items: [
          { code: "4000", name: "Product Revenue", type: "Revenue", balance: 480000, status: "Active" },
          { code: "4100", name: "Service Revenue", type: "Revenue", balance: 124000, status: "Active" },
          { code: "4200", name: "Consulting Fees", type: "Revenue", balance: 38500, status: "Active" },
        ],
      },
    ],
  },
  {
    category: "EXPENSES",
    groups: [
      {
        label: null,
        items: [
          { code: "5000", name: "Salaries & Benefits", type: "Expense", balance: 180000, status: "Active" },
          { code: "5100", name: "Marketing & Advertising", type: "Expense", balance: 42000, status: "Active" },
          { code: "5200", name: "Technology & SaaS", type: "Expense", balance: 18400, status: "Active" },
          { code: "5300", name: "Travel & Entertainment", type: "Expense", balance: 8900, status: "Active" },
          { code: "5400", name: "Office & Facilities", type: "Expense", balance: 24000, status: "Active" },
          { code: "5500", name: "Professional Services", type: "Expense", balance: 15000, status: "Active" },
          { code: "5600", name: "Depreciation", type: "Expense", balance: 9200, status: "Active" },
          { code: "5900", name: "COGS – Direct Materials", type: "Expense", balance: 89000, status: "Active" },
        ],
      },
    ],
  },
];

function formatBalance(val) {
  const abs = Math.abs(val).toLocaleString();
  if (val < 0) return `($${abs})`;
  return `$${abs}`;
}

function AddAccountModal({ onClose }) {
  const [form, setForm] = useState({
    name: "",
    type: "",
    code: "",
    description: "",
    parent: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
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
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
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
              value={form.parent}
              onChange={(e) => setForm((f) => ({ ...f, parent: e.target.value }))}
            >
              <option value="">None (top-level)</option>
              <option value="Current Assets">Current Assets</option>
              <option value="Fixed Assets">Fixed Assets</option>
              <option value="Current Liabilities">Current Liabilities</option>
              <option value="Long-term Liabilities">Long-term Liabilities</option>
              <option value="Equity">Equity</option>
              <option value="Revenue">Revenue</option>
              <option value="Expenses">Expenses</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
            >
              Create Account
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

function AccountRow({ account, indent = false, subIndent = false }) {
  const isNegative = account.balance < 0;

  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors group">
      <td className={`py-2.5 pr-4 ${subIndent ? "pl-12" : indent ? "pl-6" : "pl-4"}`}>
        <div className="flex items-center gap-2">
          <ChevronRight size={12} className="text-gray-300 flex-shrink-0" />
          <span className="text-sm text-[#111827]">{account.name}</span>
        </div>
      </td>
      <td className="py-2.5 pr-4">
        <span className="text-xs text-[#6B7280]">{account.type}</span>
      </td>
      <td className="py-2.5 pr-4">
        <span className="text-sm text-[#6B7280] tabular-nums font-mono">{account.code}</span>
      </td>
      <td className="py-2.5 pr-4">
        <span
          className={`text-sm tabular-nums font-medium ${
            isNegative ? "text-red-500" : "text-[#111827]"
          }`}
        >
          {formatBalance(account.balance)}
        </span>
      </td>
      <td className="py-2.5 pr-4">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          {account.status}
        </span>
      </td>
      <td className="py-2.5">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#111827] transition-colors">
            <Edit2 size={12} />
            Edit
          </button>
          <span className="text-gray-200">|</span>
          <button className="flex items-center gap-1 text-xs text-[#6B7280] hover:text-red-500 transition-colors">
            <Archive size={12} />
            Archive
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

function GroupHeader({ label }) {
  if (!label) return null;
  return (
    <tr className="bg-gray-50">
      <td colSpan={6} className="py-2 pl-6 text-xs font-semibold text-[#6B7280]">
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

  const allItems = ACCOUNTS_DATA.flatMap((cat) =>
    cat.groups.flatMap((g) => g.items)
  );

  const filteredSearch = search.toLowerCase();

  const shouldShowAccount = (account) => {
    const matchesSearch =
      !search ||
      account.name.toLowerCase().includes(filteredSearch) ||
      account.code.includes(search);
    const matchesType =
      typeFilter === "All" ||
      account.type.toLowerCase().startsWith(typeFilter.toLowerCase().replace(/s$/, ""));
    const matchesStatus =
      statusFilter === "All" || account.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  };

  const totalAccounts = allItems.filter(shouldShowAccount).length;

  return (
    <div className="min-h-screen bg-[#F7F7F8] py-8 px-4">
      {showModal && <AddAccountModal onClose={() => setShowModal(false)} />}

      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">Chart of Accounts</h1>
            <p className="text-[#6B7280] text-sm mt-1">
              {totalAccounts} account{totalAccounts !== 1 ? "s" : ""}
              {search || typeFilter !== "All" ? " matching filters" : ""}
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
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-300 placeholder:text-gray-400"
              placeholder="Search accounts..."
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
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-white">
                {["Account Name", "Type", "Code", "Balance", "Status", "Actions"].map(
                  (col) => (
                    <th
                      key={col}
                      className="text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide px-4 py-3 last:px-4"
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {ACCOUNTS_DATA.map((cat) => {
                const visibleGroups = cat.groups
                  .map((g) => ({
                    ...g,
                    visibleItems: g.items.filter(shouldShowAccount),
                  }))
                  .filter((g) => g.visibleItems.length > 0);

                if (visibleGroups.length === 0) return null;

                return (
                  <>
                    <CategoryHeader key={`cat-${cat.category}`} label={cat.category} />
                    {visibleGroups.map((group, gIdx) => (
                      <>
                        {group.label && (
                          <GroupHeader
                            key={`grp-${cat.category}-${gIdx}`}
                            label={group.label}
                          />
                        )}
                        {group.visibleItems.map((account) => (
                          <AccountRow
                            key={account.code}
                            account={account}
                            indent={!!group.label}
                            subIndent={false}
                          />
                        ))}
                      </>
                    ))}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        <p className="text-xs text-[#6B7280] text-center pb-4">
          Showing {totalAccounts} accounts
        </p>
      </div>
    </div>
  );
}
