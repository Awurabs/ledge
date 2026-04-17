import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Lock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Calendar,
  Users,
} from "lucide-react";
import { useClosePeriods, useUpdateChecklistItem } from "../hooks/useFinancialPeriods";

// ── Stage configuration ───────────────────────────────────────────────────────
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

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

// ── Derive stage status from its items ───────────────────────────────────────
function stageStatus(items) {
  if (!items || items.length === 0) return "pending";
  if (items.every((i) => i.status === "complete")) return "complete";
  if (items.some((i) => i.status === "complete" || i.status === "in_progress")) return "inprogress";
  return "pending";
}

// ── Icons ─────────────────────────────────────────────────────────────────────
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

function StatusBadge({ status }) {
  const map = {
    complete:    "bg-green-100 text-green-700",
    in_progress: "bg-blue-100 text-blue-700",
    pending:     "bg-gray-100 text-gray-500",
  };
  const labels = {
    complete: "Complete", in_progress: "In Progress", pending: "Pending",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        map[status] ?? "bg-gray-100 text-gray-500"
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}

// ── Checklist Item Row ────────────────────────────────────────────────────────
function ChecklistItem({ item, updateMut }) {
  const [expanded, setExpanded] = useState(false);
  const isDone = item.status === "complete";
  const assigneeName = item.assignee?.profiles?.full_name ?? "—";

  const dueLabel = item.due_date
    ? new Date(item.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  const toggleDone = () => {
    updateMut.mutate({
      id: item.id,
      status: isDone ? "pending" : "complete",
      completed_at: isDone ? null : new Date().toISOString(),
    });
  };

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleDone}
          disabled={updateMut.isPending}
          className="flex-shrink-0 disabled:opacity-50"
        >
          {isDone ? (
            <CheckCircle2 size={18} className="text-green-500" />
          ) : (
            <Circle size={18} className="text-gray-300" />
          )}
        </button>
        <span
          className={`flex-1 text-sm ${
            isDone ? "text-gray-500 line-through" : "text-[#111827] font-medium"
          }`}
        >
          {item.title}
        </span>
        <StatusBadge status={item.status} />
        {assigneeName !== "—" && (
          <div className="flex items-center gap-1 text-xs text-[#6B7280] min-w-[90px] justify-end">
            <Users size={12} />
            <span>{assigneeName}</span>
          </div>
        )}
        {dueLabel && (
          <div className="flex items-center gap-1 text-xs text-[#6B7280] min-w-[52px] justify-end">
            <Calendar size={12} />
            <span>{dueLabel}</span>
          </div>
        )}
        {item.description ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-amber-600 font-medium ml-2 hover:text-amber-700"
          >
            <AlertTriangle size={13} />
            Note
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        ) : (
          <div className="w-16" />
        )}
      </div>
      {expanded && item.description && (
        <div className="mt-2 ml-7 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-xs text-amber-700">
          {item.description}
        </div>
      )}
    </div>
  );
}

// ── Checklist Section ─────────────────────────────────────────────────────────
function ChecklistSection({ stage, items, updateMut }) {
  const status = stageStatus(items);
  const label = STAGE_LABELS[stage] ?? stage;

  const sectionStatusColor = {
    complete:    "text-green-600",
    inprogress:  "text-blue-600",
    pending:     "text-gray-400",
  };
  const sectionStatusLabel = {
    complete:   "All complete",
    inprogress: "In Progress",
    pending:    "Pending",
  };

  return (
    <div className="mb-6 last:mb-0">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-semibold text-[#111827]">{label}</h3>
        <span className={`text-xs font-medium ${sectionStatusColor[status]}`}>
          {sectionStatusLabel[status]}
        </span>
      </div>
      <div className="bg-white rounded-lg border border-gray-200">
        {items.map((item) => (
          <ChecklistItem key={item.id} item={item} updateMut={updateMut} />
        ))}
      </div>
    </div>
  );
}

export default function MonthEndClose() {
  const { data: closePeriods = [], isLoading } = useClosePeriods();
  const updateMut = useUpdateChecklistItem();

  // Use the most recent open/in-progress close period
  const activePeriod =
    closePeriods.find((cp) => cp.status === "in_progress") ??
    closePeriods.find((cp) => cp.status === "open") ??
    closePeriods[0] ??
    null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F7F8] py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}
            </div>
            <div className="space-y-4">
              <Skeleton className="h-48 rounded-lg" />
              <Skeleton className="h-40 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!activePeriod) {
    return (
      <div className="min-h-screen bg-[#F7F7F8] py-8 px-4 flex items-center justify-center">
        <div className="text-center">
          <Lock size={40} className="text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-700">No Active Close Period</h2>
          <p className="text-sm text-gray-500 mt-1">Start a new close period to begin the month-end process.</p>
        </div>
      </div>
    );
  }

  const period = activePeriod.financial_periods;
  const periodName = period?.name ?? "Close Period";

  const allItems = activePeriod.close_checklist_items ?? [];
  const issues = activePeriod.close_issues ?? [];
  const activityLog = activePeriod.close_activity_log ?? [];

  const completedItems = allItems.filter((i) => i.status === "complete");
  const totalItems = allItems.length;
  const allDone = totalItems > 0 && completedItems.length === totalItems;
  const openIssues = issues.filter((iss) => !iss.is_resolved).length;

  // Group items by stage, preserving STAGE_ORDER
  const itemsByStage = STAGE_ORDER.reduce((acc, stage) => {
    const stageItems = allItems
      .filter((i) => i.stage === stage)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    if (stageItems.length > 0) acc[stage] = stageItems;
    return acc;
  }, {});

  // Derive stage statuses for the stepper
  const stageStatuses = STAGE_ORDER.map((stage) => stageStatus(itemsByStage[stage] ?? []));

  const statusLabel = {
    open:      "Open",
    in_progress: "In Progress",
    proposed:  "Proposed",
    closed:    "Closed",
  };

  const statusColor = {
    open:      "bg-gray-100 text-gray-600 border-gray-200",
    in_progress: "bg-blue-100 text-blue-700 border-blue-200",
    proposed:  "bg-amber-100 text-amber-700 border-amber-200",
    closed:    "bg-green-100 text-green-700 border-green-200",
  };

  // Summary metrics from period summary JSON if available
  const summary = activePeriod.period_summary ?? {};

  const daysToDeadline = activePeriod.target_close_date
    ? Math.max(
        0,
        Math.ceil(
          (new Date(activePeriod.target_close_date) - new Date()) / 86400000
        )
      )
    : null;

  return (
    <div className="min-h-screen bg-[#F7F7F8] py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#111827]">{periodName} Close</h1>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                statusColor[activePeriod.status] ?? statusColor["open"]
              }`}
            >
              {statusLabel[activePeriod.status] ?? activePeriod.status}
            </span>
          </div>
          <button
            disabled={!allDone}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              allDone
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            <Lock size={15} />
            Propose Close
          </button>
        </div>

        {/* Horizontal Stepper */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-8 py-5">
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
              <h2 className="text-base font-semibold text-[#111827] mb-5">Close Checklist</h2>
              {Object.keys(itemsByStage).length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No checklist items for this period.</p>
              ) : (
                STAGE_ORDER.filter((s) => itemsByStage[s]).map((stage) => (
                  <ChecklistSection
                    key={stage}
                    stage={stage}
                    items={itemsByStage[stage]}
                    updateMut={updateMut}
                  />
                ))
              )}
            </div>
          </div>

          {/* RIGHT: Summary Panel */}
          <div className="col-span-1 space-y-4">

            {/* Close Status */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-[#111827] mb-4">Close Status</h2>

              <div className="space-y-3 mb-5">
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
                      <p className="text-xs text-[#6B7280] font-medium">Days to Deadline</p>
                      <p className="text-xl font-bold text-[#111827] tabular-nums mt-0.5">
                        {daysToDeadline}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <Calendar size={18} className="text-amber-500" />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-xs text-[#6B7280] font-medium">Issues Open</p>
                    <p className="text-xl font-bold text-[#111827] tabular-nums mt-0.5">
                      {openIssues}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle size={18} className="text-red-400" />
                  </div>
                </div>
              </div>

              {/* Period Summary */}
              {(summary.revenue || summary.net_income || summary.cash_position) && (
                <div className="border-t border-gray-100 pt-4 mb-4">
                  <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">
                    Period Summary
                  </h3>
                  <div className="space-y-2">
                    {summary.revenue && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp size={14} className="text-green-500" />
                          <span className="text-sm text-[#6B7280]">Revenue</span>
                        </div>
                        <span className="text-sm font-semibold text-[#111827] tabular-nums">
                          {summary.revenue}
                        </span>
                      </div>
                    )}
                    {summary.net_income && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DollarSign size={14} className="text-green-500" />
                          <span className="text-sm text-[#6B7280]">Net Income</span>
                        </div>
                        <span className="text-sm font-semibold text-[#111827] tabular-nums">
                          {summary.net_income}
                        </span>
                      </div>
                    )}
                    {summary.cash_position && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DollarSign size={14} className="text-blue-500" />
                          <span className="text-sm text-[#6B7280]">Cash Position</span>
                        </div>
                        <span className="text-sm font-semibold text-[#111827] tabular-nums">
                          {summary.cash_position}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                disabled={!allDone}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  allDone
                    ? "bg-green-500 hover:bg-green-600 text-white"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                <Lock size={14} />
                Propose Close
              </button>
            </div>

            {/* Recent Activity */}
            {activityLog.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h2 className="text-sm font-semibold text-[#111827] mb-4">Recent Activity</h2>
                <ul className="space-y-3">
                  {activityLog.slice(0, 6).map((entry) => {
                    const name = entry.actor?.full_name ?? "Someone";
                    const time = entry.created_at
                      ? new Date(entry.created_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric",
                        })
                      : "";
                    return (
                      <li key={entry.id} className="flex gap-3">
                        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                          {name.charAt(0)}
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
