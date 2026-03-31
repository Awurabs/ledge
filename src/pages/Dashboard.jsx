import { useState } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Plus,
  CreditCard,
  ClipboardList,
  Upload,
  FileText,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// ── Spend chart data ──────────────────────────────────────────────────────────
const spendData = [
  { day: 1,  current: 4.2,  last: 3.8 },
  { day: 3,  current: 9.1,  last: 8.4 },
  { day: 5,  current: 15.6, last: 14.2 },
  { day: 7,  current: 22.3, last: 20.1 },
  { day: 9,  current: 31.8, last: 28.7 },
  { day: 11, current: 42.5, last: 38.9 },
  { day: 13, current: 58.4, last: 51.2 },
  { day: 15, current: 74.2, last: 65.8 },
  { day: 17, current: 88.6, last: 79.3 },
  { day: 19, current: 101.4, last: 92.1 },
  { day: 21, current: 118.9, last: 107.4 },
  { day: 23, current: 142.7, last: 128.6 },
  { day: 25, current: 198.3, last: 174.2 },
  { day: 27, current: 241.6, last: 208.9 },
  { day: 28, current: 284.5, last: 253.4 },
];

// ── Recent transactions ───────────────────────────────────────────────────────
const transactions = [
  { date: 'Mar 28', merchant: 'Stripe Inc',        cardholder: 'Kofi Mensah',      category: 'SaaS',       catColor: 'blue',    amount: '$2,400', status: 'Approved', statusColor: 'green'  },
  { date: 'Mar 27', merchant: 'Delta Airlines',    cardholder: 'Ama Darko',        category: 'Travel',     catColor: 'purple',  amount: '$1,890', status: 'Pending',  statusColor: 'amber'  },
  { date: 'Mar 27', merchant: 'WeWork',            cardholder: 'James Osei',       category: 'Facilities', catColor: 'gray',    amount: '$4,200', status: 'Approved', statusColor: 'green'  },
  { date: 'Mar 26', merchant: 'AWS',               cardholder: 'Nana Boateng',     category: 'SaaS',       catColor: 'blue',    amount: '$3,150', status: 'Approved', statusColor: 'green'  },
  { date: 'Mar 26', merchant: 'Uber',              cardholder: 'Efua Asante',      category: 'Transport',  catColor: 'blgray',  amount: '$87',    status: 'Flagged',  statusColor: 'red'    },
  { date: 'Mar 25', merchant: 'Marriott Hotels',   cardholder: 'Kweku Adjei',      category: 'Travel',     catColor: 'purple',  amount: '$2,340', status: 'Pending',  statusColor: 'amber'  },
  { date: 'Mar 25', merchant: 'Google Workspace',  cardholder: 'Adwoa Frimpong',   category: 'SaaS',       catColor: 'blue',    amount: '$1,200', status: 'Approved', statusColor: 'green'  },
  { date: 'Mar 24', merchant: 'Office Depot',      cardholder: 'Yaw Amponsah',     category: 'Office',     catColor: 'gray',    amount: '$430',   status: 'Approved', statusColor: 'green'  },
];

// ── Approval queue ────────────────────────────────────────────────────────────
const initialApprovals = [
  { id: 1, name: 'Ama Darko',      merchant: 'Delta Airlines', amount: '$1,890' },
  { id: 2, name: 'Kweku Adjei',    merchant: 'Marriott Hotels', amount: '$2,340' },
  { id: 3, name: 'Samuel Ofori',   merchant: 'Bolt',           amount: '$760'   },
  { id: 4, name: 'Priscilla Owusu',merchant: 'Zoom',           amount: '$3,100' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const catPill = {
  blue:   'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  gray:   'bg-gray-100 text-gray-600',
  blgray: 'bg-slate-100 text-slate-600',
};

const statusPill = {
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  red:   'bg-red-100 text-red-700',
};

function KpiCard({ title, value, deltaLabel, deltaPositive, deltaValue, subtitle, valueColor }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 flex flex-col gap-2">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className={`text-3xl font-bold tabular-nums ${valueColor ?? 'text-gray-900'}`}>{value}</p>
      <div className="flex items-center gap-1.5">
        {deltaPositive !== null && (
          deltaPositive
            ? <ArrowUpRight size={14} className="text-green-500 shrink-0" />
            : <ArrowDownRight size={14} className="text-red-500 shrink-0" />
        )}
        <span className={`text-xs font-semibold ${deltaPositive ? 'text-green-600' : 'text-red-600'}`}>{deltaValue}</span>
        <span className="text-xs text-gray-400">{deltaLabel}</span>
      </div>
      <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
    </div>
  );
}

export default function Dashboard() {
  const [approvals, setApprovals] = useState(initialApprovals);

  const handleApprove = (id) => setApprovals((prev) => prev.filter((a) => a.id !== id));
  const handleDecline = (id) => setApprovals((prev) => prev.filter((a) => a.id !== id));

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-6 font-sans">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">March 2026</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
            <Download size={15} />
            Export
          </button>
          <button className="flex items-center gap-2 rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-600 transition-colors">
            <Plus size={15} />
            New Transaction
          </button>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="Total Spend MTD"
          value="$284,510"
          deltaPositive={true}
          deltaValue="+12.4%"
          deltaLabel="vs last month"
          subtitle="All card spend combined"
        />
        <KpiCard
          title="Pending Approvals"
          value={<span className="text-amber-500">4</span>}
          deltaPositive={false}
          deltaValue="−2"
          deltaLabel="vs yesterday"
          subtitle="Awaiting your action"
          valueColor="text-amber-500"
        />
        <KpiCard
          title="Open Bills"
          value="$47,230"
          deltaPositive={false}
          deltaValue={<span className="text-red-600 font-semibold">3 overdue</span>}
          deltaLabel=""
          subtitle="Total outstanding payables"
          valueColor="text-gray-900"
        />
        <KpiCard
          title="Cash Runway"
          value="14.2 mo"
          deltaPositive={true}
          deltaValue="+0.3 mo"
          deltaLabel="vs last month"
          subtitle="Based on current burn rate"
          valueColor="text-green-600"
        />
      </div>

      {/* ── Two-column layout ── */}
      <div className="flex gap-4 items-start">

        {/* Left 2/3 */}
        <div className="flex flex-col gap-4" style={{ flex: '2 1 0%' }}>

          {/* Spend Overview chart */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Spend Overview</h2>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={spendData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  tickFormatter={(v) => `${v}`}
                  label={{ value: 'Day', position: 'insideBottomRight', offset: -4, fontSize: 11, fill: '#9CA3AF' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  tickFormatter={(v) => `$${v}K`}
                  width={48}
                />
                <Tooltip
                  formatter={(value, name) => [`$${value}K`, name === 'current' ? 'This Month' : 'Last Month']}
                  labelFormatter={(label) => `Day ${label}`}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: 12 }}
                />
                <Legend
                  formatter={(value) => value === 'current' ? 'This Month' : 'Last Month'}
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="current"
                  name="current"
                  stroke="#22C55E"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: '#22C55E' }}
                />
                <Line
                  type="monotone"
                  dataKey="last"
                  name="last"
                  stroke="#9CA3AF"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 3"
                  activeDot={{ r: 4, fill: '#9CA3AF' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Transactions table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Transactions</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-3 py-2.5 rounded-l-md">Date</th>
                    <th className="text-left px-3 py-2.5">Merchant</th>
                    <th className="text-left px-3 py-2.5">Cardholder</th>
                    <th className="text-left px-3 py-2.5">Category</th>
                    <th className="text-right px-3 py-2.5 tabular-nums">Amount</th>
                    <th className="text-left px-3 py-2.5 rounded-r-md">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, i) => (
                    <tr
                      key={i}
                      className={`border-t border-gray-100 ${i % 2 === 1 ? 'bg-gray-50/50' : ''} hover:bg-gray-50 transition-colors`}
                    >
                      <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{tx.date}</td>
                      <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{tx.merchant}</td>
                      <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{tx.cardholder}</td>
                      <td className="px-3 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${catPill[tx.catColor]}`}>
                          {tx.category}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-gray-900">{tx.amount}</td>
                      <td className="px-3 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusPill[tx.statusColor]}`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1/3 */}
        <div className="flex flex-col gap-4" style={{ flex: '1 1 0%' }}>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'New Card',         icon: <CreditCard size={18} /> },
                { label: 'Request Approval', icon: <ClipboardList size={18} /> },
                { label: 'Upload Receipt',   icon: <Upload size={18} /> },
                { label: 'Export Report',    icon: <FileText size={18} /> },
              ].map(({ label, icon }) => (
                <button
                  key={label}
                  className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-4 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                >
                  <span className="text-gray-500">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Approval Queue */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Approval Queue</h2>
              <span className="rounded-full bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5">
                {approvals.length}
              </span>
            </div>

            {approvals.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-gray-400 gap-2">
                <CheckCircle size={28} className="text-green-400" />
                <p className="text-sm">All caught up!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {approvals.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.name}</p>
                      <p className="text-xs text-gray-500 truncate">{a.merchant} · <span className="tabular-nums font-semibold text-gray-700">{a.amount}</span></p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleApprove(a.id)}
                        className="rounded px-2 py-1 text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors flex items-center gap-1"
                      >
                        <CheckCircle size={11} /> Approve
                      </button>
                      <button
                        onClick={() => handleDecline(a.id)}
                        className="rounded px-2 py-1 text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-colors flex items-center gap-1"
                      >
                        <XCircle size={11} /> Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
