import { useState } from "react";
import { Search, X, UserPlus, Mail, Phone, CreditCard, ChevronRight } from "lucide-react";

const employees = [
  { id: 1, name: "Abena Owusu", initials: "AO", color: "bg-green-100 text-green-700", role: "Finance Lead", roleColor: "bg-green-100 text-green-700", dept: "Finance", cards: 2, spend: 28400, manager: "CEO", status: "Active" },
  { id: 2, name: "Kofi Mensah", initials: "KM", color: "bg-blue-100 text-blue-700", role: "Finance Analyst", roleColor: "bg-blue-100 text-blue-700", dept: "Finance", cards: 1, spend: 14230, manager: "Abena Owusu", status: "Active" },
  { id: 3, name: "Ama Darko", initials: "AD", color: "bg-purple-100 text-purple-700", role: "Finance Analyst", roleColor: "bg-blue-100 text-blue-700", dept: "Finance", cards: 1, spend: 8940, manager: "Abena Owusu", status: "Active" },
  { id: 4, name: "James Osei", initials: "JO", color: "bg-orange-100 text-orange-700", role: "Operations Manager", roleColor: "bg-purple-100 text-purple-700", dept: "Operations", cards: 2, spend: 18200, manager: "CEO", status: "Active" },
  { id: 5, name: "Nana Boateng", initials: "NB", color: "bg-teal-100 text-teal-700", role: "Sales Manager", roleColor: "bg-purple-100 text-purple-700", dept: "Sales", cards: 1, spend: 24100, manager: "James Osei", status: "Active" },
  { id: 6, name: "Efua Asante", initials: "EA", color: "bg-red-100 text-red-700", role: "Sales Rep", roleColor: "bg-amber-100 text-amber-700", dept: "Sales", cards: 1, spend: 6780, manager: "Nana Boateng", status: "Active" },
  { id: 7, name: "Kweku Adjei", initials: "KA", color: "bg-indigo-100 text-indigo-700", role: "Sales Rep", roleColor: "bg-amber-100 text-amber-700", dept: "Sales", cards: 1, spend: 12300, manager: "Nana Boateng", status: "Active" },
  { id: 8, name: "Adwoa Frimpong", initials: "AF", color: "bg-pink-100 text-pink-700", role: "Marketing Manager", roleColor: "bg-purple-100 text-purple-700", dept: "Marketing", cards: 2, spend: 19400, manager: "CEO", status: "Active" },
  { id: 9, name: "Yaw Amponsah", initials: "YA", color: "bg-yellow-100 text-yellow-700", role: "Marketing Analyst", roleColor: "bg-blue-100 text-blue-700", dept: "Marketing", cards: 1, spend: 4200, manager: "Adwoa Frimpong", status: "Active" },
  { id: 10, name: "Samuel Ofori", initials: "SO", color: "bg-cyan-100 text-cyan-700", role: "Operations Analyst", roleColor: "bg-blue-100 text-blue-700", dept: "Operations", cards: 1, spend: 7890, manager: "James Osei", status: "Active" },
  { id: 11, name: "Priscilla Owusu", initials: "PO", color: "bg-rose-100 text-rose-700", role: "CFO", roleColor: "bg-red-100 text-red-700", dept: "Finance", cards: 1, spend: 8300, manager: "CEO", status: "Active" },
  { id: 12, name: "Emmanuel Asiedu", initials: "EA", color: "bg-lime-100 text-lime-700", role: "IT Manager", roleColor: "bg-purple-100 text-purple-700", dept: "Technology", cards: 1, spend: 15600, manager: "CEO", status: "Active" },
];

const permissions = [
  "Can approve transactions up to $500",
  "Can approve transactions up to $2,000",
  "Can issue virtual cards",
  "Can view all transactions",
  "Can export data",
];

export default function PeopleTeams() {
  const [selected, setSelected] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [search, setSearch] = useState("");
  const [perms, setPerms] = useState({ 0: true, 1: false, 2: false, 3: true, 4: false });

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.dept.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">People & Teams</h2>
          <p className="text-sm text-gray-500 mt-0.5">Manage employees, roles, and card permissions</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="bg-green-500 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-green-600 flex items-center gap-2">
          <UserPlus size={15} />
          Invite Employee
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Employees", value: "24" },
          { label: "Active Cards", value: "18" },
          { label: "Avg Spend / Employee", value: "$11,855" },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold tabular-nums text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..." className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-green-500 bg-white" />
        </div>
        <select className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-600">
          <option>All Departments</option>
          <option>Finance</option><option>Sales</option><option>Marketing</option><option>Operations</option><option>Technology</option>
        </select>
        <select className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-600">
          <option>All Roles</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ledge Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Department</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cards</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Spend MTD</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Approval Manager</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((emp, i) => (
                <tr key={emp.id} onClick={() => setSelected(emp)} className={`border-b border-gray-100 hover:bg-green-50/30 cursor-pointer transition-colors ${i % 2 === 1 ? "bg-gray-50/50" : ""} ${selected?.id === emp.id ? "bg-green-50/40" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${emp.color}`}>{emp.initials}</div>
                      <span className="font-medium text-gray-900">{emp.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${emp.roleColor}`}>{emp.role}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{emp.dept}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{emp.cards}</td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums text-gray-900">${emp.spend.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{emp.manager}</td>
                  <td className="px-4 py-3">
                    <button onClick={(e) => { e.stopPropagation(); setSelected(emp); }} className="text-xs text-gray-500 hover:text-green-600 flex items-center gap-1">
                      View <ChevronRight size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setSelected(null)} />
          <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold ${selected.color}`}>{selected.initials}</div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{selected.name}</h3>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${selected.roleColor}`}>{selected.role}</span>
                  <p className="text-xs text-gray-500 mt-0.5">{selected.dept}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 mt-1">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail size={14} />{selected.name.toLowerCase().replace(" ", ".")}@acmefinance.com
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone size={14} />+233 20 {Math.floor(Math.random() * 9000000 + 1000000)}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Cards Assigned</p>
                <div className="space-y-2">
                  {[...Array(selected.cards)].map((_, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-md px-3 py-2">
                      <CreditCard size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-700">•••• {Math.floor(Math.random()*9000+1000)}</span>
                      <span className="ml-auto text-xs text-gray-500">Active</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Spend Summary</p>
                <div className="grid grid-cols-3 gap-2">
                  {[{ label: "MTD", value: `$${selected.spend.toLocaleString()}` }, { label: "This Quarter", value: `$${(selected.spend * 2.8).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}` }, { label: "This Year", value: `$${(selected.spend * 10.2).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}` }].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-md p-2.5 text-center">
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className="text-sm font-bold tabular-nums text-gray-900 mt-0.5">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Permissions</p>
                <div className="space-y-2.5">
                  {permissions.map((p, i) => (
                    <label key={i} className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={!!perms[i]} onChange={() => setPerms(prev => ({...prev, [i]: !prev[i]}))} className="w-4 h-4 rounded accent-green-500" />
                      <span className="text-sm text-gray-700">{p}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button className="flex-1 bg-green-500 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-green-600">Edit Permissions</button>
                <button className="flex-1 bg-white text-red-600 border border-red-300 rounded-md px-4 py-2 text-sm font-medium hover:bg-red-50">Suspend Access</button>
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
              <button onClick={() => setShowInvite(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              {[["Full Name", "text", "Jane Doe"], ["Email Address", "email", "jane@acmefinance.com"]].map(([label, type, ph]) => (
                <div key={label}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type} placeholder={ph} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500">
                    <option>Finance Analyst</option><option>Sales Rep</option><option>Marketing Analyst</option><option>Operations Analyst</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500">
                    <option>Finance</option><option>Sales</option><option>Marketing</option><option>Operations</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Approval Manager</label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500">
                  {employees.map(e => <option key={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Card Limit ($)</label>
                <input type="number" placeholder="5000" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 tabular-nums" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowInvite(false)} className="flex-1 bg-white text-gray-700 border border-gray-300 rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={() => setShowInvite(false)} className="flex-1 bg-green-500 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-green-600">Send Invite</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
