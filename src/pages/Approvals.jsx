import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageSquare,
  Receipt,
  ChevronRight,
  Info,
} from "lucide-react";

// --- Data ---

const PENDING = [
  {
    id: 1,
    cardholder: "Ama Darko",
    initials: "AD",
    avatarColor: "bg-purple-500",
    role: "Finance Analyst",
    department: "Finance",
    card: "•••• 3319",
    merchant: "Delta Airlines",
    date: "Mar 27, 2026",
    amount: 1890,
    category: "Travel",
    policy: "review",
    receipt: false,
    description: "Round-trip flight — Accra to London (LHR)",
    glCode: "5400-TRV",
    similar: [
      { date: "Feb 12, 2026", merchant: "Kenya Airways", amount: 1420 },
      { date: "Jan 30, 2026", merchant: "Ethiopian Airlines", amount: 2100 },
      { date: "Dec 18, 2025", merchant: "British Airways", amount: 1650 },
    ],
  },
  {
    id: 2,
    cardholder: "Kweku Adjei",
    initials: "KA",
    avatarColor: "bg-indigo-500",
    role: "Sales Manager",
    department: "Sales",
    card: "•••• 8831",
    merchant: "Marriott Hotels",
    date: "Mar 25, 2026",
    amount: 2340,
    category: "Travel",
    policy: "review",
    receipt: false,
    description: "4-night hotel stay — London, client meetings",
    glCode: "5400-HTL",
    similar: [
      { date: "Feb 05, 2026", merchant: "Hilton Hotels", amount: 1750 },
      { date: "Jan 14, 2026", merchant: "Radisson Blu", amount: 1900 },
      { date: "Nov 22, 2025", merchant: "Sheraton Hotels", amount: 2200 },
    ],
  },
  {
    id: 3,
    cardholder: "Samuel Ofori",
    initials: "SO",
    avatarColor: "bg-teal-500",
    role: "Operations",
    department: "Operations",
    card: "•••• 1183",
    merchant: "Bolt Business",
    date: "Mar 22, 2026",
    amount: 760,
    category: "Transport",
    policy: "ok",
    receipt: true,
    description: "Monthly business ride subscription — March 2026",
    glCode: "5300-RDE",
    similar: [
      { date: "Feb 22, 2026", merchant: "Bolt Business", amount: 760 },
      { date: "Jan 22, 2026", merchant: "Bolt Business", amount: 720 },
      { date: "Dec 22, 2025", merchant: "Uber Business", amount: 690 },
    ],
  },
  {
    id: 4,
    cardholder: "Priscilla Owusu",
    initials: "PO",
    avatarColor: "bg-pink-500",
    role: "Marketing",
    department: "Marketing",
    card: "•••• 4457",
    merchant: "Zoom Enterprise",
    date: "Mar 20, 2026",
    amount: 3100,
    category: "SaaS",
    policy: "ok",
    receipt: true,
    description: "Annual Zoom Enterprise licence — 25 seats",
    glCode: "5200-COM",
    similar: [
      { date: "Mar 20, 2025", merchant: "Zoom Enterprise", amount: 2900 },
      { date: "Mar 20, 2024", merchant: "Zoom Enterprise", amount: 2600 },
      { date: "Feb 15, 2026", merchant: "Microsoft Teams", amount: 1800 },
    ],
  },
];

const APPROVED = [
  { id: 101, cardholder: "Kofi Mensah", initials: "KM", avatarColor: "bg-blue-500", role: "CTO", department: "Engineering", card: "•••• 4821", merchant: "Stripe Inc", date: "Mar 28, 2026", amount: 2400, category: "SaaS", policy: "ok", receipt: true, approvedBy: "Abena Owusu", approvedDate: "Mar 28, 2026", description: "Stripe payment processing subscription", glCode: "5200-PAY", similar: [] },
  { id: 102, cardholder: "James Osei", initials: "JO", avatarColor: "bg-emerald-500", role: "Head of Operations", department: "Operations", card: "•••• 9204", merchant: "WeWork", date: "Mar 27, 2026", amount: 4200, category: "Facilities", policy: "ok", receipt: true, approvedBy: "Abena Owusu", approvedDate: "Mar 27, 2026", description: "Office space — March 2026", glCode: "5100-FAC", similar: [] },
  { id: 103, cardholder: "Nana Boateng", initials: "NB", avatarColor: "bg-orange-500", role: "Lead Engineer", department: "Engineering", card: "•••• 7712", merchant: "AWS", date: "Mar 26, 2026", amount: 3150, category: "SaaS", policy: "ok", receipt: true, approvedBy: "Abena Owusu", approvedDate: "Mar 26, 2026", description: "AWS cloud infrastructure — March 2026", glCode: "5200-CLD", similar: [] },
  { id: 104, cardholder: "Adwoa Frimpong", initials: "AF", avatarColor: "bg-cyan-500", role: "Product Designer", department: "Product", card: "•••• 2267", merchant: "Google Workspace", date: "Mar 25, 2026", amount: 1200, category: "SaaS", policy: "ok", receipt: true, approvedBy: "Abena Owusu", approvedDate: "Mar 25, 2026", description: "Google Workspace Business — 10 seats", glCode: "5200-PRD", similar: [] },
  { id: 105, cardholder: "Yaw Amponsah", initials: "YA", avatarColor: "bg-amber-500", role: "Office Manager", department: "Admin", card: "•••• 6694", merchant: "Office Depot", date: "Mar 24, 2026", amount: 430, category: "Office", policy: "ok", receipt: true, approvedBy: "Abena Owusu", approvedDate: "Mar 24, 2026", description: "Office supplies — stationery & printer cartridges", glCode: "5600-OFC", similar: [] },
  { id: 106, cardholder: "Efua Asante", initials: "EA", avatarColor: "bg-rose-500", role: "HR Manager", department: "HR", card: "•••• 5540", merchant: "LinkedIn Premium", date: "Mar 21, 2026", amount: 900, category: "SaaS", policy: "ok", receipt: true, approvedBy: "Abena Owusu", approvedDate: "Mar 21, 2026", description: "LinkedIn Recruiter licence — 1 seat", glCode: "5200-LRN", similar: [] },
];

const DECLINED = [];

const CATEGORY_COLORS = {
  SaaS: "bg-blue-50 text-blue-700",
  Travel: "bg-purple-50 text-purple-700",
  Facilities: "bg-gray-100 text-gray-700",
  Transport: "bg-indigo-50 text-indigo-700",
  Office: "bg-stone-100 text-stone-700",
  Meals: "bg-orange-50 text-orange-700",
  Telecom: "bg-teal-50 text-teal-700",
};

function fmt(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

// --- Sub-components ---

function Avatar({ initials, colorClass, size = "md" }) {
  const sz = size === "lg" ? "w-12 h-12 text-base" : size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  return (
    <div className={`${sz} ${colorClass} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}>
      {initials}
    </div>
  );
}

function ApprovalCard({ item, isSelected, onClick, showApprovedBadge = false }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border p-4 mb-3 cursor-pointer transition-all hover:shadow-md ${
        isSelected ? "border-green-500 shadow-md shadow-green-100" : "border-[#E5E7EB] shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        <Avatar initials={item.initials} colorClass={item.avatarColor} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-semibold text-sm text-[#111827]">{item.cardholder}</span>
            <span className="font-bold tabular-nums text-[#111827] text-sm">{fmt(item.amount)}</span>
          </div>
          <div className="text-xs text-[#6B7280] mt-0.5">{item.role}</div>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span className="text-xs text-[#374151] font-medium">{item.merchant}</span>
            <span className="text-[#D1D5DB]">·</span>
            <span className="text-xs text-[#6B7280]">{item.date}</span>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`rounded-full text-xs px-2.5 py-0.5 font-medium ${CATEGORY_COLORS[item.category]}`}>
              {item.category}
            </span>
            {showApprovedBadge ? (
              <span className="rounded-full text-xs px-2.5 py-0.5 font-medium bg-green-50 text-green-700">
                Approved
              </span>
            ) : item.policy === "review" ? (
              <span className="rounded-full text-xs px-2.5 py-0.5 font-medium bg-amber-50 text-amber-700">
                Policy Review
              </span>
            ) : (
              <span className="rounded-full text-xs px-2.5 py-0.5 font-medium bg-green-50 text-green-700">
                Within Policy
              </span>
            )}
          </div>
          {showApprovedBadge && item.approvedBy && (
            <p className="text-xs text-[#6B7280] mt-1.5">
              Approved by <span className="font-medium text-[#374151]">{item.approvedBy}</span> · {item.approvedDate}
            </p>
          )}
        </div>
        <ChevronRight size={15} className={`text-[#9CA3AF] flex-shrink-0 mt-0.5 transition-transform ${isSelected ? "rotate-90 text-green-500" : ""}`} />
      </div>
    </div>
  );
}

function DetailPanel({ item, onApprove, onDecline }) {
  const [comment, setComment] = useState("");

  if (!item) {
    return (
      <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm h-full flex items-center justify-center">
        <div className="text-center text-[#6B7280]">
          <Info size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">Select a transaction to review</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm overflow-hidden">
      {/* Top header */}
      <div className="p-6 border-b border-[#E5E7EB]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#111827]">{item.merchant}</h2>
            <p className="text-sm text-[#6B7280] mt-0.5">{item.description}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums text-[#111827]">{fmt(item.amount)}</div>
            <div className="text-xs text-[#6B7280] mt-0.5">{item.date}</div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(100vh-240px)]">
        {/* Cardholder */}
        <section>
          <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Cardholder</h3>
          <div className="flex items-center gap-3 bg-[#F7F7F8] rounded-lg p-3">
            <Avatar initials={item.initials} colorClass={item.avatarColor} size="lg" />
            <div className="flex-1">
              <div className="font-semibold text-[#111827]">{item.cardholder}</div>
              <div className="text-sm text-[#6B7280]">{item.role} · {item.department}</div>
              <div className="text-xs text-[#9CA3AF] mt-0.5 font-mono">Card {item.card}</div>
            </div>
          </div>
        </section>

        {/* Transaction details */}
        <section>
          <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Transaction Details</h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
            <div>
              <span className="text-[#6B7280] block text-xs">Date</span>
              <span className="font-medium text-[#111827]">{item.date}</span>
            </div>
            <div>
              <span className="text-[#6B7280] block text-xs">Category</span>
              <span className={`inline-block rounded-full text-xs px-2.5 py-0.5 font-medium mt-0.5 ${CATEGORY_COLORS[item.category]}`}>{item.category}</span>
            </div>
            <div>
              <span className="text-[#6B7280] block text-xs">GL Code</span>
              <span className="font-medium text-[#111827] font-mono text-xs">{item.glCode}</span>
            </div>
            <div>
              <span className="text-[#6B7280] block text-xs">Description</span>
              <span className="font-medium text-[#111827]">{item.description}</span>
            </div>
          </div>
        </section>

        {/* Policy alert */}
        {item.policy === "review" && (
          <section>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
              <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 text-sm">Policy Alert</p>
                <p className="text-amber-700 text-sm mt-0.5">
                  This transaction exceeds the $1,500 per-transaction travel limit. Requires Finance Lead approval.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Receipt */}
        <section>
          <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Receipt</h3>
          {item.receipt ? (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <Receipt size={15} />
              <span className="font-medium">Receipt attached</span>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <AlertTriangle size={15} />
                <span className="font-medium">No receipt — request from cardholder</span>
              </div>
              <button className="text-xs font-medium text-amber-800 underline hover:no-underline">
                Send Request
              </button>
            </div>
          )}
        </section>

        {/* Similar transactions */}
        {item.similar && item.similar.length > 0 && (
          <section>
            <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">
              Recent Similar Transactions — {item.cardholder}
            </h3>
            <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F7F7F8] border-b border-[#E5E7EB]">
                    <th className="text-left text-xs font-semibold text-[#6B7280] px-4 py-2">Date</th>
                    <th className="text-left text-xs font-semibold text-[#6B7280] px-4 py-2">Merchant</th>
                    <th className="text-right text-xs font-semibold text-[#6B7280] px-4 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {item.similar.map((s, i) => (
                    <tr key={i} className="border-b border-[#E5E7EB] last:border-0">
                      <td className="px-4 py-2.5 text-[#6B7280] text-xs whitespace-nowrap">{s.date}</td>
                      <td className="px-4 py-2.5 text-[#374151] text-xs">{s.merchant}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-[#111827] tabular-nums text-xs whitespace-nowrap">{fmt(s.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Action buttons — only show for pending */}
        {!item.approvedBy && (
          <section>
            <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Decision</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onApprove && onApprove(item.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-[#22C55E] rounded-lg hover:bg-green-600 transition-colors"
              >
                <CheckCircle size={15} />
                Approve
              </button>
              <button
                onClick={() => onDecline && onDecline(item.id)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              >
                <XCircle size={15} />
                Decline
              </button>
              <button className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[#374151] border border-[#E5E7EB] rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">
                <MessageSquare size={15} />
                Request More Info
              </button>
            </div>
          </section>
        )}

        {/* Comment box */}
        <section>
          <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Comment</h3>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment or note for this approval..."
            className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2.5 bg-[#F7F7F8] focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
          />
          <button
            disabled={!comment.trim()}
            className="mt-2 px-4 py-2 text-sm font-medium text-white bg-[#111827] rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add Comment
          </button>
        </section>
      </div>
    </div>
  );
}

// --- Main Page ---

export default function Approvals() {
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedId, setSelectedId] = useState(PENDING[0]?.id ?? null);

  const listItems = activeTab === "pending" ? PENDING : activeTab === "approved" ? APPROVED : DECLINED;
  const selectedItem = [...PENDING, ...APPROVED, ...DECLINED].find((i) => i.id === selectedId) ?? null;

  const TABS = [
    { key: "pending", label: `Pending (${PENDING.length})` },
    { key: "approved", label: "Approved" },
    { key: "declined", label: "Declined" },
  ];

  const handleTabChange = (key) => {
    setActiveTab(key);
    const items = key === "pending" ? PENDING : key === "approved" ? APPROVED : DECLINED;
    setSelectedId(items[0]?.id ?? null);
  };

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Approvals</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Review and action spend requests</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold bg-amber-100 text-amber-800">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            {PENDING.length} Pending
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold bg-green-100 text-green-800">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            127 Approved this month
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-[#E5E7EB] rounded-lg p-1 mb-5 w-fit shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeTab === t.key
                ? "bg-[#111827] text-white"
                : "text-[#6B7280] hover:text-[#111827] hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="flex gap-5 items-start">
        {/* Left: List */}
        <div className="w-[38%] flex-shrink-0">
          {listItems.length === 0 ? (
            <div className="bg-white rounded-lg border border-[#E5E7EB] shadow-sm p-10 text-center text-[#6B7280]">
              <CheckCircle size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No items in this category</p>
            </div>
          ) : (
            listItems.map((item) => (
              <ApprovalCard
                key={item.id}
                item={item}
                isSelected={selectedId === item.id}
                onClick={() => setSelectedId(item.id)}
                showApprovedBadge={activeTab === "approved"}
              />
            ))
          )}
        </div>

        {/* Right: Detail */}
        <div className="flex-1 min-w-0">
          <DetailPanel
            item={selectedItem}
            onApprove={(id) => console.log("Approved", id)}
            onDecline={(id) => console.log("Declined", id)}
          />
        </div>
      </div>
    </div>
  );
}
