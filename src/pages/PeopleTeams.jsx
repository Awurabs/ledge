import { useState } from "react";
import { Search, X, UserPlus, Mail, Phone, CreditCard, ChevronRight } from "lucide-react";
import { useMembers, useDepartments, useDeactivateMember } from "../hooks/useMembers";
import { useCards } from "../hooks/useCards";
import { useAuth } from "../context/AuthContext";
import { fmt } from "../lib/fmt";

// ── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

// ── Avatar helpers ─────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "bg-green-100 text-green-700",   "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700", "bg-orange-100 text-orange-700",
  "bg-teal-100 text-teal-700",     "bg-red-100 text-red-700",
  "bg-indigo-100 text-indigo-700", "bg-pink-100 text-pink-700",
  "bg-yellow-100 text-yellow-700", "bg-cyan-100 text-cyan-700",
  "bg-rose-100 text-rose-700",     "bg-lime-100 text-lime-700",
];

function avatarColor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initials(name = "") {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

// ── Role badge ─────────────────────────────────────────────────────────────────
const ROLE_COLORS = {
  admin:   "bg-red-100 text-red-700",
  finance: "bg-green-100 text-green-700",
  manager: "bg-purple-100 text-purple-700",
  member:  "bg-blue-100 text-blue-700",
  viewer:  "bg-gray-100 text-gray-600",
};

function roleBadge(role = "") {
  const lower = role?.toLowerCase() ?? "member";
  const color = ROLE_COLORS[lower] ?? "bg-gray-100 text-gray-600";
  const label = role ? role.charAt(0).toUpperCase() + role.slice(1) : "Member";
  return { color, label };
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function PeopleTeams() {
  const { orgCurrency } = useAuth();
  const currency = orgCurrency ?? "GHS";

  const [selected,    setSelected]    = useState(null);
  const [showInvite,  setShowInvite]  = useState(false);
  const [search,      setSearch]      = useState("");
  const [deptFilter,  setDeptFilter]  = useState("");

  const { data: members     = [], isLoading } = useMembers({ activeOnly: true });
  const { data: departments = [] }            = useDepartments();
  const { data: allCards    = [] }            = useCards();
  const deactivateMut                         = useDeactivateMember();

  const filtered = members.filter(m => {
    const name      = m.profiles?.full_name ?? "";
    const dept      = m.departments?.name   ?? "";
    const matchText = name.toLowerCase().includes(search.toLowerCase())
                   || dept.toLowerCase().includes(search.toLowerCase());
    const matchDept = !deptFilter || m.department_id === deptFilter;
    return matchText && matchDept;
  });

  // Stats
  const activeCards = allCards.filter(c => c.status === "active");
  const totalSpend  = allCards.reduce((s, c) => s + (c.current_spend ?? 0), 0);
  const avgSpend    = members.length > 0 ? Math.round(totalSpend / members.length) : 0;

  // Cards per member
  const cardsByMember = allCards.reduce((acc, c) => {
    if (c.member_id) acc[c.member_id] = (acc[c.member_id] ?? []).concat(c);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-6 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">People & Teams</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage employees, roles, and card permissions</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="bg-green-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-600 flex items-center gap-2"
        >
          <UserPlus size={15} />
          Invite Employee
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {isLoading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <p className="text-sm text-gray-500">Total Employees</p>
              <p className="text-2xl font-bold tabular-nums text-gray-900 mt-1">{members.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <p className="text-sm text-gray-500">Active Cards</p>
              <p className="text-2xl font-bold tabular-nums text-gray-900 mt-1">{activeCards.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <p className="text-sm text-gray-500">Avg Spend / Employee</p>
              <p className="text-2xl font-bold tabular-nums text-gray-900 mt-1">{fmt(avgSpend, currency)}</p>
            </div>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search employees..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
          />
        </div>
        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-600"
        >
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {["Employee", "Role", "Department", "Cards", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => {
                  const name     = m.profiles?.full_name ?? "Unknown";
                  const color    = avatarColor(name);
                  const { color: roleColor, label: roleLabel } = roleBadge(m.role);
                  const dept     = m.departments?.name ?? "—";
                  const mCards   = cardsByMember[m.id] ?? [];
                  const isActive = !m.deactivated_at;
                  return (
                    <tr
                      key={m.id}
                      onClick={() => setSelected(m)}
                      className={`border-b border-gray-100 hover:bg-green-50/30 cursor-pointer transition-colors ${
                        i % 2 === 1 ? "bg-gray-50/50" : ""
                      } ${selected?.id === m.id ? "bg-green-50/40" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${color}`}>
                            {initials(name)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{name}</p>
                            {m.profiles?.job_title && (
                              <p className="text-xs text-gray-400">{m.profiles.job_title}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${roleColor}`}>
                          {roleLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{dept}</td>
                      <td className="px-4 py-3 text-gray-600">{mCards.length}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={e => { e.stopPropagation(); setSelected(m); }}
                          className="text-xs text-gray-500 hover:text-green-600 flex items-center gap-1"
                        >
                          View <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-6 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-400">
            {filtered.length} employee{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Member Drawer */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setSelected(null)} />
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold ${avatarColor(selected.profiles?.full_name ?? "")}`}>
                  {initials(selected.profiles?.full_name ?? "")}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{selected.profiles?.full_name ?? "—"}</h3>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge(selected.role).color}`}>
                    {roleBadge(selected.role).label}
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">{selected.departments?.name ?? "—"}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 mt-1">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex flex-col gap-2 text-sm">
                {selected.profiles?.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone size={14} /> {selected.profiles.phone}
                  </div>
                )}
                {selected.profiles?.full_name && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail size={14} />
                    {selected.profiles.full_name.toLowerCase().replace(/\s+/g, ".")}@company.com
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Cards Assigned</p>
                {(cardsByMember[selected.id] ?? []).length === 0 ? (
                  <p className="text-sm text-gray-400">No cards assigned</p>
                ) : (
                  <div className="space-y-2">
                    {(cardsByMember[selected.id] ?? []).map(c => (
                      <div key={c.id} className="flex items-center gap-2 bg-gray-50 rounded-md px-3 py-2">
                        <CreditCard size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-700">•••• {c.last_four ?? "0000"}</span>
                        <span className="ml-auto text-xs text-gray-500 capitalize">{c.status ?? "active"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selected.profiles?.job_title && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Job Title</p>
                  <p className="text-sm text-gray-700">{selected.profiles.job_title}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button className="flex-1 bg-green-500 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-green-600">
                  Edit Member
                </button>
                <button
                  onClick={() =>
                    deactivateMut.mutate({ id: selected.id }, { onSuccess: () => setSelected(null) })
                  }
                  disabled={deactivateMut.isPending}
                  className="flex-1 bg-white text-red-600 border border-red-300 rounded-md px-4 py-2 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                >
                  {deactivateMut.isPending ? "Suspending…" : "Suspend Access"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Invite Employee</h3>
              <button onClick={() => setShowInvite(false)}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="space-y-4">
              {[["Full Name", "text", "Jane Doe"], ["Email Address", "email", "jane@company.com"]].map(([label, type, ph]) => (
                <div key={label}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type={type}
                    placeholder={ph}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500">
                    <option value="member">Member</option>
                    <option value="manager">Manager</option>
                    <option value="finance">Finance</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500">
                    <option value="">Select department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowInvite(false)}
                className="flex-1 bg-white text-gray-700 border border-gray-300 rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowInvite(false)}
                className="flex-1 bg-green-500 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-green-600"
              >
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
