import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Circle,
  Lock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Users,
  Plus,
  X,
  Flag,
  CheckCheck,
} from "lucide-react";
import {
  useClosePeriods,
  useFinancialPeriods,
  useUpdateChecklistItem,
  useStartClosePeriod,
  useUpdateClosePeriod,
  useCreateCloseIssue,
  useResolveCloseIssue,
  useCreateFinancialPeriod,
} from "../hooks/useFinancialPeriods";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

// ── Stage config ──────────────────────────────────────────────────────────────
const STAGE_ORDER = [
  "transaction_review",
  "reconciliations",
  "accruals_adjustments",
  "financial_review",
  "close_lock",
];

const STAGE_LABELS = {
  transaction_review:   "Transaction Review",
  reconciliations:      "Reconciliations",
  accruals_adjustments: "Accruals & Adjustments",
  financial_review:     "Financial Review",
  close_lock:           "Close & Lock",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

function fmt(val, currency = "GHS") {
  const n = val ?? 0;
  const abs = Math.abs(n) / 100;
  const f = new Intl.NumberFormat("en-GH", {
    style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(abs);
  return n < 0 ? `(${f})` : f;
}

function getPeriodRange(period) {
  if (!period) return null;
  const { period_year: year, period_month: month } = period;
  if (!month || month === 0) {
    return { from: `${year}-01-01`, to: `${year}-12-31` };
  }
  const m = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return { from: `${year}-${m}-01`, to: `${year}-${m}-${String(lastDay).padStart(2, "0")}` };
}

// stage status derived from its checklist items
function stageStatus(items) {
  if (!items || items.length === 0) return "pending";
  if (items.every((i) => i.status === "completed")) return "complete";
  if (items.some((i) => i.status === "completed" || i.status === "in_progress")) return "inprogress";
  return "pending";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StageIcon({ status }) {
  if (status === "complete")
    return <CheckCircle2 size={20} className="text-green-500" />;
  if (status === "inprogress")
    return (
      <span className="relative flex h-5 w-5 items-center justify-center">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-50" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
      </span>
    );
  return <Circle size={20} className="text-gray-300" />;
}

function ItemStatusBadge({ status }) {
  const cfg = {
    completed:   { cls: "bg-green-100 text-green-700",  label: "Done" },
    in_progress: { cls: "bg-blue-100 text-blue-700",    label: "In Progress" },
    flagged:     { cls: "bg-red-100 text-red-600",      label: "Flagged" },
    pending:     { cls: "bg-gray-100 text-gray-500",    label: "Pending" },
  };
  const { cls, label } = cfg[status] ?? cfg.pending;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function ChecklistItem({ item, updateMut, locked }) {
  const [expanded, setExpanded] = useState(false);
  const isDone   = item.status === "completed";
  const isFlagged = item.status === "flagged";
  const assigneeName = item.assignee?.profiles?.full_name ?? null;

  const dueLabel = item.due_date
    ? new Date(item.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  const toggleDone = () => {
    if (locked) return;
    updateMut.mutate({
      id:           item.id,
      status:       isDone ? "pending" : "completed",
      completed_at: isDone ? null : new Date().toISOString(),
    });
  };

  const toggleFlag = () => {
    if (locked) return;
    updateMut.mutate({
      id:     item.id,
      status: isFlagged ? "pending" : "flagged",
    });
  };

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleDone}
          disabled={updateMut.isPending || locked}
          className="flex-shrink-0 disabled:opacity-40 hover:scale-110 transition-transform"
        >
          {isDone
            ? <CheckCircle2 size={18} className="text-green-500" />
            : <Circle      size={18} className="text-gray-300 hover:text-gray-400" />
          }
        </button>

        <span className={`flex-1 text-sm ${isDone ? "text-gray-400 line-through" : "text-[#111827] font-medium"}`}>
          {item.title}
        </span>

        <ItemStatusBadge status={item.status} />

        {assigneeName && (
          <div className="flex items-center gap-1 text-xs text-[#6B7280]">
            <Users size={11} />
            <span className="hidden sm:inline">{assigneeName}</span>
          </div>
        )}

        {dueLabel && (
          <div className="flex items-center gap-1 text-xs text-[#6B7280]">
            <Calendar size={11} />
            <span>{dueLabel}</span>
          </div>
        )}

        {!locked && (
          <button
            onClick={toggleFlag}
            disabled={updateMut.isPending}
            title={isFlagged ? "Unflag" : "Flag issue"}
            className={`p-1 rounded transition-colors ${isFlagged ? "text-red-500" : "text-gray-300 hover:text-amber-400"}`}
          >
            <Flag size={13} />
          </button>
        )}

        {item.description && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {expanded && item.description && (
        <div className="mt-2 ml-7 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-xs text-gray-600">
          {item.description}
        </div>
      )}
    </div>
  );
}

function ChecklistSection({ stage, items, updateMut, locked }) {
  const status = stageStatus(items);
  const label  = STAGE_LABELS[stage] ?? stage;
  const done   = items.filter((i) => i.status === "completed").length;

  const sectionColor = {
    complete:   "text-green-600",
    inprogress: "text-blue-600",
    pending:    "text-gray-400",
  };

  return (
    <div className="mb-5 last:mb-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[#111827]">{label}</h3>
          <span className={`text-xs font-medium ${sectionColor[status]}`}>
            {done}/{items.length} done
          </span>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {items.map((item) => (
          <ChecklistItem key={item.id} item={item} updateMut={updateMut} locked={locked} />
        ))}
      </div>
    </div>
  );
}

// ── Issues panel ──────────────────────────────────────────────────────────────
function IssuesPanel({ issues, closePeriodId, createIssueMut, resolveIssueMut, locked }) {
  const [addOpen, setAddOpen]   = useState(false);
  const [title, setTitle]       = useState("");
  const [severity, setSeverity] = useState("medium");

  const open     = issues.filter((i) => !i.is_resolved);
  const resolved = issues.filter((i) => i.is_resolved);

  const handleAdd = () => {
    if (!title.trim()) return;
    createIssueMut.mutate(
      { closePeriodId, title: title.trim(), severity },
      { onSuccess: () => { setTitle(""); setAddOpen(false); } }
    );
  };

  const severityColor = {
    low:      "bg-gray-100 text-gray-600",
    medium:   "bg-amber-100 text-amber-700",
    high:     "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[#111827]">
          Issues
          {open.length > 0 && (
            <span className="ml-2 bg-red-100 text-red-600 text-xs font-semibold px-1.5 py-0.5 rounded-full">
              {open.length} open
            </span>
          )}
        </h2>
        {!locked && (
          <button
            onClick={() => setAddOpen(!addOpen)}
            className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
          >
            <Plus size={12} /> Add
          </button>
        )}
      </div>

      {addOpen && (
        <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
          <input
            className="w-full text-sm border border-gray-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-300"
            placeholder="Describe the issue…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <select
              className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <button
              onClick={handleAdd}
              disabled={!title.trim() || createIssueMut.isPending}
              className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md disabled:opacity-50"
            >
              {createIssueMut.isPending ? "Adding…" : "Add Issue"}
            </button>
            <button onClick={() => setAddOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {issues.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-3">No issues logged</p>
      ) : (
        <ul className="space-y-2">
          {open.map((issue) => (
            <li key={issue.id} className="flex items-start gap-2 group">
              <span
                className={`mt-0.5 shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                  severityColor[issue.severity] ?? severityColor.medium
                }`}
              >
                {issue.severity}
              </span>
              <span className="flex-1 text-xs text-gray-800">{issue.title}</span>
              {!locked && (
                <button
                  onClick={() => resolveIssueMut.mutate({ id: issue.id })}
                  disabled={resolveIssueMut.isPending}
                  title="Mark resolved"
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-green-500 transition-all"
                >
                  <CheckCheck size={14} />
                </button>
              )}
            </li>
          ))}
          {resolved.length > 0 && (
            <li className="pt-2 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">
                Resolved ({resolved.length})
              </p>
              {resolved.map((issue) => (
                <p key={issue.id} className="text-xs text-gray-400 line-through py-0.5">
                  {issue.title}
                </p>
              ))}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// ── Start Close Panel (shown when no active period) ───────────────────────────
function StartClosePanel({ periods, startMut, createPeriodMut }) {
  const now = new Date();
  const [selectedPeriodId, setSelectedPeriodId] = useState(periods[0]?.id ?? "");
  const [targetClose, setTargetClose]           = useState("");

  // New-period fields (used when no financial periods exist)
  const [newYear,  setNewYear]  = useState(now.getFullYear());
  const [newMonth, setNewMonth] = useState(now.getMonth() + 1);

  const MONTHS = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];

  const hasPeriods = periods.length > 0;

  // Step 1: when no periods exist, create one then start the close
  const handleStart = async () => {
    if (hasPeriods) {
      if (!selectedPeriodId) return;
      startMut.mutate({ periodId: selectedPeriodId, targetClose: targetClose || null });
    } else {
      // Auto-create the financial period first, then start close
      const period = await createPeriodMut.mutateAsync({
        year: newYear, month: newMonth,
      });
      startMut.mutate({ periodId: period.id, targetClose: targetClose || null });
    }
  };

  const isPending = startMut.isPending || createPeriodMut.isPending;
  const error     = startMut.error?.message || createPeriodMut.error?.message;

  return (
    <div className="min-h-screen bg-[#F7F7F8] py-16 px-4 flex items-center justify-center">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <Calendar size={24} className="text-green-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Start Month-End Close</h2>
          <p className="text-sm text-gray-500">
            {hasPeriods
              ? "Select a financial period to begin. A standard 18-item checklist will be created automatically."
              : "No financial periods exist yet. Choose a month and we'll create it along with the standard close checklist."}
          </p>
        </div>

        <div className="space-y-4 mb-6">
          {hasPeriods ? (
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                Financial Period
              </label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                Period Month &amp; Year
              </label>
              <div className="grid grid-cols-2 gap-3">
                <select
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
                  value={newMonth}
                  onChange={(e) => setNewMonth(Number(e.target.value))}
                >
                  {MONTHS.map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="2020" max="2030"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                  value={newYear}
                  onChange={(e) => setNewYear(Number(e.target.value))}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
              Target Close Date <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              value={targetClose}
              onChange={(e) => setTargetClose(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={isPending}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Setting up…
            </>
          ) : (
            "Start Close Period"
          )}
        </button>
        {error && <p className="mt-3 text-xs text-red-500 text-center">{error}</p>}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MonthEndClose() {
  const { orgId, orgCurrency } = useAuth();
  const currency = orgCurrency ?? "GHS";

  const { data: closePeriods = [], isLoading } = useClosePeriods();
  const { data: financialPeriods = [] }        = useFinancialPeriods();

  const updateMut        = useUpdateChecklistItem();
  const startMut         = useStartClosePeriod();
  const updatePeriodMut  = useUpdateClosePeriod();
  const createIssueMut   = useCreateCloseIssue();
  const resolveIssueMut  = useResolveCloseIssue();
  const createPeriodMut  = useCreateFinancialPeriod();

  // Period picker — default to most recent in-progress, then open, then first
  const [activePeriodId, setActivePeriodId] = useState(null);

  const activePeriod = useMemo(() => {
    if (closePeriods.length === 0) return null;
    if (activePeriodId) return closePeriods.find((cp) => cp.id === activePeriodId) ?? null;
    return (
      closePeriods.find((cp) => cp.status === "in_progress") ??
      closePeriods.find((cp) => cp.status === "open") ??
      closePeriods[0]
    );
  }, [closePeriods, activePeriodId]);

  // ── Financial summary for the active period ──────────────────────────────
  const fp = activePeriod?.financial_periods;
  const range = fp ? getPeriodRange(fp) : null;

  // ── Revenue: revenue_records + invoices + credit transactions ───────────────
  const { data: periodRevenue = 0 } = useQuery({
    queryKey: ["close_period_revenue", orgId, fp?.id],
    enabled: !!orgId && !!range,
    queryFn: async () => {
      const [revRecords, invoices, creditTxns] = await Promise.all([
        // Manual revenue records (non-invoice-linked)
        supabase
          .from("revenue_records")
          .select("amount")
          .eq("organization_id", orgId)
          .gte("revenue_date", range.from)
          .lte("revenue_date", range.to)
          .is("invoice_id", null),
        // Invoices issued in period (non-draft/void)
        supabase
          .from("invoices")
          .select("total_amount, amount_paid, amount_due, status")
          .eq("organization_id", orgId)
          .gte("issue_date", range.from)
          .lte("issue_date", range.to)
          .not("status", "in", '("draft","void")')
          .is("deleted_at", null),
        // Credit transactions
        supabase
          .from("transactions")
          .select("amount")
          .eq("organization_id", orgId)
          .eq("direction", "credit")
          .gte("txn_date", range.from)
          .lte("txn_date", range.to)
          .is("deleted_at", null),
      ]);
      if (revRecords.error) throw revRecords.error;
      if (invoices.error)   throw invoices.error;
      if (creditTxns.error) throw creditTxns.error;

      const fromRecords = (revRecords.data ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
      const fromInvoices = (invoices.data ?? []).reduce((s, inv) => {
        if (inv.status === "paid") return s + (inv.total_amount ?? 0);
        if (inv.status === "partial" || inv.status === "partially_paid") return s + (inv.amount_paid ?? 0);
        return s + (inv.amount_due ?? inv.total_amount ?? 0);
      }, 0);
      const fromTxns = (creditTxns.data ?? []).reduce((s, t) => s + (t.amount ?? 0), 0);
      return fromRecords + fromInvoices + fromTxns;
    },
  });

  // ── Expenses: expense records + bills + reimbursements ───────────────────────
  const { data: periodExpenses = 0 } = useQuery({
    queryKey: ["close_period_expenses", orgId, fp?.id],
    enabled: !!orgId && !!range,
    queryFn: async () => {
      const [expRecords, bills, reimbursements] = await Promise.all([
        // Expense records
        supabase
          .from("expenses")
          .select("amount")
          .eq("organization_id", orgId)
          .not("status", "eq", "rejected")
          .gte("expense_date", range.from)
          .lte("expense_date", range.to)
          .is("deleted_at", null),
        // Bills
        supabase
          .from("bills")
          .select("amount")
          .eq("organization_id", orgId)
          .gte("bill_date", range.from)
          .lte("bill_date", range.to)
          .not("status", "eq", "void")
          .is("deleted_at", null),
        // Reimbursements
        supabase
          .from("reimbursement_requests")
          .select("total_amount")
          .eq("organization_id", orgId)
          .gte("created_at", range.from)
          .lte("created_at", range.to),
      ]);
      if (expRecords.error)     throw expRecords.error;
      if (bills.error)          throw bills.error;
      if (reimbursements.error) throw reimbursements.error;

      const fromRecords = (expRecords.data     ?? []).reduce((s, e) => s + (e.amount ?? 0), 0);
      const fromBills   = (bills.data          ?? []).reduce((s, b) => s + (b.amount ?? 0), 0);
      const fromReimbs  = (reimbursements.data ?? []).reduce((s, r) => s + (r.total_amount ?? 0), 0);
      return fromRecords + fromBills + fromReimbs;
    },
  });

  const netIncome = periodRevenue - periodExpenses;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F7F8] py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
            </div>
            <div className="space-y-4">
              <Skeleton className="h-48 rounded-lg" />
              <Skeleton className="h-36 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── No close periods exist — show Start panel ─────────────────────────────
  if (!activePeriod) {
    return (
      <StartClosePanel
        periods={financialPeriods}
        startMut={startMut}
        createPeriodMut={createPeriodMut}
      />
    );
  }

  // ── Active period data ────────────────────────────────────────────────────
  const period     = activePeriod.financial_periods;
  const periodName = period?.name ?? "Close Period";
  const allItems   = activePeriod.close_checklist_items ?? [];
  const issues     = activePeriod.close_issues          ?? [];
  const activityLog = activePeriod.close_activity_log   ?? [];

  const completedItems = allItems.filter((i) => i.status === "completed");
  const totalItems     = allItems.length;
  const pct            = totalItems > 0 ? Math.round((completedItems.length / totalItems) * 100) : 0;
  const allDone        = totalItems > 0 && completedItems.length === totalItems;
  const openIssues     = issues.filter((i) => !i.is_resolved).length;
  const isLocked       = activePeriod.status === "locked";

  // Group items by stage
  const itemsByStage = STAGE_ORDER.reduce((acc, stage) => {
    const stageItems = allItems
      .filter((i) => i.stage === stage)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    if (stageItems.length > 0) acc[stage] = stageItems;
    return acc;
  }, {});

  const stageStatuses = STAGE_ORDER.map((stage) => stageStatus(itemsByStage[stage] ?? []));

  const daysToDeadline = activePeriod.target_close
    ? Math.max(0, Math.ceil((new Date(activePeriod.target_close) - new Date()) / 86400000))
    : null;

  const statusBadgeCfg = {
    open:        { cls: "bg-gray-100 text-gray-600 border-gray-200",    label: "Open" },
    in_progress: { cls: "bg-blue-100 text-blue-700 border-blue-200",    label: "In Progress" },
    locked:      { cls: "bg-green-100 text-green-700 border-green-200", label: "Locked" },
  };
  const { cls: badgeCls, label: badgeLabel } = statusBadgeCfg[activePeriod.status] ?? statusBadgeCfg.open;

  const handleLock = () => {
    updatePeriodMut.mutate({ id: activePeriod.id, status: "locked" });
  };

  return (
    <div className="min-h-screen bg-[#F7F7F8] py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-[#111827]">{periodName} Close</h1>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${badgeCls}`}>
              {isLocked && <Lock size={11} className="mr-1" />}
              {badgeLabel}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Period picker */}
            {closePeriods.length > 1 && (
              <select
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                value={activePeriod.id}
                onChange={(e) => setActivePeriodId(e.target.value)}
              >
                {closePeriods.map((cp) => (
                  <option key={cp.id} value={cp.id}>
                    {cp.financial_periods?.name ?? cp.id.slice(0, 8)}
                    {cp.status === "locked" ? " (Locked)" : cp.status === "in_progress" ? " (Active)" : ""}
                  </option>
                ))}
              </select>
            )}

            {/* Start new close */}
            {!closePeriods.some((cp) => cp.status === "in_progress") && (
              <button
                onClick={() => setActivePeriodId("__new__")}
                className="flex items-center gap-2 text-sm text-green-600 border border-green-200 bg-green-50 hover:bg-green-100 px-3 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus size={14} /> New Close
              </button>
            )}

            {/* Lock period */}
            {!isLocked && (
              <button
                disabled={!allDone || openIssues > 0 || updatePeriodMut.isPending}
                onClick={handleLock}
                title={
                  !allDone
                    ? "Complete all checklist items first"
                    : openIssues > 0
                    ? "Resolve all open issues first"
                    : "Lock this period"
                }
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  allDone && openIssues === 0
                    ? "bg-green-500 hover:bg-green-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                <Lock size={14} />
                {updatePeriodMut.isPending ? "Locking…" : "Lock Period"}
              </button>
            )}

            {isLocked && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                <CheckCircle2 size={14} />
                Period Locked
              </div>
            )}
          </div>
        </div>

        {/* Stepper */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-8 py-5">
          {/* Progress bar */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-600">
              {completedItems.length} / {totalItems} tasks completed
            </span>
            <span className="text-xs font-bold text-green-600">{pct}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full mb-5 overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="flex items-center">
            {STAGE_ORDER.map((stage, idx) => (
              <div key={stage} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <StageIcon status={stageStatuses[idx]} />
                  <span
                    className={`mt-1.5 text-xs font-medium text-center max-w-[80px] leading-snug ${
                      stageStatuses[idx] === "complete"
                        ? "text-green-600"
                        : stageStatuses[idx] === "inprogress"
                        ? "text-blue-600"
                        : "text-gray-400"
                    }`}
                  >
                    {STAGE_LABELS[stage]}
                  </span>
                </div>
                {idx < STAGE_ORDER.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-3 mb-5 transition-colors ${
                      stageStatuses[idx] === "complete" ? "bg-green-400" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-3 gap-6">

          {/* LEFT: Checklist */}
          <div className="col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-base font-semibold text-[#111827] mb-5">
                Close Checklist
                {isLocked && (
                  <span className="ml-2 text-xs font-normal text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                    Locked — read only
                  </span>
                )}
              </h2>
              {Object.keys(itemsByStage).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  No checklist items. This close period may have been created manually without items.
                </p>
              ) : (
                STAGE_ORDER.filter((s) => itemsByStage[s]).map((stage) => (
                  <ChecklistSection
                    key={stage}
                    stage={stage}
                    items={itemsByStage[stage]}
                    updateMut={updateMut}
                    locked={isLocked}
                  />
                ))
              )}
            </div>
          </div>

          {/* RIGHT: Panel */}
          <div className="col-span-1 space-y-4">

            {/* Status cards */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 space-y-3">
              <h2 className="text-sm font-semibold text-[#111827]">Close Status</h2>

              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                <div>
                  <p className="text-xs text-[#6B7280] font-medium">Tasks Complete</p>
                  <p className="text-xl font-bold text-[#111827] tabular-nums mt-0.5">
                    {completedItems.length}
                    <span className="text-sm font-normal text-[#6B7280]">/{totalItems}</span>
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 size={18} className="text-green-500" />
                </div>
              </div>

              {daysToDeadline !== null && (
                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-xs text-[#6B7280] font-medium">Days to Target</p>
                    <p className={`text-xl font-bold tabular-nums mt-0.5 ${daysToDeadline <= 2 ? "text-red-600" : "text-[#111827]"}`}>
                      {daysToDeadline}
                    </p>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${daysToDeadline <= 2 ? "bg-red-100" : "bg-amber-100"}`}>
                    <Calendar size={18} className={daysToDeadline <= 2 ? "text-red-400" : "text-amber-500"} />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                <div>
                  <p className="text-xs text-[#6B7280] font-medium">Open Issues</p>
                  <p className={`text-xl font-bold tabular-nums mt-0.5 ${openIssues > 0 ? "text-red-600" : "text-[#111827]"}`}>
                    {openIssues}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${openIssues > 0 ? "bg-red-100" : "bg-gray-100"}`}>
                  <AlertTriangle size={18} className={openIssues > 0 ? "text-red-400" : "text-gray-400"} />
                </div>
              </div>
            </div>

            {/* Period financial summary */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-[#111827] mb-3">Period Summary</h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-green-500" />
                    <span className="text-sm text-gray-600">Revenue</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">
                    {fmt(periodRevenue, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingDown size={14} className="text-red-400" />
                    <span className="text-sm text-gray-600">Expenses</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">
                    {fmt(periodExpenses, currency)}
                  </span>
                </div>
                <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} className={netIncome >= 0 ? "text-green-500" : "text-red-400"} />
                    <span className="text-sm font-semibold text-gray-800">Net Income</span>
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {fmt(netIncome, currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Issues */}
            <IssuesPanel
              issues={issues}
              closePeriodId={activePeriod.id}
              createIssueMut={createIssueMut}
              resolveIssueMut={resolveIssueMut}
              locked={isLocked}
            />

            {/* Activity log */}
            {activityLog.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                <h2 className="text-sm font-semibold text-[#111827] mb-4">Recent Activity</h2>
                <ul className="space-y-3">
                  {activityLog.slice(0, 8).map((entry) => {
                    const name = entry.actor?.full_name ?? "System";
                    const time = entry.created_at
                      ? new Date(entry.created_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric",
                        })
                      : "";
                    return (
                      <li key={entry.id} className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[#111827]">
                            <span className="font-semibold">{name}</span>{" "}
                            {entry.action_text}
                          </p>
                          <p className="text-xs text-[#6B7280] mt-0.5">{time}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
