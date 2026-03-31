import { useState } from "react";
import { Upload, FileText, X, CheckCircle, Clock, XCircle, Eye } from "lucide-react";

const submissions = [
  { id: 1, employee: "Ama Darko", initials: "AD", color: "bg-purple-100 text-purple-700", description: "Team dinner – client meeting", amount: 890, date: "Mar 28, 2026", receipt: "receipt.jpg", status: "Pending" },
  { id: 2, employee: "Kofi Mensah", initials: "KM", color: "bg-blue-100 text-blue-700", description: "Conference registration fee", amount: 1200, date: "Mar 27, 2026", receipt: "receipt.pdf", status: "Approved" },
  { id: 3, employee: "James Osei", initials: "JO", color: "bg-green-100 text-green-700", description: "Fuel reimbursement", amount: 280, date: "Mar 27, 2026", receipt: "receipt.jpg", status: "Pending" },
  { id: 4, employee: "Nana Boateng", initials: "NB", color: "bg-orange-100 text-orange-700", description: "Hotel – client visit Kumasi", amount: 680, date: "Mar 26, 2026", receipt: "receipt.jpg", status: "Approved" },
  { id: 5, employee: "Efua Asante", initials: "EA", color: "bg-red-100 text-red-700", description: "Stationery supplies", amount: 145, date: "Mar 25, 2026", receipt: null, status: "Pending" },
  { id: 6, employee: "Kweku Adjei", initials: "KA", color: "bg-indigo-100 text-indigo-700", description: "Flight Accra-Lagos", amount: 2100, date: "Mar 24, 2026", receipt: "receipt.pdf", status: "Under Review" },
  { id: 7, employee: "Adwoa Frimpong", initials: "AF", color: "bg-pink-100 text-pink-700", description: "Uber – client meetings", amount: 340, date: "Mar 24, 2026", receipt: "receipt.jpg", status: "Approved" },
  { id: 8, employee: "Yaw Amponsah", initials: "YA", color: "bg-yellow-100 text-yellow-700", description: "Office printer cartridges", amount: 210, date: "Mar 23, 2026", receipt: "receipt.jpg", status: "Approved" },
  { id: 9, employee: "Samuel Ofori", initials: "SO", color: "bg-teal-100 text-teal-700", description: "Team lunch", amount: 460, date: "Mar 22, 2026", receipt: "receipt.jpg", status: "Pending" },
  { id: 10, employee: "Priscilla Owusu", initials: "PO", color: "bg-cyan-100 text-cyan-700", description: "Marketing event supplies", amount: 780, date: "Mar 22, 2026", receipt: "receipt.pdf", status: "Pending" },
  { id: 11, employee: "Ama Darko", initials: "AD", color: "bg-purple-100 text-purple-700", description: "Training course – online", amount: 350, date: "Mar 20, 2026", receipt: "receipt.pdf", status: "Approved" },
  { id: 12, employee: "Kofi Mensah", initials: "KM", color: "bg-blue-100 text-blue-700", description: "Taxi – airport pickup", amount: 85, date: "Mar 19, 2026", receipt: null, status: "Declined" },
  { id: 13, employee: "James Osei", initials: "JO", color: "bg-green-100 text-green-700", description: "Software subscription", amount: 120, date: "Mar 18, 2026", receipt: "receipt.jpg", status: "Approved" },
  { id: 14, employee: "Nana Boateng", initials: "NB", color: "bg-orange-100 text-orange-700", description: "Team drinks", amount: 220, date: "Mar 17, 2026", receipt: "receipt.jpg", status: "Approved" },
  { id: 15, employee: "Efua Asante", initials: "EA", color: "bg-red-100 text-red-700", description: "Work from home equipment", amount: 490, date: "Mar 15, 2026", receipt: "receipt.pdf", status: "Approved" },
];

function StatusBadge({ status }) {
  const map = {
    Pending: "bg-amber-100 text-amber-700",
    Approved: "bg-green-100 text-green-700",
    Declined: "bg-red-100 text-red-700",
    "Under Review": "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

export default function Reimbursements() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ category: "Travel", description: "", amount: "", date: "", notes: "" });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Reimbursements</h2>
          <p className="text-sm text-gray-500 mt-0.5">Track and manage employee expense submissions</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-green-500 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-green-600 flex items-center gap-2">
          <Upload size={15} />
          Submit Expense
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Pending Review", value: "$8,420", sub: "6 submissions", color: "text-amber-600" },
          { label: "Approved This Month", value: "$24,300", sub: "22 submissions", color: "text-green-600" },
          { label: "Avg Processing Time", value: "2.4 days", sub: "vs 3.1 days last month", color: "text-blue-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold tabular-nums mt-1 ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Employee Expense Submissions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date Submitted</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Receipt</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((row, i) => (
                <tr key={row.id} className={`border-b border-gray-100 hover:bg-gray-50 ${i % 2 === 1 ? "bg-gray-50/50" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${row.color}`}>
                        {row.initials}
                      </div>
                      <span className="font-medium text-gray-900">{row.employee}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{row.description}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-900">${row.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500">{row.date}</td>
                  <td className="px-4 py-3">
                    {row.receipt ? (
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <div className="w-6 h-7 bg-gray-100 rounded flex items-center justify-center">
                          <FileText size={12} className="text-gray-500" />
                        </div>
                        <span className="text-xs">{row.receipt}</span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Missing</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  <td className="px-4 py-3">
                    {row.status === "Pending" && !row.receipt ? (
                      <button className="text-xs text-amber-600 hover:text-amber-700 font-medium">Request Receipt</button>
                    ) : row.status === "Pending" ? (
                      <div className="flex gap-2">
                        <button className="text-xs text-green-600 hover:text-green-700 font-medium">Approve</button>
                        <button className="text-xs text-red-500 hover:text-red-600 font-medium">Decline</button>
                      </div>
                    ) : (
                      <button className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
                        <Eye size={12} /> View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">Submit Expense</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500">
                  {["Travel", "Meals", "Office", "Transport", "Training", "Other"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="What was this expense for?" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                  <input value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} type="number" placeholder="0.00" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 tabular-nums" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input value={form.date} onChange={e => setForm({...form, date: e.target.value})} type="date" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Receipt</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 cursor-pointer transition-colors">
                  <Upload size={20} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Drop file here or <span className="text-green-600 font-medium">browse</span></p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF up to 10MB</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2} placeholder="Any additional context..." className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 bg-white text-gray-700 border border-gray-300 rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={() => setShowModal(false)} className="flex-1 bg-green-500 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-green-600">Submit for Approval</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
