import { useState } from 'react';
import {
  Plus,
  CreditCard,
  X,
  Snowflake,
  Eye,
  AlertTriangle,
  Sliders,
  Trash2,
} from 'lucide-react';

// ── Virtual cards data ────────────────────────────────────────────────────────
const virtualCards = [
  {
    id: 'vc-1',
    name: 'Kofi Mensah',
    lastFour: '4821',
    expiry: '09/27',
    spent: 8240,
    limit: 15000,
    type: 'virtual',
    recentTx: [
      { date: 'Mar 28', merchant: 'Stripe Inc',       amount: '$2,400' },
      { date: 'Mar 26', merchant: 'AWS',               amount: '$3,150' },
      { date: 'Mar 24', merchant: 'Figma',             amount: '$840'   },
      { date: 'Mar 21', merchant: 'Linear',            amount: '$420'   },
      { date: 'Mar 18', merchant: 'Notion',            amount: '$96'    },
    ],
  },
  {
    id: 'vc-2',
    name: 'Ama Darko',
    lastFour: '7392',
    expiry: '03/28',
    spent: 3890,
    limit: 10000,
    type: 'virtual',
    recentTx: [
      { date: 'Mar 27', merchant: 'Delta Airlines',   amount: '$1,890' },
      { date: 'Mar 25', merchant: 'Marriott Hotels',  amount: '$1,200' },
      { date: 'Mar 20', merchant: 'Uber',             amount: '$54'    },
      { date: 'Mar 17', merchant: 'Bolt',             amount: '$38'    },
      { date: 'Mar 14', merchant: 'Lyft',             amount: '$29'    },
    ],
  },
  {
    id: 'vc-3',
    name: 'James Osei',
    lastFour: '2947',
    expiry: '11/26',
    spent: 12100,
    limit: 12000,
    overLimit: true,
    type: 'virtual',
    recentTx: [
      { date: 'Mar 27', merchant: 'WeWork',           amount: '$4,200' },
      { date: 'Mar 22', merchant: 'Regus',            amount: '$3,800' },
      { date: 'Mar 18', merchant: 'WeWork',           amount: '$2,100' },
      { date: 'Mar 12', merchant: 'Industrious',      amount: '$1,600' },
      { date: 'Mar 08', merchant: 'Workspace One',    amount: '$400'   },
    ],
  },
];

// ── Physical cards data ───────────────────────────────────────────────────────
const physicalCards = [
  { id: 'pc-1', name: 'Nana Boateng',   lastFour: '6234', status: 'Active',  limit: 20000, spent: 14230, type: 'physical',
    recentTx: [
      { date: 'Mar 26', merchant: 'AWS',            amount: '$3,150' },
      { date: 'Mar 23', merchant: 'Salesforce',     amount: '$4,800' },
      { date: 'Mar 20', merchant: 'HubSpot',        amount: '$2,100' },
      { date: 'Mar 16', merchant: 'Zoom',           amount: '$420'   },
      { date: 'Mar 12', merchant: 'Slack',          amount: '$340'   },
    ],
  },
  { id: 'pc-2', name: 'Efua Asante',    lastFour: '8821', status: 'Active',  limit: 8000,  spent: 2140,  type: 'physical',
    recentTx: [
      { date: 'Mar 26', merchant: 'Uber',           amount: '$87'    },
      { date: 'Mar 24', merchant: 'Lyft',           amount: '$45'    },
      { date: 'Mar 21', merchant: 'Bolt',           amount: '$62'    },
      { date: 'Mar 18', merchant: 'Grab',           amount: '$38'    },
      { date: 'Mar 15', merchant: 'Taxi',           amount: '$24'    },
    ],
  },
  { id: 'pc-3', name: 'Kweku Adjei',    lastFour: '3398', status: 'Frozen',  limit: 15000, spent: 0,     type: 'physical',
    recentTx: [
      { date: 'Mar 10', merchant: 'Marriott Hotels',amount: '$2,340' },
      { date: 'Mar 08', merchant: 'Delta Airlines', amount: '$1,890' },
      { date: 'Mar 05', merchant: 'Hilton',         amount: '$980'   },
      { date: 'Mar 02', merchant: 'United Airlines',amount: '$760'   },
      { date: 'Feb 28', merchant: 'Enterprise',     amount: '$430'   },
    ],
  },
  { id: 'pc-4', name: 'Adwoa Frimpong', lastFour: '5512', status: 'Active',  limit: 10000, spent: 6730,  type: 'physical',
    recentTx: [
      { date: 'Mar 25', merchant: 'Google Workspace',amount: '$1,200' },
      { date: 'Mar 22', merchant: 'Canva',           amount: '$540'   },
      { date: 'Mar 19', merchant: 'Adobe',           amount: '$860'   },
      { date: 'Mar 15', merchant: 'Miro',            amount: '$480'   },
      { date: 'Mar 11', merchant: 'Loom',            amount: '$220'   },
    ],
  },
  { id: 'pc-5', name: 'Yaw Amponsah',   lastFour: '9043', status: 'Active',  limit: 5000,  spent: 890,   type: 'physical',
    recentTx: [
      { date: 'Mar 24', merchant: 'Office Depot',   amount: '$430'   },
      { date: 'Mar 20', merchant: 'Staples',        amount: '$180'   },
      { date: 'Mar 16', merchant: 'Amazon',         amount: '$145'   },
      { date: 'Mar 11', merchant: 'IKEA',           amount: '$95'    },
      { date: 'Mar 07', merchant: 'Best Buy',       amount: '$40'    },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n) {
  return '$' + n.toLocaleString();
}

function SpendBar({ spent, limit, overLimit }) {
  const pct = Math.min((spent / limit) * 100, 100);
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-gray-300 mb-1.5 tabular-nums">
        <span>Spent {fmt(spent)}</span>
        <span>of {fmt(limit)} limit</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/20">
        <div
          className={`h-1.5 rounded-full transition-all ${overLimit ? 'bg-red-400' : 'bg-green-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {overLimit && (
        <p className="mt-1 text-xs text-red-300 flex items-center gap-1">
          <AlertTriangle size={10} /> Over limit
        </p>
      )}
    </div>
  );
}

function VirtualCardTile({ card, onSelect }) {
  return (
    <div
      className="cursor-pointer group"
      onClick={() => onSelect(card)}
    >
      {/* Card face */}
      <div className="relative rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 p-5 text-white shadow-lg group-hover:shadow-xl transition-shadow">
        {/* Top row */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-base font-bold tracking-widest text-white">Ledge</span>
          <CreditCard size={22} className="text-amber-400" />
        </div>
        {/* Cardholder name */}
        <p className="text-lg font-semibold tracking-wide mb-5">{card.name}</p>
        {/* Bottom row */}
        <div className="flex items-end justify-between">
          <span className="text-sm font-mono tracking-widest text-gray-300">
            •••• •••• •••• {card.lastFour}
          </span>
          <span className="text-xs text-gray-400">{card.expiry}</span>
        </div>
        <SpendBar spent={card.spent} limit={card.limit} overLimit={card.overLimit} />
      </div>
    </div>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────────
function CardDrawer({ card, onClose }) {
  if (!card) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-30"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-xl z-40 flex flex-col overflow-y-auto">
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {card.type === 'virtual' ? 'Virtual Card' : 'Physical Card'}
            </p>
            <h3 className="text-lg font-bold text-gray-900 mt-0.5">{card.name}</h3>
            <p className="text-sm text-gray-500 tabular-nums font-mono">•••• •••• •••• {card.lastFour}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-gray-100 transition-colors text-gray-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Spend summary */}
        {card.limit && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">Spent MTD</span>
              <span className="tabular-nums font-semibold text-gray-900">{fmt(card.spent)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">Limit</span>
              <span className="tabular-nums font-semibold text-gray-900">{fmt(card.limit)}</span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 mt-2">
              <div
                className={`h-2 rounded-full ${(card.spent / card.limit) > 1 ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min((card.spent / card.limit) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Recent transactions */}
        <div className="px-6 py-5 border-b border-gray-200 flex-1">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Transactions</h4>
          <div className="flex flex-col gap-2">
            {card.recentTx.map((tx, i) => (
              <div key={i} className="flex items-center justify-between py-1.5">
                <div>
                  <p className="text-sm font-medium text-gray-900">{tx.merchant}</p>
                  <p className="text-xs text-gray-400">{tx.date}</p>
                </div>
                <span className="tabular-nums text-sm font-semibold text-gray-800">{tx.amount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-6 py-5 flex flex-col gap-2">
          <button className="flex items-center gap-2 w-full justify-center rounded-md border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Snowflake size={15} className="text-blue-400" />
            {card.status === 'Frozen' ? 'Unfreeze Card' : 'Freeze Card'}
          </button>
          <button className="flex items-center gap-2 w-full justify-center rounded-md border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Sliders size={15} className="text-gray-500" />
            Adjust Limit
          </button>
          <button className="flex items-center gap-2 w-full justify-center rounded-md border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors">
            <Trash2 size={15} />
            Cancel Card
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Cards() {
  const [selectedCard, setSelectedCard] = useState(null);

  const allCards = [...virtualCards, ...physicalCards];

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-6 font-sans">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cards</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage virtual and physical cards</p>
        </div>
        <button className="flex items-center gap-2 rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-600 transition-colors">
          <Plus size={15} />
          Issue New Card
        </button>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Cards',     value: '12',        sub: 'across all cardholders' },
          { label: 'Total Spend MTD',  value: '$284,510',  sub: 'all cards combined',    mono: true },
          { label: 'Avg Transaction',  value: '$847',      sub: 'per transaction',        mono: true },
          { label: 'Flagged',          value: '2',         sub: 'require review',         warn: true },
        ].map(({ label, value, sub, mono, warn }) => (
          <div key={label} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-2xl font-bold ${warn ? 'text-red-500' : 'text-gray-900'} ${mono ? 'tabular-nums' : ''}`}>
              {value}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Virtual Cards ── */}
      <section className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Virtual Cards</h2>
        <div className="grid grid-cols-3 gap-5">
          {virtualCards.map((card) => (
            <VirtualCardTile key={card.id} card={card} onSelect={setSelectedCard} />
          ))}
        </div>
      </section>

      {/* ── Physical Cards ── */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Physical Cards</h2>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-200">
                <th className="text-left px-4 py-3">Cardholder</th>
                <th className="text-left px-4 py-3">Last 4</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3 tabular-nums">Limit</th>
                <th className="text-right px-4 py-3 tabular-nums">Spent MTD</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {physicalCards.map((card, i) => (
                <tr
                  key={card.id}
                  className={`border-t border-gray-100 ${i % 2 === 1 ? 'bg-gray-50/50' : ''} hover:bg-gray-50 transition-colors`}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{card.name}</td>
                  <td className="px-4 py-3 font-mono text-gray-500 tabular-nums">•••• {card.lastFour}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        card.status === 'Active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {card.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700 tabular-nums">{fmt(card.limit)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-900">{fmt(card.spent)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        className="flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                        onClick={() => setSelectedCard(card)}
                      >
                        <Snowflake size={11} className="text-blue-400" />
                        {card.status === 'Frozen' ? 'Unfreeze' : 'Freeze'}
                      </button>
                      <button
                        className="flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                        onClick={() => setSelectedCard(card)}
                      >
                        <Eye size={11} />
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Slide-in drawer ── */}
      <CardDrawer card={selectedCard} onClose={() => setSelectedCard(null)} />
    </div>
  );
}
