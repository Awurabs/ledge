import { useState } from "react";
import { CheckCircle, Circle, RefreshCw, ExternalLink, Zap } from "lucide-react";

const sections = [
  {
    title: "Accounting",
    items: [
      { name: "QuickBooks", letter: "Q", color: "bg-green-600", connected: true, lastSync: "2 hours ago" },
      { name: "Xero", letter: "X", color: "bg-blue-600", connected: true, lastSync: "1 hour ago" },
      { name: "Sage Accounting", letter: "S", color: "bg-emerald-700", connected: false },
      { name: "FreshBooks", letter: "F", color: "bg-teal-600", connected: false },
      { name: "Zoho Books", letter: "Z", color: "bg-orange-600", connected: false },
      { name: "Wave Accounting", letter: "W", color: "bg-blue-500", connected: false },
    ],
  },
  {
    title: "Banking",
    items: [
      { name: "Ecobank Ghana", letter: "E", color: "bg-blue-700", connected: true, lastSync: "15 minutes ago" },
      { name: "GCB Bank", letter: "G", color: "bg-green-700", connected: true, lastSync: "30 minutes ago" },
      { name: "Stanbic Bank", letter: "S", color: "bg-sky-700", connected: false },
      { name: "Standard Chartered", letter: "S", color: "bg-teal-700", connected: false },
      { name: "Fidelity Bank", letter: "F", color: "bg-purple-700", connected: false },
      { name: "Zenith Bank", letter: "Z", color: "bg-red-700", connected: false },
    ],
  },
  {
    title: "Productivity",
    items: [
      { name: "Slack", letter: "S", color: "bg-purple-600", connected: true, lastSync: "5 minutes ago" },
      { name: "Microsoft Teams", letter: "T", color: "bg-indigo-600", connected: false },
      { name: "Gmail", letter: "G", color: "bg-red-500", connected: true, lastSync: "3 minutes ago" },
      { name: "Outlook", letter: "O", color: "bg-blue-500", connected: false },
      { name: "Google Drive", letter: "D", color: "bg-yellow-500", connected: true, lastSync: "1 hour ago" },
      { name: "Dropbox", letter: "D", color: "bg-blue-600", connected: false },
    ],
  },
];

const webhooks = [
  { endpoint: "https://api.acmefinance.com/webhooks/***", event: "transaction.created", lastTriggered: "2 min ago", active: true },
  { endpoint: "https://hooks.acmefinance.com/approval/***", event: "approval.required", lastTriggered: "18 min ago", active: true },
  { endpoint: "https://api.acmefinance.com/webhooks/***", event: "bill.overdue", lastTriggered: "3 hours ago", active: false },
];

function IntegrationCard({ item }) {
  const [connected, setConnected] = useState(item.connected);
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
              <><span className="w-2 h-2 rounded-full bg-green-500" /><span className="text-xs text-green-600 font-medium">Connected</span></>
            ) : (
              <><span className="w-2 h-2 rounded-full bg-gray-300" /><span className="text-xs text-gray-400">Not connected</span></>
            )}
          </div>
        </div>
      </div>
      {connected && item.lastSync && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          <RefreshCw size={11} />
          <span>Last synced: {item.lastSync}</span>
        </div>
      )}
      {connected ? (
        <button onClick={() => setConnected(false)} className="w-full bg-white text-gray-700 border border-gray-300 rounded-md py-1.5 text-xs font-medium hover:bg-gray-50 flex items-center justify-center gap-1.5">
          <ExternalLink size={11} /> Manage
        </button>
      ) : (
        <button onClick={() => setConnected(true)} className="w-full bg-green-500 text-white rounded-md py-1.5 text-xs font-medium hover:bg-green-600">
          Connect
        </button>
      )}
    </div>
  );
}

export default function Integrations() {
  const [webhookToggles, setWebhookToggles] = useState(webhooks.map(w => w.active));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Integrations</h2>
        <p className="text-sm text-gray-500 mt-0.5">Connect your tools to Ledge for automated sync and real-time data flow</p>
      </div>

      {sections.map(section => (
        <div key={section.title} className="mb-8">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">{section.title}</h3>
          <div className="grid grid-cols-3 gap-4">
            {section.items.map(item => (
              <IntegrationCard key={item.name} item={item} />
            ))}
          </div>
        </div>
      ))}

      {/* Webhooks */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900">Active Webhooks</h3>
          </div>
          <button className="text-xs text-green-600 font-medium hover:text-green-700">+ Add Webhook</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Endpoint</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Event</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Triggered</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((wh, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono text-xs text-gray-600">{wh.endpoint}</td>
                  <td className="px-6 py-3">
                    <span className="bg-purple-50 text-purple-700 text-xs font-medium px-2 py-0.5 rounded">{wh.event}</span>
                  </td>
                  <td className="px-6 py-3 text-gray-500 text-xs">{wh.lastTriggered}</td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => setWebhookToggles(prev => prev.map((v, idx) => idx === i ? !v : v))}
                      className={`relative inline-flex w-9 h-5 rounded-full transition-colors ${webhookToggles[i] ? "bg-green-500" : "bg-gray-300"}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${webhookToggles[i] ? "translate-x-4" : "translate-x-0.5"}`} />
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
