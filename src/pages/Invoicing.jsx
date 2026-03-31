import { useState } from "react";
import {
  Plus,
  Send,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  Eye,
  ChevronRight,
} from "lucide-react";

const invoices = [
  { id: "INV-2026-047", company: "Accra Tech Hub", amount: 24500, status: "Sent", date: "Mar 28, 2026" },
  { id: "INV-2026-046", company: "Kofa Systems Ltd", amount: 8900, status: "Overdue", date: "Mar 15, 2026" },
  { id: "INV-2026-045", company: "Ashanti Holdings", amount: 45000, status: "Paid", date: "Mar 10, 2026" },
  { id: "INV-2026-044", company: "Volta River Auth", amount: 12800, status: "Overdue", date: "Mar 5, 2026" },
  { id: "INV-2026-043", company: "Kumasi Ventures", amount: 7200, status: "Sent", date: "Mar 18, 2026" },
  { id: "INV-2026-042", company: "Ghana Telecom Ltd", amount: 31400, status: "Paid", date: "Feb 28, 2026" },
  { id: "INV-2026-041", company: "Takoradi Port Auth", amount: 18600, status: "Paid", date: "Feb 25, 2026" },
  { id: "INV-2026-040", company: "Northern Star Co", amount: 5800, status: "Draft", date: "—" },
  { id: "INV-2026-039", company: "Stanbic Partners", amount: 22000, status: "Paid", date: "Feb 20, 2026" },
  { id: "INV-2026-038", company: "Ecobank Ghana", amount: 9400, status: "Sent", date: "Mar 22, 2026" },
];

const statusConfig = {
  Sent: { bg: "bg-blue-100", text: "text-blue-700" },
  Overdue: { bg: "bg-red-100", text: "text-red-700" },
  Paid: { bg: "bg-green-100", text: "text-green-700" },
  Draft: { bg: "bg-gray-100", text: "text-gray-600" },
};

const fmt = (n) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0 });

const emptyItem = () => ({ description: "", qty: 1, rate: "" });

const defaultForm = {
  clientName: "",
  clientEmail: "",
  invoiceDate: "",
  dueDate: "",
  notes: "",
  paymentTerms: "Net 30",
  taxRate: "10",
  items: [emptyItem()],
};

function StatusPill({ status }) {
  const cfg = statusConfig[status] || { bg: "bg-gray-100", text: "text-gray-600" };
  return (
    <span className={`rounded-full text-xs px-2.5 py-0.5 font-medium ${cfg.bg} ${cfg.text}`}>
      {status}
    </span>
  );
}

function InvoicePreview({ invoice }) {
  const previewItems = [
    { description: "Product / Service", qty: 1, rate: invoice.amount * 0.9, amount: invoice.amount * 0.9 },
  ];
  const subtotal = invoice.amount * 0.9;
  const tax = subtotal * 0.1;
  const total = invoice.amount;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 h-full">
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            L
          </div>
          <span className="text-xl font-bold text-gray-900">Ledge</span>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{invoice.id}</p>
          <p className="text-sm text-gray-500 mt-1">Date: {invoice.date}</p>
          <StatusPill status={invoice.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">From</p>
          <p className="font-semibold text-gray-900">Ledge Financial Inc.</p>
          <p className="text-sm text-gray-500">123 Finance Street</p>
          <p className="text-sm text-gray-500">Accra, Ghana</p>
          <p className="text-sm text-gray-500">billing@ledge.finance</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">To</p>
          <p className="font-semibold text-gray-900">{invoice.company}</p>
          <p className="text-sm text-gray-500">Accra, Ghana</p>
          <p className="text-sm text-gray-500">accounts@{invoice.company.toLowerCase().replace(/\s+/g, "")}.com</p>
        </div>
      </div>

      <table className="w-full mb-6">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-2 w-1/2">Description</th>
            <th className="text-right text-xs font-semibold text-gray-400 uppercase pb-2">Qty</th>
            <th className="text-right text-xs font-semibold text-gray-400 uppercase pb-2">Rate</th>
            <th className="text-right text-xs font-semibold text-gray-400 uppercase pb-2">Amount</th>
          </tr>
        </thead>
        <tbody>
          {previewItems.map((item, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-3 text-sm text-gray-700">{item.description}</td>
              <td className="py-3 text-sm text-gray-700 text-right">{item.qty}</td>
              <td className="py-3 text-sm text-gray-700 text-right">{fmt(item.rate)}</td>
              <td className="py-3 text-sm text-gray-700 text-right">{fmt(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mb-6">
        <div className="w-56">
          <div className="flex justify-between text-sm text-gray-600 py-1">
            <span>Subtotal</span>
            <span>{fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600 py-1">
            <span>Tax (10%)</span>
            <span>{fmt(tax)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-2 mt-1">
            <span>Total</span>
            <span className="text-green-600">{fmt(total)}</span>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
        <div className="flex gap-8">
          <div>
            <span className="font-medium text-gray-700">Payment Terms:</span> Net 30
          </div>
          <div>
            <span className="font-medium text-gray-700">Due Date:</span>{" "}
            {invoice.date !== "—" ? invoice.date : "TBD"}
          </div>
        </div>
        <p className="mt-2 text-gray-500">Please make payment via bank transfer. Thank you for your business.</p>
      </div>
    </div>
  );
}

function LivePreview({ form }) {
  const items = form.items.map((it) => ({
    ...it,
    amount: (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0),
  }));
  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const taxRate = parseFloat(form.taxRate) || 0;
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 h-full overflow-auto">
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            L
          </div>
          <span className="text-xl font-bold text-gray-900">Ledge</span>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">INVOICE</p>
          <p className="text-sm text-gray-500 mt-1">Date: {form.invoiceDate || "—"}</p>
          <p className="text-sm text-gray-500">Due: {form.dueDate || "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">From</p>
          <p className="font-semibold text-gray-900">Ledge Financial Inc.</p>
          <p className="text-sm text-gray-500">Accra, Ghana</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">To</p>
          <p className="font-semibold text-gray-900">{form.clientName || "Client Name"}</p>
          <p className="text-sm text-gray-500">{form.clientEmail || "client@email.com"}</p>
        </div>
      </div>

      <table className="w-full mb-6">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left text-xs font-semibold text-gray-400 uppercase pb-2 w-1/2">Description</th>
            <th className="text-right text-xs font-semibold text-gray-400 uppercase pb-2">Qty</th>
            <th className="text-right text-xs font-semibold text-gray-400 uppercase pb-2">Rate</th>
            <th className="text-right text-xs font-semibold text-gray-400 uppercase pb-2">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-2 text-sm text-gray-700">{item.description || "—"}</td>
              <td className="py-2 text-sm text-gray-700 text-right">{item.qty}</td>
              <td className="py-2 text-sm text-gray-700 text-right">
                {item.rate ? fmt(parseFloat(item.rate)) : "—"}
              </td>
              <td className="py-2 text-sm text-gray-700 text-right">
                {item.amount ? fmt(item.amount) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mb-6">
        <div className="w-56">
          <div className="flex justify-between text-sm text-gray-600 py-1">
            <span>Subtotal</span>
            <span>{fmt(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600 py-1">
            <span>Tax ({taxRate}%)</span>
            <span>{fmt(tax)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-2 mt-1">
            <span>Total</span>
            <span className="text-green-600">{fmt(total)}</span>
          </div>
        </div>
      </div>

      {(form.notes || form.paymentTerms) && (
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          {form.paymentTerms && (
            <p><span className="font-medium text-gray-700">Payment Terms:</span> {form.paymentTerms}</p>
          )}
          {form.notes && <p className="mt-1 text-gray-500">{form.notes}</p>}
        </div>
      )}
    </div>
  );
}

export default function Invoicing() {
  const [activeTab, setActiveTab] = useState("All");
  const [selectedInvoice, setSelectedInvoice] = useState(invoices[0]);
  const [showBuilder, setShowBuilder] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const tabs = ["All", "Sent", "Overdue", "Draft"];

  const filteredInvoices =
    activeTab === "All" ? invoices : invoices.filter((inv) => inv.status === activeTab);

  const updateForm = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const updateItem = (i, field, value) => {
    const items = form.items.map((item, idx) =>
      idx === i ? { ...item, [field]: value } : item
    );
    setForm((f) => ({ ...f, items }));
  };

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }));

  const removeItem = (i) =>
    setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoicing</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage and track all your invoices</p>
        </div>
        <button
          onClick={() => setShowBuilder(true)}
          className="flex items-center gap-2 bg-green-500 text-white rounded-md px-4 py-2 hover:bg-green-600 transition-colors font-medium text-sm"
        >
          <Plus size={16} />
          New Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Outstanding", value: "$89,400", icon: Clock, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Overdue", value: "$12,800", icon: AlertCircle, color: "text-red-500", bg: "bg-red-50" },
          { label: "Paid MTD", value: "$234,100", icon: CheckCircle, color: "text-green-500", bg: "bg-green-50" },
          { label: "Avg Days to Pay", value: "18", icon: FileText, color: "text-purple-500", bg: "bg-purple-50" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <div className={`${stat.bg} p-2 rounded-lg`}>
                <stat.icon size={16} className={stat.color} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {!showBuilder ? (
        /* Two-column layout */
        <div className="grid grid-cols-3 gap-6">
          {/* Invoice List */}
          <div className="col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              {/* Tabs */}
              <div className="flex border-b border-gray-200 px-4 pt-4">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`mr-4 pb-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab
                        ? "border-green-500 text-green-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              {/* List */}
              <div className="divide-y divide-gray-100">
                {filteredInvoices.map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className={`w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors ${
                      selectedInvoice?.id === inv.id ? "bg-green-50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 text-sm truncate">{inv.company}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{inv.id}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <StatusPill status={inv.status} />
                          <span className="text-xs text-gray-400">{inv.date}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={`text-sm font-bold ${
                            inv.status === "Paid"
                              ? "text-green-600"
                              : inv.status === "Overdue"
                              ? "text-red-600"
                              : "text-gray-900"
                          }`}
                        >
                          {fmt(inv.amount)}
                        </p>
                        <ChevronRight size={14} className="text-gray-300 ml-auto mt-1" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Invoice Preview */}
          <div className="col-span-2">
            {selectedInvoice ? (
              <InvoicePreview invoice={selectedInvoice} />
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 flex items-center justify-center h-64">
                <div className="text-center">
                  <Eye size={32} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400">Select an invoice to preview</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Invoice Builder */
        <div className="grid grid-cols-2 gap-6">
          {/* Builder Form */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 overflow-auto max-h-[80vh]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">New Invoice</h2>
              <button
                onClick={() => setShowBuilder(false)}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                  <input
                    type="text"
                    value={form.clientName}
                    onChange={(e) => updateForm("clientName", e.target.value)}
                    placeholder="Client company name"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Email</label>
                  <input
                    type="email"
                    value={form.clientEmail}
                    onChange={(e) => updateForm("clientEmail", e.target.value)}
                    placeholder="billing@client.com"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                  <input
                    type="date"
                    value={form.invoiceDate}
                    onChange={(e) => updateForm("invoiceDate", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => updateForm("dueDate", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Line Items</label>
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-400 px-1">
                    <div className="col-span-5">Description</div>
                    <div className="col-span-2 text-right">Qty</div>
                    <div className="col-span-3 text-right">Rate</div>
                    <div className="col-span-2 text-right">Amount</div>
                  </div>
                  {form.items.map((item, i) => {
                    const amount =
                      (parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0);
                    return (
                      <div key={i} className="grid grid-cols-12 gap-2 items-center">
                        <input
                          className="col-span-5 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
                          placeholder="Item description"
                          value={item.description}
                          onChange={(e) => updateItem(i, "description", e.target.value)}
                        />
                        <input
                          className="col-span-2 border border-gray-300 rounded-md px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-green-500"
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => updateItem(i, "qty", e.target.value)}
                        />
                        <input
                          className="col-span-3 border border-gray-300 rounded-md px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-green-500"
                          type="number"
                          placeholder="0.00"
                          value={item.rate}
                          onChange={(e) => updateItem(i, "rate", e.target.value)}
                        />
                        <div className="col-span-1 text-right text-sm text-gray-700 font-medium">
                          {amount ? fmt(amount) : "—"}
                        </div>
                        <button
                          onClick={() => removeItem(i)}
                          className="col-span-1 text-gray-300 hover:text-red-400 flex justify-center"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                  <button
                    onClick={addItem}
                    className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium mt-1"
                  >
                    <Plus size={14} />
                    Add line item
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                  <select
                    value={form.paymentTerms}
                    onChange={(e) => updateForm("paymentTerms", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {["Net 15", "Net 30", "Net 45", "Net 60", "Due on Receipt"].map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    value={form.taxRate}
                    onChange={(e) => updateForm("taxRate", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                  placeholder="Additional notes or payment instructions..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button className="flex items-center gap-2 bg-green-500 text-white rounded-md px-4 py-2 hover:bg-green-600 transition-colors font-medium text-sm">
                <Send size={15} />
                Send Invoice
              </button>
              <button className="bg-white text-gray-700 border border-gray-300 rounded-md px-4 py-2 hover:bg-gray-50 transition-colors font-medium text-sm">
                Save Draft
              </button>
            </div>
          </div>

          {/* Live Preview */}
          <div className="overflow-auto max-h-[80vh]">
            <div className="mb-3 flex items-center gap-2">
              <Eye size={15} className="text-gray-400" />
              <span className="text-sm text-gray-500 font-medium">Live Preview</span>
            </div>
            <LivePreview form={form} />
          </div>
        </div>
      )}
    </div>
  );
}
