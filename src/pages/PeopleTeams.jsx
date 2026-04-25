import { useState, useMemo } from "react";
import {
  Search, X, UserPlus, Phone, CreditCard, Briefcase,
  Users, Building2, Edit2, Check, Trash2, Plus,
  UserX, UserCheck, Clock, ChevronRight,
} from "lucide-react";
import {
  useMembers, useDepartments, useTeams,
  useUpdateMember, useDeactivateMember, useReactivateMember,
  useCreateDepartment, useUpdateDepartment, useDeleteDepartment,
  useCreateTeam, useAddTeamMember, useRemoveTeamMember,
  useInviteMember,
} from "../hooks/useMembers";
import { useCards } from "../hooks/useCards";
import { fmtDate } from "../lib/fmt";

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
    : (name.slice(0, 2).toUpperCase() || "?");
}

function Avatar({ name = "", size = "md", className = "" }) {
  const sz =
    size === "sm" ? "w-7 h-7 text-xs" :
    size === "lg" ? "w-12 h-12 text-base" :
                    "w-9 h-9 text-sm";
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${avatarColor(name)} ${className}`}>
      {initials(name)}
    </div>
  );
}

// ── Role badge ─────────────────────────────────────────────────────────────────
// Values must match the org_role postgres enum:
// owner | admin | finance_lead | accountant | employee | viewer
const ROLE_MAP = {
  owner:        { color: "bg-purple-100 text-purple-700", label: "Owner"        },
  admin:        { color: "bg-red-100 text-red-700",       label: "Admin"        },
  finance_lead: { color: "bg-green-100 text-green-700",   label: "Finance Lead" },
  accountant:   { color: "bg-blue-100 text-blue-700",     label: "Accountant"   },
  employee:     { color: "bg-gray-100 text-gray-600",     label: "Employee"     },
  viewer:       { color: "bg-gray-100 text-gray-400",     label: "Viewer"       },
};

// Roles available when inviting (owner is not invitable)
const INVITABLE_ROLES = ["admin", "finance_lead", "accountant", "employee", "viewer"];

function RoleBadge({ role = "" }) {
  const r = ROLE_MAP[role?.toLowerCase()] ?? ROLE_MAP.member;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${r.color}`}>
      {r.label}
    </span>
  );
}

// ── Relative time ──────────────────────────────────────────────────────────────
function timeSince(dateStr) {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return fmtDate(dateStr);
}

// ─────────────────────────────────────────────────────────────────────────────
// MEMBER DRAWER
// ─────────────────────────────────────────────────────────────────────────────
function MemberDrawer({ member, departments, cardsByMember, onClose }) {
  const [editing,  setEditing]  = useState(false);
  const [editRole, setEditRole] = useState(member.role ?? "member");
  const [editDept, setEditDept] = useState(member.department_id ?? "");

  const updateMut     = useUpdateMember();
  const deactivateMut = useDeactivateMember();
  const reactivateMut = useReactivateMember();

  const name     = member.profiles?.full_name ?? "Unknown";
  const isActive = !member.deactivated_at;
  const mCards   = cardsByMember[member.id] ?? [];

  function handleSave() {
    updateMut.mutate(
      { id: member.id, role: editRole, department_id: editDept || null },
      { onSuccess: () => setEditing(false) },
    );
  }

  function handleToggleStatus() {
    if (isActive) {
      deactivateMut.mutate({ id: member.id }, { onSuccess: onClose });
    } else {
      reactivateMut.mutate({ id: member.id }, { onSuccess: onClose });
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 flex flex-col">

        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Avatar name={name} size="lg" />
            <div>
              <h3 className="font-bold text-gray-900 text-lg leading-tight">{name}</h3>
              <RoleBadge role={member.role} />
              {member.departments?.name && (
                <p className="text-xs text-gray-500 mt-0.5">{member.departments.name}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-1">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Status + join date */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-gray-400"}`} />
              {isActive ? "Active" : "Suspended"}
            </span>
            {member.created_at && (
              <span className="text-xs text-gray-400">
                Member since {fmtDate(member.created_at)}
              </span>
            )}
          </div>

          {/* Contact / meta */}
          <div className="space-y-1.5">
            {member.profiles?.job_title && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Briefcase size={13} className="text-gray-400 flex-shrink-0" />
                {member.profiles.job_title}
              </div>
            )}
            {member.profiles?.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone size={13} className="text-gray-400 flex-shrink-0" />
                {member.profiles.phone}
              </div>
            )}
            {member.profiles?.last_seen_at && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Clock size={13} className="flex-shrink-0" />
                Last seen {timeSince(member.profiles.last_seen_at)}
              </div>
            )}
          </div>

          {/* Role & Department (editable) */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Role & Department
              </p>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs text-green-600 flex items-center gap-1 hover:text-green-700"
                >
                  <Edit2 size={11} /> Edit
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditing(false)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={updateMut.isPending}
                    className="text-xs text-green-600 font-medium flex items-center gap-1 hover:text-green-700 disabled:opacity-50"
                  >
                    <Check size={11} />
                    {updateMut.isPending ? "Saving…" : "Save"}
                  </button>
                </div>
              )}
            </div>

            {editing ? (
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Role</label>
                  <select
                    value={editRole}
                    onChange={e => setEditRole(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                  >
                    {Object.entries(ROLE_MAP).map(([v, { label }]) => (
                      <option key={v} value={v} disabled={v === "owner"}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Department</label>
                  <select
                    value={editDept}
                    onChange={e => setEditDept(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                  >
                    <option value="">No Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Role</p>
                  <RoleBadge role={member.role} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Department</p>
                  <p className="text-sm text-gray-700">{member.departments?.name ?? "—"}</p>
                </div>
              </div>
            )}
          </div>

          {/* Cards */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Cards Assigned
            </p>
            {mCards.length === 0 ? (
              <p className="text-sm text-gray-400">No cards assigned</p>
            ) : (
              <div className="space-y-2">
                {mCards.map(c => (
                  <div key={c.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <CreditCard size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-700 font-mono">•••• {c.last_four ?? "0000"}</span>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                      c.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={handleToggleStatus}
            disabled={deactivateMut.isPending || reactivateMut.isPending}
            className={`w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
              isActive
                ? "bg-white text-red-600 border border-red-300 hover:bg-red-50"
                : "bg-green-500 text-white hover:bg-green-600"
            }`}
          >
            {isActive ? <UserX size={14} /> : <UserCheck size={14} />}
            {isActive
              ? (deactivateMut.isPending ? "Suspending…" : "Suspend Access")
              : (reactivateMut.isPending ? "Reactivating…" : "Reactivate")}
          </button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INVITE MODAL
// ─────────────────────────────────────────────────────────────────────────────
function InviteModal({ departments, onClose }) {
  const [form, setForm] = useState({ email: "", role: "employee", department_id: "" });
  const [sent, setSent]   = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const inviteMut = useInviteMember();

  function handleSubmit(e) {
    e.preventDefault();
    setErrMsg("");
    inviteMut.mutate(
      { email: form.email, role: form.role, department_id: form.department_id || null },
      {
        onSuccess: () => setSent(true),
        onError:   (err) => setErrMsg(err.message ?? "Something went wrong. Please try again."),
      },
    );
  }

  if (sent) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check size={24} className="text-green-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Invite Sent!</h3>
          <p className="text-sm text-gray-500 mb-6">
            An invitation email has been sent to <strong>{form.email}</strong>.
            They'll click the link to set up their account and will be added to your org automatically.
          </p>
          <button
            onClick={onClose}
            className="bg-green-500 text-white rounded-lg px-6 py-2 text-sm font-medium hover:bg-green-600"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Invite Employee</h3>
            <p className="text-xs text-gray-400 mt-0.5">They'll receive an email with a sign-up link.</p>
          </div>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="jane@company.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                {INVITABLE_ROLES.map(v => (
                  <option key={v} value={v}>{ROLE_MAP[v].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={form.department_id}
                onChange={e => setForm(f => ({ ...f, department_id: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                <option value="">No Department</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {errMsg && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errMsg}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white text-gray-700 border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={inviteMut.isPending}
              className="flex-1 bg-green-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-600 disabled:opacity-70"
            >
              {inviteMut.isPending ? "Sending…" : "Send Invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PEOPLE TAB
// ─────────────────────────────────────────────────────────────────────────────
function PeopleTab({ members, departments, cardsByMember, isLoading }) {
  const [selected,   setSelected]   = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [showAll,    setShowAll]    = useState(false);

  const filtered = useMemo(() => {
    const base = showAll ? members : members.filter(m => !m.deactivated_at);
    const q    = search.toLowerCase();
    return base.filter(m => {
      const name = (m.profiles?.full_name ?? "").toLowerCase();
      const dept = (m.departments?.name   ?? "").toLowerCase();
      const job  = (m.profiles?.job_title ?? "").toLowerCase();
      const matchText = !q || name.includes(q) || dept.includes(q) || job.includes(q);
      const matchRole = !roleFilter || m.role === roleFilter;
      const matchDept = !deptFilter || m.department_id === deptFilter;
      return matchText && matchRole && matchDept;
    });
  }, [members, search, roleFilter, deptFilter, showAll]);

  const activeCount   = members.filter(m => !m.deactivated_at).length;
  const inactiveCount = members.length - activeCount;

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {isLoading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : (
          [
            { label: "Total Members", value: members.length,     icon: Users,     color: "text-blue-600 bg-blue-50"     },
            { label: "Active",        value: activeCount,        icon: UserCheck, color: "text-green-600 bg-green-50"   },
            { label: "Suspended",     value: inactiveCount,      icon: UserX,     color: "text-red-600 bg-red-50"       },
            { label: "Departments",   value: departments.length, icon: Building2, color: "text-purple-600 bg-purple-50" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon size={17} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-xl font-bold text-gray-900 tabular-nums">{value}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search people…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-500 bg-white"
          />
        </div>

        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-600"
        >
          <option value="">All Roles</option>
          {Object.entries(ROLE_MAP).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>

        <select
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-600"
        >
          <option value="">All Departments</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        {/* Show suspended toggle */}
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <button
            type="button"
            role="switch"
            aria-checked={showAll}
            onClick={() => setShowAll(v => !v)}
            className={`relative inline-flex w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
              showAll ? "bg-green-500" : "bg-gray-300"
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              showAll ? "translate-x-4" : "translate-x-0"
            }`} />
          </button>
          Show suspended
        </label>

        <button
          onClick={() => setShowInvite(true)}
          className="ml-auto bg-green-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-600 flex items-center gap-2"
        >
          <UserPlus size={14} /> Invite
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No members match your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {["Employee", "Role", "Department", "Cards", "Last Seen", "Status", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const name     = m.profiles?.full_name ?? "Unknown";
                  const mCards   = cardsByMember[m.id] ?? [];
                  const isActive = !m.deactivated_at;
                  return (
                    <tr
                      key={m.id}
                      onClick={() => setSelected(m)}
                      className={`border-b border-gray-100 hover:bg-green-50/40 cursor-pointer transition-colors ${
                        selected?.id === m.id ? "bg-green-50/30" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={name} size="sm" />
                          <div>
                            <p className="font-medium text-gray-900">{name}</p>
                            {m.profiles?.job_title && (
                              <p className="text-xs text-gray-400">{m.profiles.job_title}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><RoleBadge role={m.role} /></td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{m.departments?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{mCards.length}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {timeSince(m.profiles?.last_seen_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-gray-400"}`} />
                          {isActive ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={e => { e.stopPropagation(); setSelected(m); }}
                          className="text-xs text-gray-400 hover:text-green-600 flex items-center gap-1 whitespace-nowrap"
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
        <div className="px-5 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            {filtered.length} of {members.length} member{members.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {selected && (
        <MemberDrawer
          member={selected}
          departments={departments}
          cardsByMember={cardsByMember}
          onClose={() => setSelected(null)}
        />
      )}
      {showInvite && (
        <InviteModal departments={departments} onClose={() => setShowInvite(false)} />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAM DRAWER
// ─────────────────────────────────────────────────────────────────────────────
function TeamDrawer({ team, members, onClose }) {
  const [addId, setAddId] = useState("");
  const addMut    = useAddTeamMember();
  const removeMut = useRemoveTeamMember();

  const existingIds = new Set(
    (team.team_members ?? []).map(tm => tm.member?.id).filter(Boolean),
  );
  const available = members.filter(m => !existingIds.has(m.id) && !m.deactivated_at);
  const leadName  = team.lead?.profiles?.full_name;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 flex flex-col">

        <div className="p-6 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">{team.name}</h3>
            {leadName ? (
              <div className="flex items-center gap-1.5 mt-1.5">
                <Avatar name={leadName} size="sm" />
                <span className="text-xs text-gray-500">Lead: {leadName}</span>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-1">No lead assigned</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Add member */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Add Member
            </p>
            <div className="flex gap-2">
              <select
                value={addId}
                onChange={e => setAddId(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                <option value="">Select member…</option>
                {available.map(m => (
                  <option key={m.id} value={m.id}>{m.profiles?.full_name ?? "Unknown"}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (!addId) return;
                  addMut.mutate(
                    { team_id: team.id, member_id: addId },
                    { onSuccess: () => setAddId("") },
                  );
                }}
                disabled={!addId || addMut.isPending}
                className="bg-green-500 text-white rounded-lg px-3 py-2 hover:bg-green-600 disabled:opacity-50"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Member list */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Members ({(team.team_members ?? []).length})
            </p>
            {(team.team_members ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">No members yet. Add some above.</p>
            ) : (
              <div className="space-y-2">
                {(team.team_members ?? []).map(tm => {
                  const mName = tm.member?.profiles?.full_name ?? "Unknown";
                  return (
                    <div key={tm.id} className="flex items-center gap-2.5 bg-gray-50 rounded-lg px-3 py-2">
                      <Avatar name={mName} size="sm" />
                      <span className="text-sm text-gray-700 flex-1">{mName}</span>
                      <button
                        onClick={() => removeMut.mutate({ id: tm.id })}
                        disabled={removeMut.isPending}
                        className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE TEAM MODAL
// ─────────────────────────────────────────────────────────────────────────────
function CreateTeamModal({ members, onClose }) {
  const [name,   setName]   = useState("");
  const [leadId, setLeadId] = useState("");
  const createMut = useCreateTeam();

  function handleSubmit(e) {
    e.preventDefault();
    createMut.mutate(
      { name: name.trim(), lead_id: leadId || null },
      { onSuccess: onClose },
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Create Team</h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Engineering"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team Lead <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select
              value={leadId}
              onChange={e => setLeadId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              <option value="">No lead</option>
              {members.filter(m => !m.deactivated_at).map(m => (
                <option key={m.id} value={m.id}>{m.profiles?.full_name ?? "Unknown"}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white text-gray-700 border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMut.isPending}
              className="flex-1 bg-green-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-600 disabled:opacity-70"
            >
              {createMut.isPending ? "Creating…" : "Create Team"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TEAMS TAB
// ─────────────────────────────────────────────────────────────────────────────
function TeamsTab({ members }) {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showCreate,   setShowCreate]   = useState(false);

  const { data: teams = [], isLoading, isError } = useTeams();
  const totalTeamMembers = teams.reduce((s, t) => s + (t.team_members?.length ?? 0), 0);

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {isLoading ? (
          [...Array(2)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : (
          [
            { label: "Total Teams",  value: teams.length,     icon: Users,     color: "text-indigo-600 bg-indigo-50" },
            { label: "Team Members", value: totalTeamMembers, icon: UserCheck, color: "text-teal-600 bg-teal-50"     },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon size={17} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="text-xl font-bold text-gray-900 tabular-nums">{value}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Action bar */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowCreate(true)}
          className="bg-green-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-600 flex items-center gap-2"
        >
          <Plus size={14} /> New Team
        </button>
      </div>

      {/* Teams grid */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : isError ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm py-16 text-center">
          <p className="text-sm text-gray-500">Unable to load teams. Please try again.</p>
        </div>
      ) : teams.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm py-16 text-center">
          <Users size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 mb-4">No teams yet</p>
          <button
            onClick={() => setShowCreate(true)}
            className="text-sm text-green-600 font-medium hover:text-green-700"
          >
            Create your first team →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {teams.map(team => {
            const leadName       = team.lead?.profiles?.full_name;
            const teamMemberList = team.team_members ?? [];
            return (
              <div
                key={team.id}
                onClick={() => setSelectedTeam(team)}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-green-200 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <Users size={18} className="text-indigo-600" />
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {teamMemberList.length} member{teamMemberList.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">{team.name}</h4>
                {leadName ? (
                  <div className="flex items-center gap-1.5 mb-3">
                    <Avatar name={leadName} size="sm" />
                    <span className="text-xs text-gray-500 truncate">{leadName}</span>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 mb-3">No lead assigned</p>
                )}
                {teamMemberList.length > 0 && (
                  <div className="flex -space-x-2">
                    {teamMemberList.slice(0, 5).map(tm => (
                      <Avatar
                        key={tm.id}
                        name={tm.member?.profiles?.full_name ?? "?"}
                        size="sm"
                        className="ring-2 ring-white"
                      />
                    ))}
                    {teamMemberList.length > 5 && (
                      <div className="w-7 h-7 rounded-full bg-gray-100 ring-2 ring-white flex items-center justify-center text-xs text-gray-500 font-medium">
                        +{teamMemberList.length - 5}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedTeam && (
        <TeamDrawer
          team={selectedTeam}
          members={members}
          onClose={() => setSelectedTeam(null)}
        />
      )}
      {showCreate && (
        <CreateTeamModal members={members} onClose={() => setShowCreate(false)} />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEPARTMENT MODAL (create / edit)
// ─────────────────────────────────────────────────────────────────────────────
function DeptModal({ dept, onClose }) {
  const [name, setName] = useState(dept?.name ?? "");
  const [code, setCode] = useState(dept?.code ?? "");

  const createMut = useCreateDepartment();
  const updateMut = useUpdateDepartment();
  const isEdit    = !!dept;
  const isPending = createMut.isPending || updateMut.isPending;

  function handleSubmit(e) {
    e.preventDefault();
    const values = { name: name.trim(), code: code.trim() || null };
    if (isEdit) {
      updateMut.mutate({ id: dept.id, ...values }, { onSuccess: onClose });
    } else {
      createMut.mutate(values, { onSuccess: onClose });
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEdit ? "Edit Department" : "New Department"}
          </h3>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department Name</label>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Finance"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. FIN"
              maxLength={10}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 font-mono"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white text-gray-700 border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-green-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-600 disabled:opacity-70"
            >
              {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DEPARTMENTS TAB
// ─────────────────────────────────────────────────────────────────────────────
function DepartmentsTab({ departments, members, isLoading }) {
  const [deptModal,     setDeptModal]     = useState(null); // null | "create" | dept obj
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const deleteMut = useDeleteDepartment();

  const memberCountByDept = useMemo(() => {
    const map = {};
    members.forEach(m => {
      if (m.department_id) map[m.department_id] = (map[m.department_id] ?? 0) + 1;
    });
    return map;
  }, [members]);

  return (
    <>
      {/* Action bar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {departments.length} department{departments.length !== 1 ? "s" : ""}
        </p>
        <button
          onClick={() => setDeptModal("create")}
          className="bg-green-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-600 flex items-center gap-2"
        >
          <Plus size={14} /> New Department
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : departments.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm py-16 text-center">
          <Building2 size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 mb-4">No departments yet</p>
          <button
            onClick={() => setDeptModal("create")}
            className="text-sm text-green-600 font-medium hover:text-green-700"
          >
            Create your first department →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {departments.map(dept => {
            const count = memberCountByDept[dept.id] ?? 0;
            return (
              <div
                key={dept.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                    <Building2 size={18} className="text-purple-600" />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setDeptModal(dept)}
                      className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(dept)}
                      className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <h4 className="font-semibold text-gray-900">{dept.name}</h4>
                {dept.code && (
                  <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                    {dept.code}
                  </span>
                )}
                <p className="text-sm text-gray-500 mt-2">
                  {count} member{count !== 1 ? "s" : ""}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit modal */}
      {deptModal && (
        <DeptModal
          dept={deptModal === "create" ? null : deptModal}
          onClose={() => setDeptModal(null)}
        />
      )}

      {/* Delete confirm dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Department?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?
              Members in this department will become unassigned.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-white text-gray-700 border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  deleteMut.mutate(
                    { id: deleteConfirm.id },
                    { onSuccess: () => setDeleteConfirm(null) },
                  )
                }
                disabled={deleteMut.isPending}
                className="flex-1 bg-red-500 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-red-600 disabled:opacity-70"
              >
                {deleteMut.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
const TABS = ["People", "Teams", "Departments"];

export default function PeopleTeams() {
  const [tab, setTab] = useState("People");

  const { data: members     = [], isLoading: membersLoading } = useMembers();
  const { data: departments = [], isLoading: deptsLoading   } = useDepartments();
  const { data: allCards    = [] }                             = useCards();

  const cardsByMember = useMemo(() =>
    allCards.reduce((acc, c) => {
      if (c.member_id) acc[c.member_id] = [...(acc[c.member_id] ?? []), c];
      return acc;
    }, {}),
  [allCards]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">People & Teams</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage employees, teams, and departments</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-200 shadow-sm p-1 mb-6 w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? "bg-green-500 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "People" && (
        <PeopleTab
          members={members}
          departments={departments}
          cardsByMember={cardsByMember}
          isLoading={membersLoading}
        />
      )}
      {tab === "Teams" && (
        <TeamsTab members={members} />
      )}
      {tab === "Departments" && (
        <DepartmentsTab
          departments={departments}
          members={members}
          isLoading={deptsLoading}
        />
      )}
    </div>
  );
}
