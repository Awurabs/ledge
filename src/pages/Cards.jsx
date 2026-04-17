import { useState } from "react";
import {
  Plus, CreditCard, Snowflake, Eye, AlertTriangle, Sliders, X,
} from "lucide-react";
import {
  useCards, useCardTransactions, useFreezeCard, useUnfreezeCard, useIssueCard,
} from "../hooks/useCards";
import { useMembers } from "../hooks/useMembers";
import { useDepartments } from "../hooks/useMembers";
import { useAuth } from "../context/AuthContext";
import { fmt, fmtDate } from "../lib/fmt";

// ── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getInitials(name = "") {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function formatExpiry(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(-2)}`;
}

const CARD_GRADIENTS = [
  "from-gray-900 to-gray-700",
  "from-green-900 to-green-700",
  "from-blue-900 to-blue-700",
  "from-purple-900 to-purple-700",
  "from-rose-900 to-rose-700",
  "from-indigo-900 to-indigo-700",
];

// ── Card Visual Component ──────────────────────────────────────────────────────
function CardVisual({ card, currency, isSelected, onSelect }) {
  const name     = card.organization_members?.profiles?.full_name ?? card.nickname ?? "Unknown";
  const initials = getInitials(name);
  const isFrozen = card.status === "frozen";
  const spend    = card.current_spend ?? 0;
  const limit    = card.spend_limit ?? 0;
  const overLimit = limit > 0 && spend > limit;
  const gradient = CARD_GRADIENTS[name.charCodeAt(0) % CARD_GRADIENTS.length];

  return (
    <div
      onClick={onSelect}
      className={`bg-gradient-to-br ${gradient} rounded-xl p-5 text-white relative overflow-hidden cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-offset-2 ring-green-400 shadow-lg scale-[1.01]" : "hover:shadow-md hover:scale-[1.005]"
      } ${isFrozen ? "opacity-60" : ""}`}
    >
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5" />
      <div className="absolute -bottom-8 -right-2 w-32 h-32 rounded-full bg-white/5" />

      {/* Top */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
            {initials}
          </div>
          <div>
            <p className="text-xs font-medium opacity-80 truncate max-w-[110px]">{name}</p>
            <p className="text-[10px] opacity-50 capitalize">{card.type ?? "virtual"}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isFrozen && (
            <span className="flex items-center gap-1 text-[10px] bg-blue-400/30 border border-blue-300/40 rounded-full px-1.5 py-0.5">
              <Snowflake size={8} /> Frozen
            </span>
          )}
          {overLimit && !isFrozen && <AlertTriangle size={14} className="text-amber-400" />}
          <CreditCard size={15} className="opacity-50" />
        </div>
      </div>

      {/* Card number */}
      <p className="text-sm font-mono tracking-[0.18em] mb-4 opacity-90">
        •••• •••• •••• {card.last_four ?? "0000"}
      </p>

      {/* Bottom */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] opacity-50 uppercase tracking-wide">Expires</p>
          <p className="text-xs font-medium">{formatExpiry(card.expiry_date)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] opacity-50 uppercase tracking-wide">Spent</p>
          <p className={`text-xs font-bold ${overLimit ? "text-amber-300" : ""}`}>
            {fmt(spend, currency)}
          </p>
          {limit > 0 && (
            <p className="text-[10px] opacity-40">of {fmt(limit, currency)}</p>
          )}
        </div>
      </div>

      {/* Spend bar */}
      {limit > 0 && (
        <div className="mt-3 w-full bg-white/20 rounded-full h-1">
          <div
            className={`h-1 rounded-full transition-all ${overLimit ? "bg-amber-400" : "bg-green-400"}`}
            style={{ width: `${Math.min((spend / limit) * 100, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ── Card Detail Panel ──────────────────────────────────────────────────────────
function CardDetail({ card, currency }) {
  const { data: txns = [], isLoading: txLoading } = useCardTransactions(card?.id, { limit: 5 });
  const freezeMut   = useFreezeCard();
  const unfreezeMut = useUnfreezeCard();

  if (!card) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-64 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <CreditCard size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">Select a card to view details</p>
        </div>
      </div>
    );
  }

  const name     = card.organization_members?.profiles?.full_name ?? card.nickname ?? "—";
  const role     = card.organization_members?.profiles?.job_title ?? "—";
  const dept     = card.departments?.name;
  const spend    = card.current_spend ?? 0;
  const limit    = card.spend_limit ?? 0;
  const isFrozen = card.status === "frozen";
  const pct      = limit > 0 ? Math.min(Math.round((spend / limit) * 100), 100) : 0;
  const isBusy   = freezeMut.isPending || unfreezeMut.isPending;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">{name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {role}{dept ? ` · ${dept}` : ""}
            </p>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              •••• •••• •••• {card.last_four ?? "0000"} · Exp {formatExpiry(card.expiry_date)}
            </p>
          </div>
          <span className={`text-xs font-semibold rounded-full px-2.5 py-0.5 capitalize ${
            isFrozen ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
          }`}>
            {card.status ?? "active"}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Spend progress */}
        {limit > 0 && (
          <section>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-gray-600">Monthly Spend</p>
              <p className="text-xs text-gray-400">{pct}% of limit</p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-1.5">
              <div
                className={`h-2 rounded-full transition-all ${pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-green-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>{fmt(spend, currency)} spent</span>
              <span>{fmt(limit, currency)} limit</span>
            </div>
          </section>
        )}

        {/* Recent transactions */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent Transactions</h3>
          {txLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : txns.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No transactions yet</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {txns.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{tx.merchant_name ?? "—"}</p>
                    <p className="text-xs text-gray-400">{fmtDate(tx.txn_date)}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 tabular-nums ml-4 shrink-0">
                    {fmt(tx.amount, currency)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Actions */}
        <section>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => isFrozen
                ? unfreezeMut.mutate({ id: card.id })
                : freezeMut.mutate({ id: card.id })
              }
              disabled={isBusy}
              className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50"
            >
              <Snowflake size={14} />
              {isFrozen ? "Unfreeze" : "Freeze"}
            </button>
            <button className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
              <Eye size={14} />
              View Number
            </button>
            <button className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
              <Sliders size={14} />
              Set Limit
            </button>
            <button className="flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100">
              Cancel Card
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

// ── Issue Card Modal ───────────────────────────────────────────────────────────
function IssueCardModal({ onClose, currency }) {
  const { data: members = [] }     = useMembers({ activeOnly: true });
  const { data: departments = [] } = useDepartments();
  const issueCardMut = useIssueCard();

  const currencySymbol = currency === "USD" ? "$" : currency === "GBP" ? "£" : "₵";
  const [form, setForm] = useState({
    memberId:    "",
    type:        "virtual",
    nickname:    "",
    spendLimit:  "",
    departmentId: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    issueCardMut.mutate(
      {
        member_id:     form.memberId || null,
        type:          form.type,
        nickname:      form.nickname || null,
        spend_limit:   form.spendLimit ? Math.round(parseFloat(form.spendLimit) * 100) : null,
        department_id: form.departmentId || null,
      },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl border border-gray-200 shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
        <h2 className="text-base font-semibold text-gray-900 mb-5">Issue New Card</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Card holder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Card Holder</label>
            <select
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
              value={form.memberId}
              onChange={(e) => setForm((f) => ({ ...f, memberId: e.target.value }))}
            >
              <option value="">No specific holder (team card)</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.profiles?.full_name ?? m.id}
                </option>
              ))}
            </select>
          </div>

          {/* Card type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Card Type</label>
            <div className="flex gap-2">
              {["virtual", "physical"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className={`flex-1 py-2 text-sm font-medium rounded-md border transition-colors capitalize ${
                    form.type === t
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Nickname */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nickname (optional)</label>
            <input
              type="text"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="e.g. Marketing Card, AWS Expenses"
              value={form.nickname}
              onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
            />
          </div>

          {/* Spend limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Spend Limit (optional)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                {currencySymbol}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full border border-gray-200 rounded-md pl-7 pr-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-green-300"
                placeholder="Leave blank for no limit"
                value={form.spendLimit}
                onChange={(e) => setForm((f) => ({ ...f, spendLimit: e.target.value }))}
              />
            </div>
          </div>

          {/* Department */}
          {departments.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department (optional)</label>
              <select
                className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
                value={form.departmentId}
                onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
              >
                <option value="">No department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={issueCardMut.isPending}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors disabled:opacity-50"
            >
              {issueCardMut.isPending ? "Issuing…" : "Issue Card"}
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

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Cards() {
  const { orgCurrency } = useAuth();
  const currency = orgCurrency ?? "GHS";

  const [activeTab,    setActiveTab]    = useState("virtual");
  const [selectedId,   setSelectedId]   = useState(null);
  const [showIssueModal, setShowIssueModal] = useState(false);

  const { data: allCards = [], isLoading } = useCards();

  const virtualCards  = allCards.filter((c) => c.type === "virtual");
  const physicalCards = allCards.filter((c) => c.type === "physical");
  const displayCards  = activeTab === "virtual" ? virtualCards : physicalCards;

  const activeCardId  = selectedId ?? displayCards[0]?.id ?? null;
  const selectedCard  = allCards.find((c) => c.id === activeCardId) ?? null;

  const totalSpend  = allCards.reduce((s, c) => s + (c.current_spend ?? 0), 0);
  const frozenCount = allCards.filter((c) => c.status === "frozen").length;

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-6">
      {showIssueModal && (
        <IssueCardModal onClose={() => setShowIssueModal(false)} currency={currency} />
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cards</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isLoading ? "Loading…" : `${allCards.length} card${allCards.length !== 1 ? "s" : ""} · ${fmt(totalSpend, currency)} total spend${frozenCount > 0 ? ` · ${frozenCount} frozen` : ""}`}
          </p>
        </div>
        <button
          onClick={() => setShowIssueModal(true)}
          className="flex items-center gap-2 bg-green-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-600"
        >
          <Plus size={15} />
          Issue Card
        </button>
      </div>

      {/* Type tabs */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-5 w-fit shadow-sm">
        {[
          { key: "virtual",  label: "Virtual",  count: virtualCards.length  },
          { key: "physical", label: "Physical", count: physicalCards.length },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setSelectedId(null); }}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === t.key ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`ml-1.5 text-xs ${activeTab === t.key ? "text-white/60" : "text-gray-400"}`}>
                ({t.count})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="flex gap-5 items-start">
        {/* Left: Card grid */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
            </div>
          ) : displayCards.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center text-gray-400">
              <CreditCard size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No {activeTab} cards yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {displayCards.map((card) => (
                <CardVisual
                  key={card.id}
                  card={card}
                  currency={currency}
                  isSelected={activeCardId === card.id}
                  onSelect={() => setSelectedId(card.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right: Detail panel */}
        <div className="w-[320px] flex-shrink-0">
          <CardDetail card={selectedCard} currency={currency} />
        </div>
      </div>
    </div>
  );
}
