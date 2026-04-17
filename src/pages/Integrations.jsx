import { useState } from "react";
import { RefreshCw, ExternalLink, Zap } from "lucide-react";
import { useIntegrations, useDisconnectIntegration } from "../hooks/useIntegrations";

// ── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

// ── Static catalog of known integrations ──────────────────────────────────────
const INTEGRATION_CATALOG = [
  {
    category: "Accounting",
    items: [
      { provider: "quickbooks",         name: "QuickBooks",        letter: "Q", color: "bg-green-600"   },
      { provider: "xero",               name: "Xero",              letter: "X", color: "bg-blue-600"    },
      { provider: "sage",               name: "Sage Accounting",   letter: "S", color: "bg-emerald-700" },
      { provider: "freshbooks",         name: "FreshBooks",        letter: "F", color: "bg-teal-600"    },
      { provider: "zoho_books",         name: "Zoho Books",        letter: "Z", color: "bg-orange-600"  },
      { provider: "wave",               name: "Wave Accounting",   letter: "W", color: "bg-blue-500"    },
    ],
  },
  {
    category: "Banking",
    items: [
      { provider: "ecobank",            name: "Ecobank Ghana",       letter: "E", color: "bg-blue-700"   },
      { provider: "gcb",                name: "GCB Bank",            letter: "G", color: "bg-green-700"  },
      { provider: "stanbic",            name: "Stanbic Bank",        letter: "S", color: "bg-sky-700"    },
      { provider: "standard_chartered", name: "Standard Chartered",  letter: "S", color: "bg-teal-700"   },
      { provider: "fidelity",           name: "Fidelity Bank",       letter: "F", color: "bg-purple-700" },
      { provider: "zenith",             name: "Zenith Bank",         letter: "Z", color: "bg-red-700"    },
    ],
  },
  {
    category: "Productivity",
    items: [
      { provider: "slack",              name: "Slack",           letter: "S", color: "bg-purple-600" },
      { provider: "microsoft_teams",    name: "Microsoft Teams", letter: "T", color: "bg-indigo-600" },
      { provider: "gmail",              name: "Gmail",           letter: "G", color: "bg-red-500"    },
      { provider: "outlook",            name: "Outlook",         letter: "O", color: "bg-blue-500"   },
      { provider: "google_drive",       name: "Google Drive",    letter: "D", color: "bg-yellow-500" },
      { provider: "dropbox",            name: "Dropbox",         letter: "D", color: "bg-blue-600"   },
    ],
  },
];

const STATIC_WEBHOOKS = [
  { endpoint: "https://api.company.com/webhooks/***", event: "transaction.created", lastTriggered: "2 min ago",   active: true  },
  { endpoint: "https://hooks.company.com/approval/***", event: "approval.required", lastTriggered: "18 min ago",  active: true  },
  { endpoint: "https://api.company.com/webhooks/***", event: "bill.overdue",        lastTriggered: "3 hours ago", active: false },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeSince(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min${mins !== 1 ? "s" : ""} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? "s" : ""} ago`;
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) !== 1 ? "s" : ""} ago`;
}

// ── Integration Card ───────────────────────────────────────────────────────────
function IntegrationCard({ item, dbRecord, onDisconnect, isBusy }) {
  const connected  = dbRecord?.status === "connected";
  const latestSync = dbRecord?.integration_sync_logs?.[0];
  const lastSync   = latestSync ? timeSince(latestSync.completed_at) : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-11 h-11 rounded-lg ${item.color} flex items-center justify-center text-white font-bold text-lg`}>
          {item.letter}
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {connected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs text-green-600 font-medium">Connected</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-gray-300" />
                <span className="text-xs text-gray-400">Not connected</span>
              </>
            )}
          </div>
        </div>
      </div>

      {connected && lastSync && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          <RefreshCw size={11} />
          <span>Last synced: {lastSync}</span>
        </div>
      )}

      {connected ? (
        <button
          onClick={() => dbRecord && onDisconnect(dbRecord.id)}
          disabled={isBusy}
          className="w-full bg-white text-gray-700 border border-gray-300 rounded-md py-1.5 text-xs font-medium hover:bg-gray-50 flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <ExternalLink size={11} /> Manage
        </button>
      ) : (
        <button className="w-full bg-green-500 text-white rounded-md py-1.5 text-xs font-medium hover:bg-green-600">
          Connect
        </button>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Integrations() {
  const { data: integrations = [], isLoading } = useIntegrations();
  const disconnectMut = useDisconnectIntegration();
  const [webhookToggles, setWebhookToggles] = useState(STATIC_WEBHOOKS.map(w => w.active));

  // provider → db record map
  const integrationMap = integrations.reduce((acc, i) => {
    acc[i.provider] = i;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Connect your tools to Ledge for automated sync and real-time data flow
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-8 mb-8">
          {[...Array(3)].map((_, i) => (
            <div key={i}>
              <Skeleton className="h-4 w-24 mb-4" />
              <div className="grid grid-cols-3 gap-4">
                {[...Array(6)].map((_, j) => <Skeleton key={j} className="h-32 rounded-xl" />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        INTEGRATION_CATALOG.map(section => (
          <div key={section.category} className="mb-8">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
              {section.category}
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {section.items.map(item => (
                <IntegrationCard
                  key={item.provider}
                  item={item}
                  dbRecord={integrationMap[item.provider]}
                  onDisconnect={(id) => disconnectMut.mutate({ id })}
                  isBusy={disconnectMut.isPending}
                />
              ))}
            </div>
          </div>
        ))
      )}

      {/* Webhooks */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900">Active Webhooks</h3>
          </div>
          <button className="text-xs text-green-600 font-medium hover:text-green-700">
            + Add Webhook
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Endpoint", "Event", "Last Triggered", "Status"].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STATIC_WEBHOOKS.map((wh, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono text-xs text-gray-600">{wh.endpoint}</td>
                  <td className="px-6 py-3">
                    <span className="bg-purple-50 text-purple-700 text-xs font-medium px-2 py-0.5 rounded">
                      {wh.event}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-500 text-xs">{wh.lastTriggered}</td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => setWebhookToggles(prev => prev.map((v, idx) => idx === i ? !v : v))}
                      className={`relative inline-flex w-9 h-5 rounded-full transition-colors ${
                        webhookToggles[i] ? "bg-green-500" : "bg-gray-300"
                      }`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        webhookToggles[i] ? "translate-x-4" : "translate-x-0.5"
                      }`} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
