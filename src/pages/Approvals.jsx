import { useState } from "react";
import {
  AlertTriangle, CheckCircle, XCircle,
  MessageSquare, Info, ChevronRight,
} from "lucide-react";
import { useApprovals, useDecideApproval, useAddApprovalComment } from "../hooks/useApprovals";
import { useAuth } from "../context/AuthContext";
import { fmt, fmtDate } from "../lib/fmt";

// ── Helpers ────────────────────────────────────────────────────────────────────
function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-purple-500", "bg-indigo-500", "bg-teal-500", "bg-pink-500",
  "bg-blue-500", "bg-emerald-500", "bg-orange-500", "bg-cyan-500",
  "bg-rose-500", "bg-amber-500",
];

function avatarColor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function Avatar({ name, size = "md" }) {
  const sz      = size === "lg" ? "w-12 h-12 text-base" : size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  const initials = getInitials(name);
  const color   = avatarColor(name ?? "");
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {initials}
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

// ── Request type badge ─────────────────────────────────────────────────────────
const TYPE_COLORS = {
  expense:         "bg-blue-50 text-blue-700",
  reimbursement:   "bg-purple-50 text-purple-700",
  invoice:         "bg-green-50 text-green-700",
  bill:            "bg-amber-50 text-amber-700",
  journal:         "bg-gray-100 text-gray-700",
};

function TypeBadge({ type }) {
  const color = TYPE_COLORS[type] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`rounded-full text-xs px-2.5 py-0.5 font-medium capitalize ${color}`}>
      {type?.replace(/_/g, " ") ?? "—"}
    </span>
  );
}

// ── ApprovalCard (left list item) ──────────────────────────────────────────────
function ApprovalCard({ item, isSelected, onClick, isApproved = false }) {
  const name   = item.requestor?.full_name ?? "Unknown";
  const amount = item.amount;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border p-4 mb-3 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "border-green-500 shadow-md shadow-green-100" : "border-gray-200 shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        <Avatar name={name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900">{name}</span>
            {amount != null && (
              <span className="font-bold tabular-nums text-gray-900 text-sm">
                {fmt(amount, item.currency ?? "GHS")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span className="text-xs text-gray-700 font-medium truncate max-w-[180px]">
              {item.description ?? "No description"}
            </span>
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-400">{fmtDate(item.created_at)}</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <TypeBadge type={item.request_type} />
            {isApproved && (
              <span className="rounded-full text-xs px-2.5 py-0.5 font-medium bg-green-50 text-green-700">
                Approved
              </span>
            )}
            {item.decision === "rejected" && (
              <span className="rounded-full text-xs px-2.5 py-0.5 font-medium bg-red-50 text-red-700">
                Rejected
              </span>
            )}
          </div>
          {isApproved && item.decided_by && (
            <p className="text-xs text-gray-400 mt-1.5">
              By <span className="font-medium text-gray-600">{item.decided_by.full_name}</span>
              {" · "}{fmtDate(item.decided_at)}
            </p>
          )}
        </div>
        <ChevronRight
          size={15}
          className={`text-gray-400 flex-shrink-0 mt-0.5 transition-transform ${isSelected ? "rotate-90 text-green-500" : ""}`}
        />
      </div>
    </div>
  );
}

// ── Detail Panel ───────────────────────────────────────────────────────────────
function DetailPanel({ item, currency, onApprove, onDecline, isMutating }) {
  const [comment, setComment]   = useState("");
  const addComment = useAddApprovalComment();

  if (!item) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm h-full flex items-center justify-center">
        <div className="text-center text-gray-400">
          <Info size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">Select a request to review</p>
        </div>
      </div>
    );
  }

  const name         = item.requestor?.full_name ?? "Unknown";
  const isPending    = item.decision === "pending";
  const comments     = item.approval_comments ?? [];

  const handleAddComment = () => {
    if (!comment.trim()) return;
    addComment.mutate({ approvalId: item.id, body: comment }, {
      onSuccess: () => setComment(""),
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Top header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {item.description ?? "Approval Request"}
            </h2>
            <TypeBadge type={item.request_type} />
          </div>
          {item.amount != null && (
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold tabular-nums text-gray-900">
                {fmt(item.amount, item.currency ?? currency)}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{fmtDate(item.created_at)}</div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(100vh-240px)]">
        {/* Requestor */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Requested by</h3>
          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
            <Avatar name={name} size="lg" />
            <div>
              <div className="font-semibold text-gray-900">{name}</div>
              {item.requestor && (
                <div className="text-xs text-gray-400 mt-0.5">Submitted {fmtDate(item.created_at)}</div>
              )}
            </div>
          </div>
        </section>

        {/* Details */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Request Details</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
            <div>
              <span className="text-gray-400 block text-xs">Type</span>
              <span className="font-medium text-gray-900 capitalize">{item.request_type?.replace(/_/g, " ") ?? "—"}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-xs">Amount</span>
              <span className="font-medium text-gray-900">
                {item.amount != null ? fmt(item.amount, item.currency ?? currency) : "—"}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block text-xs">Date submitted</span>
              <span className="font-medium text-gray-900">{fmtDate(item.created_at)}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-xs">Status</span>
              <span className={`font-medium capitalize ${
                item.decision === "approved" ? "text-green-700"
                : item.decision === "rejected" ? "text-red-600"
                : "text-amber-700"
              }`}>
                {item.decision ?? "pending"}
              </span>
            </div>
            {item.description && (
              <div className="col-span-2">
                <span className="text-gray-400 block text-xs">Description</span>
                <span className="font-medium text-gray-900">{item.description}</span>
              </div>
            )}
          </div>
        </section>

        {/* Decision note (if decided) */}
        {item.decision_note && (
          <section>
            <div className={`border rounded-lg p-4 flex gap-3 ${
              item.decision === "approved" ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
            }`}>
              <AlertTriangle size={18} className={`flex-shrink-0 mt-0.5 ${
                item.decision === "approved" ? "text-green-600" : "text-red-600"
              }`} />
              <div>
                <p className="font-semibold text-sm capitalize">{item.decision} note</p>
                <p className="text-sm mt-0.5">{item.decision_note}</p>
              </div>
            </div>
          </section>
        )}

        {/* Approve/Reject — only for pending */}
        {isPending && (
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Decision</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onApprove && onApprove(item.id)}
                disabled={isMutating}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                <CheckCircle size={15} />
                Approve
              </button>
              <button
                onClick={() => onDecline && onDecline(item.id)}
                disabled={isMutating}
                className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                <XCircle size={15} />
                Decline
              </button>
              <button className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 whitespace-nowrap">
                <MessageSquare size={15} />
                Request Info
              </button>
            </div>
          </section>
        )}

        {/* Comments */}
        {comments.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Comments</h3>
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <Avatar name={c.author?.full_name} size="sm" />
                  <div className="bg-gray-50 rounded-lg px-3 py-2 flex-1">
                    <p className="text-xs font-semibold text-gray-700">{c.author?.full_name ?? "—"}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{c.body}</p>
                    <p className="text-xs text-gray-400 mt-1">{fmtDate(c.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Add comment */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Add Comment</h3>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a note or comment..."
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
          />
          <button
            onClick={handleAddComment}
            disabled={!comment.trim() || addComment.isPending}
            className="mt-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add Comment
          </button>
        </section>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Approvals() {
  const { orgCurrency } = useAuth();
  const currency = orgCurrency ?? "GHS";

  const [activeTab,   setActiveTab]   = useState("pending");
  const [selectedId,  setSelectedId]  = useState(null);

  const { data: pendingItems  = [], isLoading: loadingPending  } = useApprovals({ decision: "pending"  });
  const { data: approvedItems = [], isLoading: loadingApproved } = useApprovals({ decision: "approved" });
  const { data: rejectedItems = [], isLoading: loadingRejected } = useApprovals({ decision: "rejected" });
  const decideMut = useDecideApproval();

  const listItems = activeTab === "pending" ? pendingItems
    : activeTab === "approved" ? approvedItems
    : rejectedItems;

  const isLoading = activeTab === "pending" ? loadingPending
    : activeTab === "approved" ? loadingApproved
    : loadingRejected;

  const allItems      = [...pendingItems, ...approvedItems, ...rejectedItems];
  const selectedItem  = allItems.find((i) => i.id === selectedId) ?? null;

  const TABS = [
    { key: "pending",  label: "Pending",  count: pendingItems.length  },
    { key: "approved", label: "Approved", count: approvedItems.length },
    { key: "rejected", label: "Rejected", count: rejectedItems.length },
  ];

  const handleTabChange = (key) => {
    setActiveTab(key);
    const items = key === "pending" ? pendingItems : key === "approved" ? approvedItems : rejectedItems;
    setSelectedId(items[0]?.id ?? null);
  };

  const handleApprove = (id) => {
    decideMut.mutate({ id, decision: "approved" }, {
      onSuccess: () => {
        const next = pendingItems.find((i) => i.id !== id);
        setSelectedId(next?.id ?? null);
      },
    });
  };

  const handleDecline = (id) => {
    decideMut.mutate({ id, decision: "rejected" }, {
      onSuccess: () => {
        const next = pendingItems.find((i) => i.id !== id);
        setSelectedId(next?.id ?? null);
      },
    });
  };

  // Auto-select first item when list loads
  const firstId = listItems[0]?.id;
  if (!selectedId && firstId) setSelectedId(firstId);

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
          <p className="text-sm text-gray-500 mt-0.5">Review and action pending requests</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingItems.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold bg-amber-100 text-amber-800">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              {pendingItems.length} Pending
            </span>
          )}
          {approvedItems.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold bg-green-100 text-green-800">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              {approvedItems.length} Approved
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1 mb-5 w-fit shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === t.key
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`ml-1.5 text-xs ${activeTab === t.key ? "text-white/70" : "text-gray-400"}`}>
                ({t.count})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="flex gap-5 items-start">
        {/* Left: List */}
        <div className="w-[38%] flex-shrink-0">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
            </div>
          ) : listItems.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-10 text-center text-gray-400">
              <CheckCircle size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">
                {activeTab === "pending" ? "All caught up — no pending requests" : `No ${activeTab} requests`}
              </p>
            </div>
          ) : (
            listItems.map((item) => (
              <ApprovalCard
                key={item.id}
                item={item}
                isSelected={selectedId === item.id}
                onClick={() => setSelectedId(item.id)}
                isApproved={activeTab === "approved"}
              />
            ))
          )}
        </div>

        {/* Right: Detail */}
        <div className="flex-1 min-w-0">
          <DetailPanel
            item={selectedItem}
            currency={currency}
            onApprove={handleApprove}
            onDecline={handleDecline}
            isMutating={decideMut.isPending}
          />
        </div>
      </div>
    </div>
  );
}
