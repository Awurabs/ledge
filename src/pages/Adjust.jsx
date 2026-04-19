import { useState } from "react";
import {
  Search,
  Clock,
  CreditCard,
  TrendingDown,
  ArrowLeftRight,
  DollarSign,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Paperclip,
  CheckCircle2,
} from "lucide-react";
import { useJournalEntries, useCreateJournalEntry } from "../hooks/useJournalEntries";
import { useChartOfAccounts } from "../hooks/useChartOfAccounts";
import { useFinancialPeriods } from "../hooks/useFinancialPeriods";
import { useAuth } from "../context/AuthContext";

const ADJUSTMENT_TYPES = [
  { id: "accrual",          label: "Accrual Entry",           icon: Clock,          color: "text-blue-500",   bg: "bg-blue-50",   description: "Record revenue or expense before cash settlement" },
  { id: "prepaid",          label: "Prepaid Expense",         icon: CreditCard,     color: "text-purple-500", bg: "bg-purple-50", description: "Amortize prepaid costs over time" },
  { id: "depreciation",     label: "Depreciation",            icon: TrendingDown,   color: "text-orange-500", bg: "bg-orange-50", description: "Record asset depreciation adjustments" },
  { id: "reclassification", label: "Reclassification",        icon: ArrowLeftRight, color: "text-teal-500",   bg: "bg-teal-50",   description: "Move transactions between accounts" },
  { id: "revenue",          label: "Revenue Recognition",     icon: DollarSign,     color: "text-green-500",  bg: "bg-green-50",  description: "Recognize deferred revenue as earned" },
  { id: "correction",       label: "Correction Entry",        icon: AlertCircle,    color: "text-red-500",    bg: "bg-red-50",    description: "Fix errors in previously posted transactions" },
];

const STEPS = ["Select Accounts", "Enter Amounts", "Add Details", "Review & Post"];

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

function fmt(val, currency = "GHS") {
  const amount = (val ?? 0) / 100;
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(str) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

// ── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ currentStep }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, idx) => (
        <div key={step} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                idx < currentStep
                  ? "bg-green-500 text-white"
                  : idx === currentStep
                  ? "bg-green-500 text-white ring-4 ring-green-100"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {idx < currentStep ? <CheckCircle2 size={16} /> : idx + 1}
            </div>
            <span
              className={`mt-1 text-xs font-medium whitespace-nowrap ${
                idx === currentStep ? "text-green-600" : "text-gray-500"
              }`}
            >
              {step}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 mb-5 transition-colors ${
                idx < currentStep ? "bg-green-500" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Account Dropdown (backed by real COA) ────────────────────────────────────
function AccountDropdown({ label, value, onChange, accounts }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = accounts.filter((a) => {
    const q = query.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      (a.code ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div
        className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white text-sm cursor-pointer flex items-center justify-between"
        onClick={() => setOpen(!open)}
      >
        <span className={value ? "text-gray-900" : "text-gray-400"}>
          {value ? `${value.code} – ${value.name}` : "Search and select account…"}
        </span>
        <ChevronRight
          size={14}
          className={`text-gray-400 transition-transform ${open ? "rotate-90" : ""}`}
        />
      </div>
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <input
              className="w-full text-sm outline-none px-2 py-1"
              placeholder="Type to search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <ul className="max-h-44 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400">No accounts found</li>
            ) : (
              filtered.map((a) => (
                <li
                  key={a.id}
                  className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    onChange({ id: a.id, code: a.code, name: a.name, type: a.type });
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <span className="font-mono text-gray-500 mr-2">{a.code}</span>
                  {a.name}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Wizard Steps ─────────────────────────────────────────────────────────────
function WizardStep1({ form, setForm, accounts }) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <AccountDropdown
        label="Debit Account"
        value={form.debitAccount}
        onChange={(v) => setForm((f) => ({ ...f, debitAccount: v }))}
        accounts={accounts}
      />
      <AccountDropdown
        label="Credit Account"
        value={form.creditAccount}
        onChange={(v) => setForm((f) => ({ ...f, creditAccount: v }))}
        accounts={accounts}
      />
    </div>
  );
}

function WizardStep2({ form, setForm, periods }) {
  const { orgCurrency } = useAuth();
  const symbol = orgCurrency === "USD" ? "$" : orgCurrency === "GBP" ? "£" : "₵";

  return (
    <div className="grid grid-cols-3 gap-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            {symbol}
          </span>
          <input
            type="number"
            className="w-full border border-gray-200 rounded-md pl-7 pr-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-green-300"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Entry Date</label>
        <input
          type="date"
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
        <select
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 bg-white"
          value={form.periodId}
          onChange={(e) => setForm((f) => ({ ...f, periodId: e.target.value }))}
        >
          <option value="">Select period…</option>
          {(periods ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function WizardStep3({ form, setForm }) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          rows={3}
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
          placeholder="Describe the purpose of this adjustment…"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
        <input
          type="text"
          className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
          placeholder="e.g. JE-2026-031"
          value={form.reference}
          onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:border-green-400 transition-colors cursor-pointer">
          <Paperclip size={24} className="text-gray-400 mb-2" />
          <p className="text-sm text-gray-500">
            Drop files here or <span className="text-green-500 font-medium">browse</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">PDF, PNG, XLSX up to 10MB</p>
        </div>
      </div>
    </div>
  );
}

// direction: +1 = increases, -1 = decreases, 0 = no effect
function accountImpact(accountType, side /* "debit" | "credit" */) {
  const debitNormal  = ["asset", "expense"];
  const creditNormal = ["liability", "equity", "revenue"];
  if (side === "debit")  return debitNormal.includes(accountType)  ?  1 : -1;
  if (side === "credit") return creditNormal.includes(accountType) ?  1 : -1;
  return 0;
}

function ImpactLine({ label, direction, amount }) {
  if (direction === 0) return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="tabular-nums text-gray-400">No change</span>
    </div>
  );
  const color = direction > 0 ? "text-green-600" : "text-red-500";
  const sign  = direction > 0 ? "+" : "−";
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className={`tabular-nums font-medium ${color}`}>
        {amount ? `${sign}${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : sign}
      </span>
    </div>
  );
}

function WizardStep4({ form, selectedType, periods }) {
  const typeLabel = ADJUSTMENT_TYPES.find((t) => t.id === selectedType)?.label || "";
  const amount    = parseFloat(form.amount || "0");
  const periodName = periods?.find((p) => p.id === form.periodId)?.name ?? (form.periodId || "—");

  const dr = form.debitAccount?.type;
  const cr = form.creditAccount?.type;

  // Compute directional impact per category
  const revenueDir    = (dr === "revenue" ? accountImpact("revenue",    "debit")  : 0)
                      + (cr === "revenue" ? accountImpact("revenue",    "credit") : 0);
  const expensesDir   = (dr === "expense" ? accountImpact("expense",    "debit")  : 0)
                      + (cr === "expense" ? accountImpact("expense",    "credit") : 0);
  const assetsDir     = (dr === "asset"   ? accountImpact("asset",      "debit")  : 0)
                      + (cr === "asset"   ? accountImpact("asset",      "credit") : 0);
  const liabsDir      = (dr === "liability" ? accountImpact("liability", "debit")  : 0)
                      + (cr === "liability" ? accountImpact("liability", "credit") : 0);
  const equityDir     = (dr === "equity"  ? accountImpact("equity",     "debit")  : 0)
                      + (cr === "equity"  ? accountImpact("equity",     "credit") : 0);
  // Net income: revenue up = good, expenses up = bad
  const netDir = revenueDir - expensesDir;

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Entry Summary</h4>
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <tbody>
            {[
              ["Type",           typeLabel],
              ["Debit Account",  form.debitAccount  ? `${form.debitAccount.code} – ${form.debitAccount.name}`  : "—"],
              ["Credit Account", form.creditAccount ? `${form.creditAccount.code} – ${form.creditAccount.name}` : "—"],
              ["Amount",         amount ? amount.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "—"],
              ["Date",           form.date        || "—"],
              ["Period",         periodName],
              ["Description",    form.description || "—"],
              ["Reference",      form.reference   || "—"],
            ].map(([key, val]) => (
              <tr key={key} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-2 text-gray-500 font-medium w-40">{key}</td>
                <td className="px-4 py-2 text-gray-900">{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Impact Preview</h4>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">P&L</p>
            <div className="space-y-1">
              <ImpactLine label="Revenue"    direction={revenueDir}  amount={amount} />
              <ImpactLine label="Expenses"   direction={expensesDir} amount={amount} />
              <div className="border-t border-gray-200 pt-1 mt-1">
                <ImpactLine label="Net Income" direction={netDir}    amount={amount} />
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Balance Sheet</p>
            <div className="space-y-1">
              <ImpactLine label="Assets"      direction={assetsDir}  amount={amount} />
              <ImpactLine label="Liabilities" direction={liabsDir}   amount={amount} />
              <ImpactLine label="Equity"      direction={equityDir}  amount={amount} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  debitAccount: null,
  creditAccount: null,
  amount: "",
  date: "",
  periodId: "",
  description: "",
  reference: "",
};

export default function Adjust() {
  const { orgCurrency } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: accounts = [] } = useChartOfAccounts({ isActive: true });
  const { data: periods = [] } = useFinancialPeriods();
  const { data: entries = [], isLoading: entriesLoading } = useJournalEntries();
  const createMut = useCreateJournalEntry();

  const filteredEntries = searchQuery
    ? entries.filter(
        (e) =>
          (e.description ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (e.reference ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
          (e.type ?? "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : entries;

  const handleCardClick = (typeId) => {
    setSelectedType(typeId);
    setCurrentStep(0);
    setForm(EMPTY_FORM);
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep((s) => s + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
    else setSelectedType(null);
  };

  const isLastStep = currentStep === STEPS.length - 1;

  const handlePost = () => {
    const amountMinor = Math.round(parseFloat(form.amount || "0") * 100);
    createMut.mutate(
      {
        entry: {
          type: selectedType,
          entry_date: form.date || new Date().toISOString().split("T")[0],
          description: form.description,
          reference: form.reference || null,
          period_id: form.periodId || null,
          currency: orgCurrency ?? "GHS",
          status: "posted",
        },
        lines: [
          {
            account_id: form.debitAccount?.id,
            debit_amount: amountMinor,
            credit_amount: 0,
          },
          {
            account_id: form.creditAccount?.id,
            debit_amount: 0,
            credit_amount: amountMinor,
          },
        ],
      },
      { onSuccess: () => setSelectedType(null) }
    );
  };

  return (
    <div className="min-h-screen bg-[#F7F7F8] py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Journal Adjustments</h1>
          <p className="text-[#6B7280] mt-1 text-sm">Create manual journal entries and corrections</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-300 placeholder:text-gray-400"
            placeholder="Search accounts, transactions, or adjustments…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Adjustment Type Cards */}
        <div>
          <h2 className="text-base font-semibold text-[#111827] mb-4">Adjustment Types</h2>
          <div className="grid grid-cols-3 gap-4">
            {ADJUSTMENT_TYPES.map(({ id, label, icon: Icon, color, bg, description }) => (
              <div
                key={id}
                onClick={() => handleCardClick(id)}
                className={`bg-white rounded-lg border p-5 cursor-pointer hover:shadow-md transition-all ${
                  selectedType === id
                    ? "border-green-400 ring-2 ring-green-100"
                    : "border-gray-200"
                }`}
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${bg} mb-3`}>
                  <Icon size={20} className={color} />
                </div>
                <h3 className="text-sm font-semibold text-[#111827] mb-1">{label}</h3>
                <p className="text-xs text-[#6B7280] leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Wizard */}
        {selectedType && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold text-[#111827]">
                New {ADJUSTMENT_TYPES.find((t) => t.id === selectedType)?.label}
              </h3>
              <button
                onClick={() => setSelectedType(null)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>

            <ProgressBar currentStep={currentStep} />

            <div className="min-h-[180px]">
              {currentStep === 0 && (
                <WizardStep1 form={form} setForm={setForm} accounts={accounts} />
              )}
              {currentStep === 1 && (
                <WizardStep2 form={form} setForm={setForm} periods={periods} />
              )}
              {currentStep === 2 && <WizardStep3 form={form} setForm={setForm} />}
              {currentStep === 3 && (
                <WizardStep4 form={form} selectedType={selectedType} periods={periods} />
              )}
            </div>

            <div className="flex items-center justify-between mt-8 pt-4 border-t border-gray-100">
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-50"
              >
                <ChevronLeft size={16} />
                Back
              </button>
              <button
                onClick={isLastStep ? handlePost : handleNext}
                disabled={isLastStep && createMut.isPending}
                className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50"
              >
                {isLastStep
                  ? createMut.isPending ? "Posting…" : "Post Entry"
                  : "Next"}
                {!isLastStep && <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* Adjustment History */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-[#111827] mb-4">Adjustment History</h2>
          <div className="overflow-x-auto">
            {entriesLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    {["Date", "Type", "Description", "Reference", "Amount", "Posted By", "Status"].map((col) => (
                      <th
                        key={col}
                        className="text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide pb-3 pr-4 last:pr-0"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-sm text-gray-400">
                        No journal entries yet
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((entry) => {
                      const postedBy =
                        entry.posted_by_profile?.full_name ??
                        entry.created_by_profile?.full_name ??
                        "—";
                      const amount = entry.total_debit ?? entry.total_amount ?? 0;
                      return (
                        <tr
                          key={entry.id}
                          className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">
                            {formatDate(entry.entry_date)}
                          </td>
                          <td className="py-3 pr-4 text-gray-900 font-medium whitespace-nowrap capitalize">
                            {entry.type?.replace(/_/g, " ") ?? "—"}
                          </td>
                          <td className="py-3 pr-4 text-gray-600 max-w-[200px] truncate">
                            {entry.description ?? "—"}
                          </td>
                          <td className="py-3 pr-4 text-gray-500 font-mono text-xs whitespace-nowrap">
                            {entry.reference ?? "—"}
                          </td>
                          <td className="py-3 pr-4 text-gray-900 font-medium tabular-nums whitespace-nowrap">
                            {amount > 0
                              ? new Intl.NumberFormat("en-GH", {
                                  style: "currency",
                                  currency: orgCurrency ?? "GHS",
                                  minimumFractionDigits: 2,
                                }).format(amount / 100)
                              : "—"}
                          </td>
                          <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">{postedBy}</td>
                          <td className="py-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                entry.status === "posted"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {entry.status === "posted" ? "Posted" : "Draft"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
