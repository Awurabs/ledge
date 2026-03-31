import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  Lock,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Calendar,
  Users,
} from "lucide-react";

const STAGES = [
  { id: 1, label: "Transaction Review", status: "complete" },
  { id: 2, label: "Reconciliations", status: "complete" },
  { id: 3, label: "Accruals & Adjustments", status: "inprogress" },
  { id: 4, label: "Financial Review", status: "pending" },
  { id: 5, label: "Close & Lock", status: "pending" },
];

const CHECKLIST_SECTIONS = [
  {
    title: "Transaction Review",
    status: "complete",
    items: [
      {
        done: true,
        task: "All March transactions imported",
        status: "Complete",
        assignee: "Kofi Mensah",
        due: "Mar 29",
        issue: null,
      },
      {
        done: true,
        task: "Duplicate transactions removed",
        status: "Complete",
        assignee: "Kofi Mensah",
        due: "Mar 29",
        issue: null,
      },
      {
        done: true,
        task: "Missing receipts followed up",
        status: "Complete",
        assignee: "Ama Darko",
        due: "Mar 30",
        issue: null,
      },
    ],
  },
  {
    title: "Bank Reconciliations",
    status: "complete",
    items: [
      {
        done: true,
        task: "Ecobank main account reconciled",
        status: "Complete",
        assignee: "Abena Owusu",
        due: "Mar 30",
        issue: null,
      },
      {
        done: true,
        task: "GCB operating account reconciled",
        status: "Complete",
        assignee: "Abena Owusu",
        due: "Mar 30",
        issue: null,
      },
      {
        done: true,
        task: "Petty cash reconciled",
        status: "Complete",
        assignee: "Kofi Mensah",
        due: "Mar 31",
        issue: null,
      },
    ],
  },
  {
    title: "Accruals & Adjustments",
    status: "inprogress",
    items: [
      {
        done: true,
        task: "Payroll accrual posted",
        status: "Complete",
        assignee: "Abena Owusu",
        due: "Mar 31",
        issue: null,
      },
      {
        done: true,
        task: "Depreciation entries posted",
        status: "Complete",
        assignee: "Abena Owusu",
        due: "Mar 31",
        issue: null,
      },
      {
        done: false,
        task: "Prepaid expense amortization",
        status: "In Progress",
        assignee: "Kofi Mensah",
        due: "Mar 31",
        issue: "1 item needs review",
      },
      {
        done: false,
        task: "Revenue recognition adjustments",
        status: "Pending",
        assignee: "Adwoa Frimpong",
        due: "Mar 31",
        issue: null,
      },
    ],
  },
  {
    title: "Financial Review",
    status: "pending",
    items: [
      {
        done: false,
        task: "P&L reviewed by CFO",
        status: "Pending",
        assignee: "Priscilla Owusu",
        due: "Apr 1",
        issue: null,
      },
      {
        done: false,
        task: "Balance sheet ties",
        status: "Pending",
        assignee: "Abena Owusu",
        due: "Apr 1",
        issue: null,
      },
      {
        done: false,
        task: "Variance explanations documented",
        status: "Pending",
        assignee: "Ama Darko",
        due: "Apr 2",
        issue: null,
      },
    ],
  },
];

const RECENT_ACTIVITY = [
  {
    actor: "Abena Owusu",
    action: "posted depreciation entries for Q1",
    time: "2h ago",
  },
  {
    actor: "Kofi Mensah",
    action: "reconciled petty cash account",
    time: "4h ago",
  },
  {
    actor: "Abena Owusu",
    action: "posted March payroll accrual ($45,000)",
    time: "5h ago",
  },
  {
    actor: "Ama Darko",
    action: "confirmed all missing receipts resolved",
    time: "Yesterday",
  },
];

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
    Complete: "bg-green-100 text-green-700",
    "In Progress": "bg-blue-100 text-blue-700",
    Pending: "bg-gray-100 text-gray-500",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        map[status] || "bg-gray-100 text-gray-500"
      }`}
    >
      {status}
    </span>
  );
}

function ChecklistItem({ item }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          {item.done ? (
            <CheckCircle2 size={18} className="text-green-500" />
          ) : (
            <Circle size={18} className="text-gray-300" />
          )}
        </div>
        <span
          className={`flex-1 text-sm ${
            item.done ? "text-gray-500 line-through" : "text-[#111827] font-medium"
          }`}
        >
          {item.task}
        </span>
        <StatusBadge status={item.status} />
        <div className="flex items-center gap-1 text-xs text-[#6B7280] min-w-[90px] justify-end">
          <Users size={12} />
          <span>{item.assignee}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-[#6B7280] min-w-[52px] justify-end">
          <Calendar size={12} />
          <span>{item.due}</span>
        </div>
        {item.issue ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-amber-600 font-medium ml-2 hover:text-amber-700"
          >
            <AlertTriangle size={13} />
            Issues
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        ) : (
          <div className="w-16" />
        )}
      </div>
      {expanded && item.issue && (
        <div className="mt-2 ml-7 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-xs text-amber-700">
          {item.issue}
        </div>
      )}
    </div>
  );
}

function ChecklistSection({ section }) {
  const sectionStatusColor = {
    complete: "text-green-600",
    inprogress: "text-blue-600",
    pending: "text-gray-400",
  };

  return (
    <div className="mb-6 last:mb-0">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-semibold text-[#111827]">{section.title}</h3>
        <span className={`text-xs font-medium ${sectionStatusColor[section.status]}`}>
          {section.status === "complete"
            ? "All complete"
            : section.status === "inprogress"
            ? "In Progress"
            : "Pending"}
        </span>
      </div>
      <div className="bg-white rounded-lg border border-gray-200">
        {section.items.map((item, idx) => (
          <ChecklistItem key={idx} item={item} />
        ))}
      </div>
    </div>
  );
}

const totalTasks = CHECKLIST_SECTIONS.flatMap((s) => s.items).length;
const completedTasks = CHECKLIST_SECTIONS.flatMap((s) => s.items).filter(
  (i) => i.done
).length;
const allDone = completedTasks === totalTasks;

export default function MonthEndClose() {
  return (
    <div className="min-h-screen bg-[#F7F7F8] py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#111827]">March 2026 Close</h1>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 border border-blue-200">
              In Progress
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
            {STAGES.map((stage, idx) => (
              <div key={stage.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <StageIcon status={stage.status} />
                  <span
                    className={`mt-1.5 text-xs font-medium text-center max-w-[80px] leading-snug ${
                      stage.status === "complete"
                        ? "text-green-600"
                        : stage.status === "inprogress"
                        ? "text-blue-600"
                        : "text-gray-400"
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>
                {idx < STAGES.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-3 mb-5 transition-colors ${
                      STAGES[idx + 1].status === "complete" ||
                      stage.status === "complete"
                        ? "bg-green-400"
                        : "bg-gray-200"
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
              {CHECKLIST_SECTIONS.map((section, idx) => (
                <ChecklistSection key={idx} section={section} />
              ))}
            </div>
          </div>

          {/* RIGHT: Summary Panel */}
          <div className="col-span-1 space-y-4">

            {/* Close Status */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-[#111827] mb-4">Close Status</h2>

              {/* Stat Tiles */}
              <div className="space-y-3 mb-5">
                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-xs text-[#6B7280] font-medium">Tasks Complete</p>
                    <p className="text-xl font-bold text-[#111827] tabular-nums mt-0.5">
                      {completedTasks}
                      <span className="text-sm font-normal text-[#6B7280]">
                        /{totalTasks}
                      </span>
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 size={18} className="text-green-500" />
                  </div>
                </div>

                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-xs text-[#6B7280] font-medium">Days to Deadline</p>
                    <p className="text-xl font-bold text-[#111827] tabular-nums mt-0.5">1</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Clock size={18} className="text-amber-500" />
                  </div>
                </div>

                <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-xs text-[#6B7280] font-medium">Issues Open</p>
                    <p className="text-xl font-bold text-[#111827] tabular-nums mt-0.5">1</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle size={18} className="text-red-400" />
                  </div>
                </div>
              </div>

              {/* Period Summary */}
              <div className="border-t border-gray-100 pt-4 mb-4">
                <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">
                  Period Summary
                </h3>
                <div className="space-y-2">
                  {[
                    { label: "Revenue", value: "$642,500", icon: TrendingUp, color: "text-green-500" },
                    { label: "Net Income", value: "$89,500", icon: DollarSign, color: "text-green-500" },
                    { label: "Cash Position", value: "$284,320", icon: DollarSign, color: "text-blue-500" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon size={14} className={color} />
                        <span className="text-sm text-[#6B7280]">{label}</span>
                      </div>
                      <span className="text-sm font-semibold text-[#111827] tabular-nums">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Propose Close button */}
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
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <h2 className="text-sm font-semibold text-[#111827] mb-4">Recent Activity</h2>
              <ul className="space-y-3">
                {RECENT_ACTIVITY.map((a, idx) => (
                  <li key={idx} className="flex gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                      {a.actor.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[#111827]">
                        <span className="font-semibold">{a.actor}</span>{" "}
                        {a.action}
                      </p>
                      <p className="text-xs text-[#6B7280] mt-0.5">{a.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
