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

const ADJUSTMENT_TYPES = [
  {
    id: "accrual",
    label: "Accrual Entry",
    icon: Clock,
    color: "text-blue-500",
    bg: "bg-blue-50",
    description: "Record revenue or expense before cash settlement",
  },
  {
    id: "prepaid",
    label: "Prepaid Expense",
    icon: CreditCard,
    color: "text-purple-500",
    bg: "bg-purple-50",
    description: "Amortize prepaid costs over time",
  },
  {
    id: "depreciation",
    label: "Depreciation",
    icon: TrendingDown,
    color: "text-orange-500",
    bg: "bg-orange-50",
    description: "Record asset depreciation adjustments",
  },
  {
    id: "reclassification",
    label: "Reclassification",
    icon: ArrowLeftRight,
    color: "text-teal-500",
    bg: "bg-teal-50",
    description: "Move transactions between accounts",
  },
  {
    id: "revenue",
    label: "Revenue Recognition",
    icon: DollarSign,
    color: "text-green-500",
    bg: "bg-green-50",
    description: "Recognize deferred revenue as earned",
  },
  {
    id: "correction",
    label: "Correction Entry",
    icon: AlertCircle,
    color: "text-red-500",
    bg: "bg-red-50",
    description: "Fix errors in previously posted transactions",
  },
];

const STEPS = ["Select Accounts", "Enter Amounts", "Add Details", "Review & Post"];

const ACCOUNTS = [
  "Salaries Expense",
  "Accrued Liabilities",
  "Depreciation Expense",
  "Accumulated Depreciation",
  "Insurance Expense",
  "Prepaid Insurance",
  "Brand & PR",
  "Marketing",
  "Deferred Revenue",
  "Product Revenue",
  "Accounts Payable",
  "Consulting Fees",
  "SaaS Expense",
  "Prepaid SaaS",
  "Cash – Ecobank Main",
  "Accounts Receivable",
];

const HISTORY = [
  {
    date: "Mar 31, 2026",
    type: "Accrual",
    description: "March payroll accrual",
    debit: "Salaries Expense",
    credit: "Accrued Liabilities",
    amount: "$45,000",
    postedBy: "Abena Owusu",
    status: "Posted",
  },
  {
    date: "Mar 31, 2026",
    type: "Depreciation",
    description: "Equipment Q1 depreciation",
    debit: "Depreciation Expense",
    credit: "Accumulated Depreciation",
    amount: "$9,200",
    postedBy: "Abena Owusu",
    status: "Posted",
  },
  {
    date: "Mar 30, 2026",
    type: "Prepaid",
    description: "Insurance prepaid amortization",
    debit: "Insurance Expense",
    credit: "Prepaid Insurance",
    amount: "$2,400",
    postedBy: "Kofi Mensah",
    status: "Posted",
  },
  {
    date: "Mar 28, 2026",
    type: "Reclassification",
    description: "Marketing to brand expense",
    debit: "Brand & PR",
    credit: "Marketing",
    amount: "$3,500",
    postedBy: "Ama Darko",
    status: "Posted",
  },
  {
    date: "Mar 25, 2026",
    type: "Revenue Recognition",
    description: "Feb deferred SaaS revenue",
    debit: "Deferred Revenue",
    credit: "Product Revenue",
    amount: "$18,000",
    postedBy: "Abena Owusu",
    status: "Posted",
  },
  {
    date: "Mar 20, 2026",
    type: "Correction",
    description: "Fix vendor payment coding",
    debit: "Accounts Payable",
    credit: "Consulting Fees",
    amount: "$5,200",
    postedBy: "Kofi Mensah",
    status: "Posted",
  },
  {
    date: "Mar 15, 2026",
    type: "Accrual",
    description: "Q1 bonus accrual",
    debit: "Salary Expense",
    credit: "Accrued Liabilities",
    amount: "$22,000",
    postedBy: "Abena Owusu",
    status: "Draft",
  },
  {
    date: "Mar 10, 2026",
    type: "Prepaid",
    description: "SaaS license amortization",
    debit: "SaaS Expense",
    credit: "Prepaid SaaS",
    amount: "$1,800",
    postedBy: "Adwoa Frimpong",
    status: "Posted",
  },
];

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

function AccountDropdown({ label, value, onChange }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = ACCOUNTS.filter((a) =>
    a.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div
        className="w-full border border-gray-200 rounded-md px-3 py-2 bg-white text-sm cursor-pointer flex items-center justify-between"
        onClick={() => setOpen(!open)}
      >
        <span className={value ? "text-gray-900" : "text-gray-400"}>
          {value || "Search and select account..."}
        </span>
        <ChevronRight size={14} className={`text-gray-400 transition-transform ${open ? "rotate-90" : ""}`} />
      </div>
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <input
              className="w-full text-sm outline-none px-2 py-1"
              placeholder="Type to search..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <ul className="max-h-44 overflow-y-auto">
            {filtered.map((a) => (
              <li
                key={a}
                className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                onClick={() => {
                  onChange(a);
                  setOpen(false);
                  setQuery("");
                }}
              >
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function WizardStep1({ form, setForm }) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <AccountDropdown
        label="Debit Account"
        value={form.debitAccount}
        onChange={(v) => setForm((f) => ({ ...f, debitAccount: v }))}
      />
      <AccountDropdown
        label="Credit Account"
        value={form.creditAccount}
        onChange={(v) => setForm((f) => ({ ...f, creditAccount: v }))}
      />
    </div>
  );
}

function WizardStep2({ form, setForm }) {
  return (
    <div className="grid grid-cols-3 gap-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
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
          value={form.period}
          onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
        >
          <option value="">Select period...</option>
          <option value="Q1 2026">Q1 2026</option>
          <option value="March 2026">March 2026</option>
          <option value="February 2026">February 2026</option>
          <option value="January 2026">January 2026</option>
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
          placeholder="Describe the purpose of this adjustment..."
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
            Drop files here or{" "}
            <span className="text-green-500 font-medium">browse</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">PDF, PNG, XLSX up to 10MB</p>
        </div>
      </div>
    </div>
  );
}

function WizardStep4({ form, selectedType }) {
  const typeLabel = ADJUSTMENT_TYPES.find((t) => t.id === selectedType)?.label || "";
  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Entry Summary</h4>
        <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
          <tbody>
            {[
              ["Type", typeLabel],
              ["Debit Account", form.debitAccount || "—"],
              ["Credit Account", form.creditAccount || "—"],
              ["Amount", form.amount ? `$${Number(form.amount).toLocaleString()}` : "—"],
              ["Date", form.date || "—"],
              ["Period", form.period || "—"],
              ["Description", form.description || "—"],
              ["Reference", form.reference || "—"],
            ].map(([key, val]) => (
              <tr key={key} className="border-b border-gray-100 last:border-0">
                <td className="px-4 py-2 text-gray-500 font-medium w-40">{key}</td>
                <td className="px-4 py-2 text-gray-900 tabular-nums">{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Impact Preview</h4>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              P&L Impact
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Revenue</span>
                <span className="tabular-nums text-gray-900">—</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Expenses</span>
                <span className="tabular-nums text-red-500">
                  {form.amount ? `+$${Number(form.amount).toLocaleString()}` : "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t border-gray-200 pt-1 mt-1">
                <span className="text-gray-700">Net Income</span>
                <span className="tabular-nums text-red-500">
                  {form.amount ? `-$${Number(form.amount).toLocaleString()}` : "—"}
                </span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Balance Sheet
            </p>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Assets</span>
                <span className="tabular-nums text-gray-900">No change</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Liabilities</span>
                <span className="tabular-nums text-green-600">
                  {form.amount ? `+$${Number(form.amount).toLocaleString()}` : "—"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Equity</span>
                <span className="tabular-nums text-red-500">
                  {form.amount ? `-$${Number(form.amount).toLocaleString()}` : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Adjust() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState({
    debitAccount: "",
    creditAccount: "",
    amount: "",
    date: "",
    period: "",
    description: "",
    reference: "",
  });

  const handleCardClick = (typeId) => {
    setSelectedType(typeId);
    setCurrentStep(0);
    setForm({
      debitAccount: "",
      creditAccount: "",
      amount: "",
      date: "",
      period: "",
      description: "",
      reference: "",
    });
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep((s) => s + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
    else setSelectedType(null);
  };

  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-[#F7F7F8] py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Journal Adjustments</h1>
          <p className="text-[#6B7280] mt-1 text-sm">
            Create manual journal entries and corrections
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-300 placeholder:text-gray-400"
            placeholder="Search accounts, transactions, or adjustments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Adjustment Types */}
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
              {currentStep === 0 && <WizardStep1 form={form} setForm={setForm} />}
              {currentStep === 1 && <WizardStep2 form={form} setForm={setForm} />}
              {currentStep === 2 && <WizardStep3 form={form} setForm={setForm} />}
              {currentStep === 3 && (
                <WizardStep4 form={form} selectedType={selectedType} />
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
                onClick={isLastStep ? () => setSelectedType(null) : handleNext}
                className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
              >
                {isLastStep ? "Post Entry" : "Next"}
                {!isLastStep && <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* Adjustment History */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-[#111827] mb-4">Adjustment History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  {["Date", "Type", "Description", "Debit Account", "Credit Account", "Amount", "Posted By", "Status"].map(
                    (col) => (
                      <th
                        key={col}
                        className="text-left text-xs font-semibold text-[#6B7280] uppercase tracking-wide pb-3 pr-4 last:pr-0"
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {HISTORY.map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">{row.date}</td>
                    <td className="py-3 pr-4 text-gray-900 font-medium whitespace-nowrap">{row.type}</td>
                    <td className="py-3 pr-4 text-gray-600">{row.description}</td>
                    <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">{row.debit}</td>
                    <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">{row.credit}</td>
                    <td className="py-3 pr-4 text-gray-900 font-medium tabular-nums whitespace-nowrap">
                      {row.amount}
                    </td>
                    <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">{row.postedBy}</td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          row.status === "Posted"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
