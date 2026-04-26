import { useState, useEffect, useMemo, useRef } from "react";
import {
  User, Building2, Users, Briefcase, Calculator,
  FileText, Bell, Plug, CreditCard,
  Check, AlertCircle, Plus, Trash2, LogOut,
  ExternalLink, Pencil, Upload, X as XIcon, ImageIcon,
} from "lucide-react";
import {
  useOrganization, useUpdateOrganization,
  useOrgSettings, useUpdateOrgSettings,
  useProfile, useUpdateProfile,
  uploadLogo,
} from "../hooks/useOrg";
import {
  useMembers, useDepartments, useUpdateMember,
  useDeactivateMember, useReactivateMember,
  useCreateDepartment, useUpdateDepartment, useDeleteDepartment,
} from "../hooks/useMembers";
import { useIntegrations, useDisconnectIntegration } from "../hooks/useIntegrations";
import { useSaasPlans, useSubscribePlan } from "../hooks/useSubscription";
import { useAuth } from "../context/AuthContext";
import { fmt } from "../lib/fmt";

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: "profile",       label: "Profile",       icon: User       },
  { id: "organization",  label: "Organization",  icon: Building2  },
  { id: "team",          label: "Team",          icon: Users      },
  { id: "departments",   label: "Departments",   icon: Briefcase  },
  { id: "finance",       label: "Finance",       icon: Calculator },
  { id: "invoicing",     label: "Invoicing",     icon: FileText   },
  { id: "notifications", label: "Notifications", icon: Bell       },
  { id: "integrations",  label: "Integrations",  icon: Plug       },
  { id: "billing",       label: "Billing",       icon: CreditCard },
];

const COUNTRIES = [
  { code: "GH", name: "Ghana" },
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" },
  { code: "ZA", name: "South Africa" },
  { code: "UG", name: "Uganda" },
  { code: "TZ", name: "Tanzania" },
  { code: "RW", name: "Rwanda" },
  { code: "ET", name: "Ethiopia" },
  { code: "EG", name: "Egypt" },
  { code: "MA", name: "Morocco" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
];

const CURRENCIES = [
  { code: "GHS", name: "Ghanaian Cedi" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "KES", name: "Kenyan Shilling" },
  { code: "ZAR", name: "South African Rand" },
  { code: "USD", name: "US Dollar" },
  { code: "GBP", name: "Pound Sterling" },
  { code: "EUR", name: "Euro" },
];

const TIMEZONES = [
  "Africa/Accra", "Africa/Lagos", "Africa/Nairobi", "Africa/Johannesburg",
  "Africa/Kampala", "Africa/Cairo", "Africa/Casablanca",
  "Etc/UTC", "America/New_York", "Europe/London", "Europe/Berlin",
];

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const ROLES = [
  { value: "owner",    label: "Owner"    },
  { value: "admin",    label: "Admin"    },
  { value: "manager",  label: "Manager"  },
  { value: "employee", label: "Employee" },
];

const ROLE_BADGE = {
  owner:    "bg-purple-100 text-purple-700",
  admin:    "bg-blue-100 text-blue-700",
  manager:  "bg-amber-100 text-amber-700",
  employee: "bg-gray-100 text-gray-600",
};

// ── Primitives ────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

function Card({ children, className = "" }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 ${className}`}>
      {children}
    </div>
  );
}

function SectionHeader({ title, description, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function Field({ label, hint, children, full = false }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500";

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-300 focus:ring-offset-2 ${
        checked ? "bg-green-500" : "bg-gray-300"
      } disabled:opacity-50`}
    >
      <span
        className={`absolute top-1 inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function SaveButton({ onClick, isPending, disabled, savedAt }) {
  // Show "Saved ✓" for 2s after save
  const recentlySaved = savedAt && Date.now() - savedAt < 2000;
  return (
    <div className="flex items-center gap-3">
      {recentlySaved && (
        <span className="flex items-center gap-1 text-xs font-medium text-green-600">
          <Check size={13} /> Saved
        </span>
      )}
      <button
        onClick={onClick}
        disabled={disabled || isPending}
        className="bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg px-5 py-2 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isPending ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

// Compare two flat objects for equality (shallow)
function isDirty(a, b) {
  if (!a || !b) return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if ((a[k] ?? "") !== (b[k] ?? "")) return true;
  }
  return false;
}

// Initials from full name
function initials(name = "") {
  if (!name) return "?";
  const p = name.trim().split(/\s+/);
  if (p.length === 1) return p[0][0]?.toUpperCase() ?? "?";
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

// Convert money input field <-> minor units
function majorToMinor(major) {
  if (major === "" || major == null) return null;
  const n = parseFloat(String(major).replace(/,/g, ""));
  if (isNaN(n)) return null;
  return Math.round(n * 100);
}
function minorToMajor(minor) {
  if (minor == null) return "";
  return (minor / 100).toFixed(2);
}

// ── Profile Tab ───────────────────────────────────────────────────────────────

function ProfileTab() {
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const [form, setForm] = useState(null);
  const [orig, setOrig] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    if (profile && !form) {
      const init = {
        full_name: profile.full_name ?? "",
        phone:     profile.phone     ?? "",
        job_title: profile.job_title ?? "",
      };
      setForm(init);
      setOrig(init);
    }
  }, [profile, form]);

  if (isLoading || !form) {
    return (
      <Card>
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </Card>
    );
  }

  const dirty = isDirty(form, orig);

  const onSave = () => {
    updateProfile.mutate(form, {
      onSuccess: () => {
        setOrig(form);
        setSavedAt(Date.now());
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <SectionHeader
          title="Profile"
          description="How others see you across LedgeSuite."
        />
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-xl font-bold shadow-sm">
            {initials(form.full_name || user?.email)}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{form.full_name || "Unnamed"}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name">
            <input
              className={inputCls}
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </Field>
          <Field label="Email" hint="Email is managed via your auth provider.">
            <input className={inputCls} value={user?.email ?? ""} disabled />
          </Field>
          <Field label="Phone">
            <input
              className={inputCls}
              placeholder="+233 24 000 0000"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Job Title">
            <input
              className={inputCls}
              placeholder="Finance Lead"
              value={form.job_title}
              onChange={(e) => setForm({ ...form, job_title: e.target.value })}
            />
          </Field>
        </div>

        <div className="flex justify-end mt-6">
          <SaveButton
            onClick={onSave}
            disabled={!dirty}
            isPending={updateProfile.isPending}
            savedAt={savedAt}
          />
        </div>
      </Card>

      <Card>
        <SectionHeader
          title="Sign out"
          description="End your session on this device."
        />
        <button
          onClick={signOut}
          className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <LogOut size={14} /> Sign out
        </button>
      </Card>
    </div>
  );
}

// ── Organization Tab ──────────────────────────────────────────────────────────

function OrganizationTab() {
  const { data: org, isLoading } = useOrganization();
  const updateOrg = useUpdateOrganization();

  const [form, setForm] = useState(null);
  const [orig, setOrig] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    if (org && !form) {
      const init = {
        name:              org.name              ?? "",
        industry:          org.industry          ?? "",
        country_code:      org.country_code      ?? "GH",
        base_currency:     org.base_currency     ?? "GHS",
        timezone:          org.timezone          ?? "Africa/Accra",
        tin:               org.tin               ?? "",
        website:           org.website           ?? "",
        logo_url:          org.logo_url          ?? "",
        fiscal_year_start: org.fiscal_year_start ?? 1,
      };
      setForm(init);
      setOrig(init);
    }
  }, [org, form]);

  if (isLoading || !form) {
    return (
      <Card>
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </Card>
    );
  }

  const dirty = isDirty(form, orig);

  const onSave = () => {
    updateOrg.mutate(
      { ...form, fiscal_year_start: Number(form.fiscal_year_start) || 1 },
      {
        onSuccess: () => {
          setOrig(form);
          setSavedAt(Date.now());
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <SectionHeader
          title="Organization"
          description="Information about your company that appears in invoices, reports, and across the app."
        />

        <div className="grid grid-cols-2 gap-4">
          <Field label="Company Name" full>
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Slug" hint="Used in URLs. Read-only.">
            <input className={inputCls} value={org.slug ?? ""} disabled />
          </Field>
          <Field label="Industry">
            <input
              className={inputCls}
              placeholder="Software, Retail, Manufacturing…"
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
            />
          </Field>
          <Field label="Country">
            <select
              className={inputCls}
              value={form.country_code}
              onChange={(e) => setForm({ ...form, country_code: e.target.value })}
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Base Currency" hint="Default currency for new transactions.">
            <select
              className={inputCls}
              value={form.base_currency}
              onChange={(e) => setForm({ ...form, base_currency: e.target.value })}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Timezone">
            <select
              className={inputCls}
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </Field>
          <Field label="Fiscal Year Starts" hint="Month your accounting year begins.">
            <select
              className={inputCls}
              value={form.fiscal_year_start}
              onChange={(e) => setForm({ ...form, fiscal_year_start: e.target.value })}
            >
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="Tax ID / TIN">
            <input
              className={inputCls}
              value={form.tin}
              onChange={(e) => setForm({ ...form, tin: e.target.value })}
            />
          </Field>
          <Field label="Website">
            <input
              className={inputCls}
              placeholder="https://example.com"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </Field>
          <Field label="Company Logo" full hint="Shown across the app and on invoices as a fallback when no invoice-specific logo is set.">
            <LogoUploadField
              value={form.logo_url}
              onChange={(url) => setForm({ ...form, logo_url: url })}
              orgId={org?.id}
            />
          </Field>
        </div>

        <div className="flex justify-end mt-6">
          <SaveButton
            onClick={onSave}
            disabled={!dirty}
            isPending={updateOrg.isPending}
            savedAt={savedAt}
          />
        </div>
      </Card>
    </div>
  );
}

// ── Team Tab ──────────────────────────────────────────────────────────────────

function TeamTab() {
  const { memberId: myMemberId, myRole } = useAuth();
  const { data: members = [], isLoading } = useMembers();
  const updateMember     = useUpdateMember();
  const deactivateMember = useDeactivateMember();
  const reactivateMember = useReactivateMember();

  const canManage = myRole === "owner" || myRole === "admin";

  return (
    <Card>
      <SectionHeader
        title="Team"
        description={
          canManage
            ? "Manage roles and access for everyone in your workspace."
            : "Members of your workspace. Only owners and admins can change roles."
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : members.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No members yet</p>
      ) : (
        <div className="border border-gray-100 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Member", "Role", "Department", "Status", ""].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const name = m.profiles?.full_name ?? "—";
                const isActive = !m.deactivated_at;
                const isMe = m.id === myMemberId;

                return (
                  <tr key={m.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {initials(name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {name}
                            {isMe && <span className="ml-2 text-xs font-normal text-gray-400">(you)</span>}
                          </p>
                          {m.profiles?.job_title && (
                            <p className="text-xs text-gray-400 truncate">{m.profiles.job_title}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {canManage && !isMe ? (
                        <select
                          className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white"
                          value={m.role}
                          onChange={(e) => updateMember.mutate({ id: m.id, role: e.target.value })}
                          disabled={updateMember.isPending}
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ROLE_BADGE[m.role] ?? "bg-gray-100 text-gray-600"}`}>
                          {m.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {m.departments?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {isActive ? <Check size={10} /> : <AlertCircle size={10} />}
                        {isActive ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canManage && !isMe && (
                        isActive ? (
                          <button
                            onClick={() => deactivateMember.mutate({ id: m.id })}
                            disabled={deactivateMember.isPending}
                            className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => reactivateMember.mutate({ id: m.id })}
                            disabled={reactivateMember.isPending}
                            className="text-xs text-green-600 hover:text-green-700 font-medium disabled:opacity-50"
                          >
                            Reactivate
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!canManage && (
        <p className="text-xs text-gray-400 mt-4">
          Only owners and admins can change roles or deactivate members.
        </p>
      )}
    </Card>
  );
}

// ── Departments Tab ───────────────────────────────────────────────────────────

function DepartmentsTab() {
  const { orgCurrency } = useAuth();
  const currency = orgCurrency ?? "GHS";

  const { data: departments = [], isLoading } = useDepartments();
  const { data: members = [] }                = useMembers();
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deleteDept = useDeleteDepartment();

  // Lookup manager name by member id (since useDepartments returns flat rows)
  const managerById = useMemo(() => {
    const m = {};
    for (const mem of members) {
      m[mem.id] = mem.profiles?.full_name ?? null;
    }
    return m;
  }, [members]);

  const mutationError =
    createDept.error?.message ||
    updateDept.error?.message ||
    deleteDept.error?.message ||
    null;

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", code: "", budget: "" });

  const reset = () => {
    setAdding(false);
    setEditingId(null);
    setForm({ name: "", code: "", budget: "" });
  };

  const startEdit = (d) => {
    setEditingId(d.id);
    setAdding(false);
    setForm({
      name:   d.name ?? "",
      code:   d.code ?? "",
      budget: minorToMajor(d.budget_amount),
    });
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const payload = {
      name:          form.name.trim(),
      code:          form.code.trim() || null,
      budget_amount: majorToMinor(form.budget) ?? 0,
      currency,
    };
    if (editingId) {
      updateDept.mutate({ id: editingId, ...payload }, { onSuccess: reset });
    } else {
      createDept.mutate(payload, { onSuccess: reset });
    }
  };

  return (
    <Card>
      <SectionHeader
        title="Departments"
        description="Organize team members and track budgets by department."
        action={
          !adding && !editingId && (
            <button
              onClick={() => { setAdding(true); setForm({ name: "", code: "", budget: "" }); }}
              className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus size={14} /> New department
            </button>
          )
        }
      />

      {mutationError && (
        <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Couldn't save changes</p>
            <p className="text-xs text-red-600 mt-0.5">{mutationError}</p>
          </div>
        </div>
      )}

      {(adding || editingId) && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Name">
              <input
                className={inputCls}
                placeholder="Engineering"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
              />
            </Field>
            <Field label="Code" hint="Short identifier, e.g. ENG">
              <input
                className={inputCls}
                placeholder="ENG"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
            </Field>
            <Field label={`Budget (${currency})`}>
              <input
                className={inputCls}
                placeholder="0.00"
                inputMode="decimal"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={reset}
              className="text-sm text-gray-600 hover:text-gray-800 px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!form.name.trim() || createDept.isPending || updateDept.isPending}
              className="bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
            >
              {(createDept.isPending || updateDept.isPending) ? "Saving…" : (editingId ? "Save" : "Create")}
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : departments.length === 0 && !adding ? (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg">
          <Briefcase size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500 mb-1">No departments yet</p>
          <p className="text-xs text-gray-400">Create one to start tracking budgets per team.</p>
        </div>
      ) : (
        <div className="border border-gray-100 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {["Name", "Code", "Manager", "Budget", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => {
                const managerName = managerById[d.manager_id] ?? "—";
                return (
                  <tr key={d.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{d.name}</td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">
                      {d.code ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{managerName}</td>
                    <td className="px-4 py-3 text-sm font-semibold tabular-nums text-gray-800">
                      {fmt(d.budget_amount, d.currency ?? currency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => startEdit(d)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 rounded transition-colors"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${d.name}"? This cannot be undone.`)) {
                              deleteDept.mutate({ id: d.id });
                            }
                          }}
                          disabled={deleteDept.isPending}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// ── LogoUploadField ───────────────────────────────────────────────────────────
// Reusable component: shows a preview + click-to-upload + manual URL fallback.
// `value`    = current URL string
// `onChange` = (newUrl) => void
// `orgId`    = used to namespace the upload path

function LogoUploadField({ value, onChange, orgId, hint }) {
  const fileRef   = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 2 MB guard
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2 MB.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const url = await uploadLogo(file, orgId);
      onChange(url);
    } catch (err) {
      setError(err.message ?? "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      // reset so the same file can be re-selected if needed
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-2">
      {/* Upload zone */}
      <div
        onClick={() => !uploading && fileRef.current?.click()}
        className={`relative flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-3 cursor-pointer transition-colors ${
          uploading
            ? "border-green-300 bg-green-50"
            : "border-gray-200 hover:border-green-400 hover:bg-green-50/40"
        }`}
      >
        {/* Thumbnail */}
        <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
          {value ? (
            <img
              src={value}
              alt="Logo"
              className="w-full h-full object-contain"
              onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextSibling.style.display = "flex"; }}
            />
          ) : null}
          <div className={`w-full h-full items-center justify-center ${value ? "hidden" : "flex"}`}>
            <ImageIcon size={20} className="text-gray-300" />
          </div>
        </div>

        {/* Label */}
        <div className="flex-1 min-w-0">
          {uploading ? (
            <p className="text-sm font-medium text-green-600">Uploading…</p>
          ) : value ? (
            <>
              <p className="text-sm font-medium text-gray-700 truncate">{value.split("/").pop()}</p>
              <p className="text-xs text-gray-400">Click to replace</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700">Click to upload</p>
              <p className="text-xs text-gray-400">PNG, JPG, WebP or SVG · max 2 MB</p>
            </>
          )}
        </div>

        {/* Upload icon / spinner */}
        <div className="shrink-0">
          {uploading ? (
            <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Upload size={16} className="text-gray-400" />
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {/* Clear button */}
      {value && !uploading && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          <XIcon size={12} /> Remove logo
        </button>
      )}

      {/* Error */}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-600">
          <AlertCircle size={12} /> {error}
        </p>
      )}

      {/* Optional hint */}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

// ── Tax Types Manager ─────────────────────────────────────────────────────────

function TaxTypesManager({ settings, updateSettings }) {
  const taxTypes = settings?.tax_rates ?? [];
  const [editing, setEditing] = useState(null); // tax id | "new" | null
  const [form, setForm]       = useState({ name: "", rate: "" });
  const [saving, setSaving]   = useState(false);

  const openNew  = () => { setEditing("new"); setForm({ name: "", rate: "" }); };
  const openEdit = (t) => { setEditing(t.id); setForm({ name: t.name, rate: String(t.rate) }); };
  const cancel   = () => { setEditing(null); setForm({ name: "", rate: "" }); };

  const isFormValid = form.name.trim() && form.rate !== "" && !isNaN(parseFloat(form.rate));

  const save = () => {
    if (!isFormValid) return;
    const rate = parseFloat(form.rate);
    let next;
    if (editing === "new") {
      next = [...taxTypes, { id: crypto.randomUUID(), name: form.name.trim(), rate }];
    } else {
      next = taxTypes.map((t) => t.id === editing ? { ...t, name: form.name.trim(), rate } : t);
    }
    setSaving(true);
    updateSettings.mutate({ tax_rates: next }, {
      onSuccess: () => { setSaving(false); cancel(); },
      onError:   () =>  setSaving(false),
    });
  };

  const remove = (id) => {
    if (!window.confirm("Remove this tax type? It won't affect existing invoices.")) return;
    updateSettings.mutate({ tax_rates: taxTypes.filter((t) => t.id !== id) });
  };

  return (
    <Card className="mt-4">
      <SectionHeader
        title="Tax Types"
        description="Define named tax rates to apply when creating invoices. All saved types appear in the invoice builder."
      />

      {taxTypes.length > 0 && (
        <div className="border border-gray-100 rounded-xl overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rate</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {taxTypes.map((t) =>
                editing === t.id ? (
                  <tr key={t.id} className="bg-green-50/40">
                    <td className="px-3 py-2">
                      <input
                        autoFocus
                        className={inputCls}
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. VAT"
                        onKeyDown={(e) => e.key === "Enter" && save()}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number" min="0" max="100" step="0.01"
                          className="w-20 border border-gray-200 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300"
                          value={form.rate}
                          onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
                          placeholder="0.00"
                          onKeyDown={(e) => e.key === "Enter" && save()}
                        />
                        <span className="text-xs text-gray-400">%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={save}
                          disabled={saving || !isFormValid}
                          className="px-2.5 py-1.5 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancel}
                          className="px-2.5 py-1.5 bg-white text-gray-600 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={t.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{t.name}</td>
                    <td className="px-4 py-3 text-gray-600 tabular-nums">{t.rate}%</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => openEdit(t)}
                          className="p-1.5 text-gray-400 hover:text-green-600 rounded transition-colors"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => remove(t.id)}
                          disabled={updateSettings.isPending}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors disabled:opacity-50"
                          title="Remove"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {taxTypes.length === 0 && editing !== "new" && (
        <p className="text-sm text-gray-400 mb-4 text-center py-6 border border-dashed border-gray-200 rounded-xl">
          No tax types yet. Add one below.
        </p>
      )}

      {editing === "new" ? (
        <div className="flex items-end gap-3 p-4 bg-green-50 rounded-xl border border-green-100">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Tax Name</label>
            <input
              autoFocus
              className={inputCls}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. VAT, NHIL, GST, Withholding Tax"
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
          </div>
          <div className="w-28">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Rate (%)</label>
            <input
              type="number" min="0" max="100" step="0.01"
              className={inputCls}
              value={form.rate}
              onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
              placeholder="0.00"
              onKeyDown={(e) => e.key === "Enter" && save()}
            />
          </div>
          <div className="flex gap-2 pb-0.5">
            <button
              onClick={save}
              disabled={saving || !isFormValid}
              className="px-4 py-2 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
            >
              {saving ? "Adding…" : "Add"}
            </button>
            <button
              onClick={cancel}
              className="px-4 py-2 bg-white text-gray-600 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={openNew}
          className="flex items-center gap-2 text-sm font-semibold text-green-600 hover:text-green-700 transition-colors"
        >
          <Plus size={15} /> Add Tax Type
        </button>
      )}
    </Card>
  );
}

// ── Finance Tab ───────────────────────────────────────────────────────────────

function FinanceTab() {
  const { orgCurrency } = useAuth();
  const currency = orgCurrency ?? "GHS";

  const { data: settings, isLoading } = useOrgSettings();
  const updateSettings = useUpdateOrgSettings();

  const [form, setForm] = useState(null);
  const [orig, setOrig] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    if (settings && !form) {
      const init = {
        revenue_recognition_method:    settings.revenue_recognition_method ?? "accrual",
        default_tax_rate:              settings.default_tax_rate ?? 0,
        default_payment_terms:         settings.default_payment_terms ?? "Net 30",
        expense_approval_threshold:    minorToMajor(settings.expense_approval_threshold),
        card_txn_approval_threshold:   minorToMajor(settings.card_txn_approval_threshold),
        require_receipts_above:        minorToMajor(settings.require_receipts_above),
      };
      setForm(init);
      setOrig(init);
    }
  }, [settings, form]);

  if (isLoading || !form) {
    return (
      <Card>
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </Card>
    );
  }

  const dirty = isDirty(form, orig);

  const onSave = () => {
    const payload = {
      revenue_recognition_method:  form.revenue_recognition_method,
      default_tax_rate:            Number(form.default_tax_rate) || 0,
      default_payment_terms:       form.default_payment_terms,
      expense_approval_threshold:  majorToMinor(form.expense_approval_threshold),
      card_txn_approval_threshold: majorToMinor(form.card_txn_approval_threshold),
      require_receipts_above:      majorToMinor(form.require_receipts_above),
    };
    updateSettings.mutate(payload, {
      onSuccess: () => {
        setOrig(form);
        setSavedAt(Date.now());
      },
    });
  };

  return (
    <>
    <Card>
      <SectionHeader
        title="Finance preferences"
        description="Defaults that apply across accounting, expenses, and approvals."
      />

      <div className="grid grid-cols-2 gap-4">
        <Field label="Revenue Recognition" hint="Cash records when paid; accrual records when earned.">
          <select
            className={inputCls}
            value={form.revenue_recognition_method}
            onChange={(e) => setForm({ ...form, revenue_recognition_method: e.target.value })}
          >
            <option value="accrual">Accrual</option>
            <option value="cash">Cash</option>
          </select>
        </Field>
        <Field label="Default Tax Rate (%)" hint="Used as the default on new invoices and bills.">
          <input
            className={inputCls}
            type="number"
            min="0" max="100" step="0.01"
            value={form.default_tax_rate}
            onChange={(e) => setForm({ ...form, default_tax_rate: e.target.value })}
          />
        </Field>
        <Field label="Default Payment Terms" hint="Shown on invoices, e.g. Net 30, Due on receipt.">
          <input
            className={inputCls}
            value={form.default_payment_terms}
            onChange={(e) => setForm({ ...form, default_payment_terms: e.target.value })}
          />
        </Field>
        <div /> {/* spacer */}

        <Field
          label={`Expense Approval Threshold (${currency})`}
          hint="Expenses above this amount require approval."
        >
          <input
            className={inputCls}
            inputMode="decimal"
            placeholder="0.00"
            value={form.expense_approval_threshold}
            onChange={(e) => setForm({ ...form, expense_approval_threshold: e.target.value })}
          />
        </Field>
        <Field
          label={`Card Transaction Approval (${currency})`}
          hint="Card purchases above this amount need approval."
        >
          <input
            className={inputCls}
            inputMode="decimal"
            placeholder="0.00"
            value={form.card_txn_approval_threshold}
            onChange={(e) => setForm({ ...form, card_txn_approval_threshold: e.target.value })}
          />
        </Field>
        <Field
          label={`Require Receipts Above (${currency})`}
          hint="Submitters must attach a receipt for spend above this amount."
        >
          <input
            className={inputCls}
            inputMode="decimal"
            placeholder="0.00"
            value={form.require_receipts_above}
            onChange={(e) => setForm({ ...form, require_receipts_above: e.target.value })}
          />
        </Field>
      </div>

      <div className="flex justify-end mt-6">
        <SaveButton
          onClick={onSave}
          disabled={!dirty}
          isPending={updateSettings.isPending}
          savedAt={savedAt}
        />
      </div>
    </Card>

    <TaxTypesManager settings={settings} updateSettings={updateSettings} />
    </>
  );
}

// ── Invoice sample preview ────────────────────────────────────────────────────

function InvoicePreviewSample({ color, logoUrl, footerText, orgName, orgTin, taxRates, defaultTaxRate }) {
  const name      = orgName || "Your Company";
  const SUBTOTAL  = 400000; // minor units, 4000.00
  const fmtN      = (n) => `GH₵ ${((n ?? 0) / 100).toLocaleString("en", { minimumFractionDigits: 2 })}`;
  const taxLines  = (taxRates ?? []).length > 0
    ? (taxRates ?? []).map((t) => ({ name: t.name, rate: t.rate, amount: Math.round(SUBTOTAL * (t.rate || 0) / 100) }))
    : defaultTaxRate > 0
      ? [{ name: "Tax", rate: defaultTaxRate, amount: Math.round(SUBTOTAL * defaultTaxRate / 100) }]
      : [];
  const taxTotal  = taxLines.reduce((s, t) => s + t.amount, 0);
  const total     = SUBTOTAL + taxTotal;
  const ITEMS     = [
    { desc: "Website design & development", qty: 1, total: 250000 },
    { desc: "Monthly maintenance (3 mo.)",  qty: 3, total: 150000 },
  ];

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 text-[11px] leading-relaxed">
      {/* Header */}
      <div className="px-5 py-4 flex items-start justify-between" style={{ background: color }}>
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-7 w-auto object-contain rounded"
              onError={(e) => { e.currentTarget.style.display = "none"; }} />
          ) : (
            <div className="w-7 h-7 bg-white/25 rounded-lg flex items-center justify-center text-white font-black text-sm">
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-white font-bold text-xs leading-tight">{name}</p>
            {orgTin && <p className="text-white/70 text-[10px]">TIN: {orgTin}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-white/70 text-[9px] uppercase tracking-widest mb-0.5">Invoice</p>
          <p className="text-white font-black text-sm">INV-2026-0001</p>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        {/* Bill to / dates */}
        <div className="flex justify-between mb-4">
          <div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Bill To</p>
            <p className="font-bold text-gray-900 text-xs">Acme Limited</p>
            <p className="text-gray-500">acme@example.com</p>
          </div>
          <div className="text-right text-gray-500 space-y-0.5">
            <p><span className="text-gray-400">Issue:</span> 01 May 2026</p>
            <p><span className="text-gray-400">Due:</span>   31 May 2026</p>
            <p><span className="text-gray-400">Terms:</span> Net 30</p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 mb-3" />

        {/* Line items */}
        <table className="w-full mb-3">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left py-1.5 px-2 text-[9px] font-bold text-gray-400 uppercase rounded-l">Description</th>
              <th className="text-right py-1.5 px-2 text-[9px] font-bold text-gray-400 uppercase">Qty</th>
              <th className="text-right py-1.5 px-2 text-[9px] font-bold text-gray-400 uppercase rounded-r">Amount</th>
            </tr>
          </thead>
          <tbody>
            {ITEMS.map((it, i) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="py-1.5 px-2 text-gray-700">{it.desc}</td>
                <td className="py-1.5 px-2 text-right text-gray-500">{it.qty}</td>
                <td className="py-1.5 px-2 text-right font-semibold text-gray-900">{fmtN(it.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-4">
          <div className="w-44 space-y-0.5">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span><span className="tabular-nums">{fmtN(SUBTOTAL)}</span>
            </div>
            {taxLines.map((t, i) => (
              <div key={i} className="flex justify-between text-gray-500">
                <span>{t.name} ({t.rate}%)</span>
                <span className="tabular-nums">{fmtN(t.amount)}</span>
              </div>
            ))}
            <div className="h-px bg-gray-200 my-1" />
            <div className="flex justify-between font-bold text-gray-900 rounded px-2 py-1 bg-green-50">
              <span>Total</span>
              <span className="tabular-nums" style={{ color: color }}>{fmtN(total)}</span>
            </div>
          </div>
        </div>

        {/* Notes placeholder */}
        <div className="bg-gray-50 rounded-lg p-2.5 mb-4">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Notes</p>
          <p className="text-gray-500">Please pay within 30 days. Thank you!</p>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 pt-3 space-y-1.5">
          {footerText && (
            <p className="text-[10px] text-gray-500 whitespace-pre-line">{footerText}</p>
          )}
          <div className="flex justify-between">
            <p className="text-[9px] text-gray-400">{name}{orgTin ? ` · TIN: ${orgTin}` : ""}</p>
            <p className="text-[9px] text-gray-300 font-mono">INV-2026-0001</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Invoicing Tab ─────────────────────────────────────────────────────────────

function InvoicingTab() {
  const { orgId }                     = useAuth();
  const { data: settings, isLoading } = useOrgSettings();
  const { data: org }                 = useOrganization();
  const updateSettings = useUpdateOrgSettings();

  const [form, setForm] = useState(null);
  const [orig, setOrig] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    if (settings && !form) {
      const init = {
        invoice_logo_url:    settings.invoice_logo_url    ?? "",
        invoice_color_hex:   settings.invoice_color_hex   ?? "#22C55E",
        invoice_footer_text: settings.invoice_footer_text ?? "",
      };
      setForm(init);
      setOrig(init);
    }
  }, [settings, form]);

  if (isLoading || !form) {
    return (
      <div className="grid grid-cols-[1fr_340px] gap-6">
        <Card>
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        </Card>
        <Skeleton className="h-[480px] rounded-xl" />
      </div>
    );
  }

  const dirty = isDirty(form, orig);

  const onSave = () => {
    updateSettings.mutate(form, {
      onSuccess: () => {
        setOrig(form);
        setSavedAt(Date.now());
      },
    });
  };

  // Resolve effective logo: invoice-specific override first, then org logo
  const previewLogo    = form.invoice_logo_url || org?.logo_url || "";
  const previewOrgName = org?.name ?? "Your Company";
  const previewTin     = org?.tin  ?? "";

  return (
    <div className="grid grid-cols-[1fr_340px] gap-6 items-start">
      {/* Left – settings form */}
      <Card>
        <SectionHeader
          title="Invoice branding"
          description="Customise how invoices look when you send them to customers."
        />

        <div className="grid grid-cols-2 gap-4">
          <Field label="Invoice Logo" full hint="Upload a logo specific to invoices. Leave blank to use your company logo from the Organization tab.">
            <LogoUploadField
              value={form.invoice_logo_url}
              onChange={(url) => setForm({ ...form, invoice_logo_url: url })}
              orgId={orgId}
            />
          </Field>

          <Field label="Brand Color" hint="Used for invoice headers and amount accents.">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.invoice_color_hex}
                onChange={(e) => setForm({ ...form, invoice_color_hex: e.target.value })}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer shrink-0"
              />
              <input
                className={inputCls}
                value={form.invoice_color_hex}
                onChange={(e) => setForm({ ...form, invoice_color_hex: e.target.value })}
                placeholder="#22C55E"
              />
            </div>
          </Field>
          <div /> {/* spacer */}

          <Field label="Footer Text" full hint="Appears at the bottom of every invoice — add bank details, payment instructions, or a thank-you note.">
            <textarea
              className={`${inputCls} min-h-[90px] resize-y`}
              placeholder="Thank you for your business!&#10;Bank: GCB Bank · Acc: 1234567890 · Branch: Accra Main"
              value={form.invoice_footer_text}
              onChange={(e) => setForm({ ...form, invoice_footer_text: e.target.value })}
            />
          </Field>
        </div>

        <p className="text-xs text-gray-400 mt-4">
          <span className="font-semibold text-gray-500">Tip:</span> Your company name, TIN, and tax types shown in the preview come from the{" "}
          <span className="font-semibold">Organization</span> and <span className="font-semibold">Finance</span> tabs.
        </p>

        <div className="flex justify-end mt-6">
          <SaveButton
            onClick={onSave}
            disabled={!dirty}
            isPending={updateSettings.isPending}
            savedAt={savedAt}
          />
        </div>
      </Card>

      {/* Right – live invoice preview */}
      <div className="sticky top-6">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Live Preview</p>
        <InvoicePreviewSample
          color={form.invoice_color_hex}
          logoUrl={previewLogo}
          footerText={form.invoice_footer_text}
          orgName={previewOrgName}
          orgTin={previewTin}
          taxRates={settings?.tax_rates ?? []}
          defaultTaxRate={settings?.default_tax_rate ?? 0}
        />
      </div>
    </div>
  );
}

// ── Notifications Tab ─────────────────────────────────────────────────────────

function NotificationsTab() {
  const { data: settings, isLoading } = useOrgSettings();
  const updateSettings = useUpdateOrgSettings();

  const [form, setForm] = useState(null);
  const [orig, setOrig] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    if (settings && !form) {
      const init = {
        notify_on_new_bill:         !!settings.notify_on_new_bill,
        notify_on_approval_needed:  !!settings.notify_on_approval_needed,
        notify_on_overdue_invoice:  !!settings.notify_on_overdue_invoice,
      };
      setForm(init);
      setOrig(init);
    }
  }, [settings, form]);

  if (isLoading || !form) {
    return (
      <Card>
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </Card>
    );
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(orig);

  const onSave = () => {
    updateSettings.mutate(form, {
      onSuccess: () => {
        setOrig(form);
        setSavedAt(Date.now());
      },
    });
  };

  const TOGGLES = [
    {
      key:   "notify_on_new_bill",
      title: "New bills",
      desc:  "Email the team when a bill is added to the inbox.",
    },
    {
      key:   "notify_on_approval_needed",
      title: "Approval required",
      desc:  "Notify approvers when an expense or bill needs their decision.",
    },
    {
      key:   "notify_on_overdue_invoice",
      title: "Overdue invoices",
      desc:  "Alert the team when a customer invoice passes its due date.",
    },
  ];

  return (
    <Card>
      <SectionHeader
        title="Notifications"
        description="Choose what your team gets notified about. Affects all members in this organization."
      />

      <div className="space-y-3">
        {TOGGLES.map((t) => (
          <div
            key={t.key}
            className="flex items-center justify-between gap-4 px-4 py-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{t.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
            </div>
            <Toggle
              checked={form[t.key]}
              onChange={(v) => setForm({ ...form, [t.key]: v })}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-6">
        <SaveButton
          onClick={onSave}
          disabled={!dirty}
          isPending={updateSettings.isPending}
          savedAt={savedAt}
        />
      </div>
    </Card>
  );
}

// ── Integrations Tab ──────────────────────────────────────────────────────────

function IntegrationsTab() {
  const { data: integrations = [], isLoading } = useIntegrations();
  const disconnect = useDisconnectIntegration();

  const STATUS_CFG = {
    connected:    { cls: "bg-green-100 text-green-700",  label: "Connected"    },
    disconnected: { cls: "bg-gray-100 text-gray-500",    label: "Disconnected" },
    error:        { cls: "bg-red-100 text-red-700",      label: "Error"        },
  };

  return (
    <Card>
      <SectionHeader
        title="Integrations"
        description="Services you've connected to LedgeSuite. Add or configure new integrations from the Integrations page."
        action={
          <a
            href="/integrations"
            className="flex items-center gap-1.5 text-sm font-medium text-green-600 hover:text-green-700"
          >
            Manage <ExternalLink size={12} />
          </a>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : integrations.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg">
          <Plug size={28} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500 mb-1">No integrations yet</p>
          <a href="/integrations" className="text-xs text-green-600 hover:text-green-700 font-medium">
            Browse integrations →
          </a>
        </div>
      ) : (
        <div className="space-y-2">
          {integrations.map((i) => {
            const cfg = STATUS_CFG[i.status] ?? STATUS_CFG.disconnected;
            const lastSync = i.last_sync_at
              ? new Date(i.last_sync_at).toLocaleDateString("en-GH", { month: "short", day: "numeric", year: "numeric" })
              : "Never";
            return (
              <div
                key={i.id}
                className="flex items-center justify-between gap-4 px-4 py-3 border border-gray-100 rounded-lg"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {i.display_name ?? i.provider}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 capitalize">
                    {i.provider} · Last sync: {lastSync}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cfg.cls}`}>
                    {cfg.label}
                  </span>
                  {i.status === "connected" && (
                    <button
                      onClick={() => {
                        if (confirm(`Disconnect ${i.display_name ?? i.provider}?`)) {
                          disconnect.mutate({ id: i.id });
                        }
                      }}
                      disabled={disconnect.isPending}
                      className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ── Billing Tab ───────────────────────────────────────────────────────────────

const STATUS_CFG = {
  trialing:  { cls: "bg-blue-100 text-blue-700",   label: "Trialing"  },
  active:    { cls: "bg-green-100 text-green-700", label: "Active"    },
  past_due:  { cls: "bg-amber-100 text-amber-700", label: "Past due"  },
  cancelled: { cls: "bg-gray-100 text-gray-500",   label: "Cancelled" },
  paused:    { cls: "bg-gray-100 text-gray-500",   label: "Paused"    },
};

function fmtDateLong(d) {
  return d ? new Date(d).toLocaleDateString("en-GH", { month: "short", day: "numeric", year: "numeric" }) : "—";
}

function planFeatures(plan) {
  return [
    plan.max_members ? `${plan.max_members} ${plan.max_members === 1 ? "user" : "users"}` : "Unlimited users",
    plan.dedicated_accountants > 0
      ? `${plan.dedicated_accountants} dedicated accountant${plan.dedicated_accountants > 1 ? "s" : ""}`
      : null,
    plan.max_transactions_pm ? `${plan.max_transactions_pm.toLocaleString()} transactions / month` : "Unlimited transactions",
    plan.max_cards ? `${plan.max_cards} cards` : "Unlimited cards",
    plan.has_ai_copilot   && "Ledge AI access",
    plan.has_api_access   && "API access",
    plan.has_custom_roles && "Custom roles",
  ].filter(Boolean);
}

// One plan card in the picker
function PlanCard({ plan, isCurrent, isHighlighted, onSubscribe, busy, busyForId, disableReason }) {
  const features = planFeatures(plan);
  const price = (plan.price_monthly_usd_cents ?? 0) / 100;
  const isBusyHere = busy && busyForId === plan.id;

  return (
    <div
      className={`relative bg-white rounded-xl border-2 shadow-sm p-5 flex flex-col ${
        isHighlighted ? "border-green-500" : "border-gray-200"
      }`}
    >
      {isHighlighted && (
        <span className="absolute -top-2.5 left-5 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
          Most popular
        </span>
      )}

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide capitalize">
          {plan.tier}
        </p>
        <p className="text-lg font-bold text-gray-900 mt-0.5">{plan.name}</p>
        <p className="mt-3">
          <span className="text-3xl font-bold tabular-nums text-gray-900">${price.toFixed(0)}</span>
          <span className="text-sm font-normal text-gray-500"> / month</span>
        </p>
      </div>

      <ul className="space-y-2 mt-5 mb-5 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
            <Check size={14} className="text-green-500 shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <button
          disabled
          className="w-full bg-gray-100 text-gray-500 text-sm font-semibold py-2 rounded-lg cursor-default"
        >
          Current plan
        </button>
      ) : (
        <button
          onClick={() => onSubscribe(plan)}
          disabled={busy || !!disableReason}
          title={disableReason ?? undefined}
          className={`w-full text-sm font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isHighlighted
              ? "bg-green-500 hover:bg-green-600 text-white"
              : "border border-gray-200 hover:bg-gray-50 text-gray-800"
          }`}
        >
          {isBusyHere ? "Processing…" : "Subscribe"}
        </button>
      )}
    </div>
  );
}

function BillingTab() {
  const { myRole } = useAuth();
  const { data: org, isLoading: orgLoading }   = useOrganization();
  const { data: plans = [], isLoading: plansLoading } = useSaasPlans();
  const subscribeMut = useSubscribePlan();

  const subscription = org?.org_subscriptions?.[0];
  const currentPlan  = subscription?.saas_plans;
  const statusCfg    = STATUS_CFG[subscription?.status] ?? STATUS_CFG.trialing;

  const isOwner = myRole === "owner";
  const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
  const paystackConfigured = !!paystackKey;

  const [busyPlanId, setBusyPlanId] = useState(null);

  if (orgLoading || plansLoading) {
    return (
      <Card>
        <Skeleton className="h-6 w-40 mb-4" />
        <Skeleton className="h-32 w-full" />
      </Card>
    );
  }

  const handleSubscribe = (plan) => {
    setBusyPlanId(plan.id);
    subscribeMut.mutate(
      { plan },
      {
        onSettled: () => setBusyPlanId(null),
      },
    );
  };

  // Default highlight = Growth (or whichever the user is on)
  const highlightedTier = currentPlan?.tier ?? "growth";

  // Reasons we'd block the subscribe button
  let disableReason = null;
  if (!isOwner) disableReason = "Only the org owner can manage billing";
  else if (!paystackConfigured) disableReason = "Paystack public key is not set in .env";

  return (
    <div className="space-y-6">

      {/* Current plan card */}
      <Card>
        <SectionHeader
          title="Current subscription"
          description={
            currentPlan
              ? "Your active LedgeSuite plan."
              : "You're not on a paid plan yet — pick one below to get started."
          }
          action={
            subscription && (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusCfg.cls}`}>
                {statusCfg.label}
              </span>
            )
          }
        />

        {!currentPlan ? (
          <div className="text-center py-8">
            <CreditCard size={28} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No active subscription</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</p>
              <p className="text-base font-bold text-gray-900 mt-1">{currentPlan.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                ${((currentPlan.price_monthly_usd_cents ?? 0) / 100).toFixed(0)} / month
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Period ends</p>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {fmtDateLong(subscription.current_period_end)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Billing email</p>
              <p className="text-sm font-medium text-gray-900 mt-1 truncate">
                {subscription.billing_email ?? "—"}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Plan picker */}
      <Card>
        <SectionHeader
          title="Choose a plan"
          description="All plans are billed monthly in USD via Paystack. Upgrade or switch any time."
        />

        {plans.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No plans available</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                isCurrent={currentPlan?.id === p.id && subscription?.status === "active"}
                isHighlighted={p.tier === highlightedTier}
                onSubscribe={handleSubscribe}
                busy={subscribeMut.isPending}
                busyForId={busyPlanId}
                disableReason={
                  currentPlan?.id === p.id && subscription?.status === "active"
                    ? null
                    : disableReason
                }
              />
            ))}
          </div>
        )}

        {!isOwner && (
          <p className="text-xs text-gray-400 mt-4">
            Only the org owner can change the billing plan.
          </p>
        )}

        {!paystackConfigured && (
          <div className="mt-4 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Paystack isn't configured</p>
              <p className="text-xs mt-0.5">
                Add <code className="font-mono bg-amber-100 px-1 rounded">VITE_PAYSTACK_PUBLIC_KEY</code> to
                your <code className="font-mono bg-amber-100 px-1 rounded">.env</code> and set{" "}
                <code className="font-mono bg-amber-100 px-1 rounded">PAYSTACK_SECRET_KEY</code> in
                Supabase → Edge Functions → Secrets to enable checkout.
              </p>
            </div>
          </div>
        )}

        {subscribeMut.error && (
          <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Couldn't complete subscription</p>
              <p className="text-xs text-red-600 mt-0.5">{subscribeMut.error.message}</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TAB_CONTENT = {
  profile:       ProfileTab,
  organization:  OrganizationTab,
  team:          TeamTab,
  departments:   DepartmentsTab,
  finance:       FinanceTab,
  invoicing:     InvoicingTab,
  notifications: NotificationsTab,
  integrations:  IntegrationsTab,
  billing:       BillingTab,
};

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const TabComponent = TAB_CONTENT[activeTab];

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account, team, and workspace preferences.</p>
      </div>

      {/* ── Layout: sidebar nav + content ─────────────────────────────────── */}
      <div className="flex gap-6 items-start">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 sticky top-6">
          <nav className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm border-l-[3px] transition-colors ${
                    active
                      ? "bg-green-50 text-green-700 font-semibold border-l-green-500"
                      : "text-gray-600 hover:bg-gray-50 border-l-transparent hover:border-l-gray-200"
                  }`}
                >
                  <Icon size={14} className="shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <TabComponent />
        </div>
      </div>
    </div>
  );
}
