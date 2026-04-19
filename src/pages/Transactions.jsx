import { useState, useRef } from "react";
import {
  Search, X, CheckCircle, ChevronRight, ArrowDownLeft, ArrowUpRight,
  Upload, Landmark, Plug, AlertCircle, FileSpreadsheet, Smartphone,
} from "lucide-react";
import { useTransactions, useUpdateTransaction, useTransactionCategories, useImportTransactions } from "../hooks/useTransactions";
import { useBankAccounts, useCreateBankAccount } from "../hooks/useBankAccounts";
import { parseStatementFile, detectMapping, mapToTransactions } from "../lib/parseStatement";
import { useAuth } from "../context/AuthContext";
import { fmt, fmtDate } from "../lib/fmt";

// ── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

// ── Account badge ──────────────────────────────────────────────────────────────
function AccountBadge({ account }) {
  if (!account) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: account.color ?? "#9CA3AF" }} />
      {account.name}
    </span>
  );
}

// ── PassPanel — 3-step categorisation wizard ────────────────────────────────────
function PassPanel({ txn, categories, currency, onClose, onConfirm }) {
  const [step, setStep]         = useState(1);
  const [bookType, setBookType] = useState(null);
  const [categoryId, setCategoryId] = useState(null);
  const [note, setNote]         = useState(txn.note ?? "");

  const cats       = (categories ?? []).filter((c) => c.type === bookType);
  const selectedCat = cats.find((c) => c.id === categoryId);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-[420px] bg-white h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Step {step} of 3</p>
            <h2 className="text-base font-semibold text-gray-900 mt-0.5">
              {step === 1 && "What kind of transaction is this?"}
              {step === 2 && "Pick a category"}
              {step === 3 && "Review & confirm"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>

        <div className="flex items-center gap-2 px-6 pt-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${n <= step ? "bg-green-500" : "bg-gray-200"}`} />
          ))}
        </div>

        <div className="mx-6 mt-4 mb-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{txn.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <AccountBadge account={txn.bank_accounts} />
                <span className="text-xs text-gray-400">{fmtDate(txn.txn_date)}</span>
              </div>
            </div>
            <div className="text-right ml-4 shrink-0">
              <p className={`text-sm font-bold tabular-nums ${txn.direction === "credit" ? "text-green-600" : "text-gray-900"}`}>
                {txn.direction === "credit" ? "+" : "-"}{fmt(txn.amount, currency)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {step === 1 && (
            <div className="space-y-3">
              <button onClick={() => { setBookType("revenue"); setStep(2); }}
                className="w-full text-left p-4 rounded-xl border-2 border-transparent hover:border-green-400 bg-green-50 hover:bg-green-100 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-white shrink-0"><ArrowDownLeft size={20} /></div>
                  <div>
                    <p className="font-semibold text-gray-900">Revenue / Income</p>
                    <p className="text-xs text-gray-500 mt-0.5">Money coming into the business — sales, grants, fees</p>
                  </div>
                  <ChevronRight size={16} className="ml-auto text-gray-400 group-hover:text-green-600" />
                </div>
              </button>
              <button onClick={() => { setBookType("expense"); setStep(2); }}
                className="w-full text-left p-4 rounded-xl border-2 border-transparent hover:border-amber-400 bg-amber-50 hover:bg-amber-100 transition-all group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shrink-0"><ArrowUpRight size={20} /></div>
                  <div>
                    <p className="font-semibold text-gray-900">Expense / Cost</p>
                    <p className="text-xs text-gray-500 mt-0.5">Money going out — rent, salaries, supplies, software</p>
                  </div>
                  <ChevronRight size={16} className="ml-auto text-gray-400 group-hover:text-amber-600" />
                </div>
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              {cats.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No {bookType} categories found</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {cats.map((cat) => (
                    <button key={cat.id} onClick={() => { setCategoryId(cat.id); setStep(3); }}
                      className={`p-3 rounded-xl border-2 text-left hover:opacity-90 transition-all bg-gray-50 ${
                        categoryId === cat.id ? "border-green-400 ring-2 ring-offset-1 ring-green-400" : "border-gray-200 hover:border-green-300"
                      }`}>
                      <div className="text-2xl mb-1">{cat.emoji ?? "📦"}</div>
                      <p className="text-xs font-semibold leading-tight text-gray-800">{cat.name}</p>
                    </button>
                  ))}
                </div>
              )}
              <button onClick={() => setStep(1)} className="mt-4 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">← Back</button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Book as</span>
                  <span className={`font-semibold ${bookType === "revenue" ? "text-green-700" : "text-amber-700"}`}>
                    {bookType === "revenue" ? "Revenue" : "Expense"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Category</span>
                  <span className="font-semibold text-gray-900">{selectedCat?.emoji ?? "📦"} {selectedCat?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount</span>
                  <span className={`font-bold tabular-nums ${txn.direction === "credit" ? "text-green-600" : "text-gray-900"}`}>
                    {txn.direction === "credit" ? "+" : "-"}{fmt(txn.amount, currency)}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Add a note (optional)</label>
                <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Q2 supplier payment, April office rent..."
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
              </div>
              <button onClick={() => setStep(2)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">← Change category</button>
            </div>
          )}
        </div>

        {step === 3 && (
          <div className="px-6 py-4 border-t border-gray-100">
            <button onClick={() => onConfirm({ categoryId, bookType, note })}
              className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
              <CheckCircle size={16} /> Pass to Books
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Upload Bank Statement Modal (multi-step) ──────────────────────────────────
const COL_OPTIONS = ["— ignore —", "Date", "Description", "Debit", "Credit", "Amount"];

function UploadStatementModal({ onClose, bankAccounts }) {
  const importMut    = useImportTransactions();
  const fileInputRef = useRef(null);

  // step: 'select' | 'parsing' | 'map' | 'preview' | 'done'
  const [step,      setStep]      = useState("select");
  const [file,      setFile]      = useState(null);
  const [accountId, setAccountId] = useState(bankAccounts[0]?.id ?? "");
  const [dragOver,  setDragOver]  = useState(false);
  const [error,     setError]     = useState("");
  const [parsed,    setParsed]    = useState(null);
  const [headers,   setHeaders]   = useState([]);
  const [colMap,    setColMap]    = useState({});
  const [preview,   setPreview]   = useState([]);
  const [selected,  setSelected]  = useState({});
  const [imported,  setImported]  = useState(0);

  function pickFile(f) {
    if (!f) return;
    const ext = f.name.split(".").pop().toLowerCase();
    if (!["csv","xlsx","xls"].includes(ext)) {
      setError("Only CSV and Excel (.xlsx / .xls) files are supported. Please export your statement from your bank's app as CSV or Excel.");
      return;
    }
    setFile(f); setError("");
  }

  async function handleParse() {
    if (!file)      { setError("Please select a file."); return; }
    if (!accountId) { setError("Please select a bank account."); return; }
    setError(""); setStep("parsing");
    try {
      const result = await parseStatementFile(file);
      setParsed(result);
      if (result.type === "structured") {
        setHeaders(result.headers);
        const m = result.mapping;
        const init = {};
        result.headers.forEach((_, i) => {
          if (i === m.date)             init[i] = "Date";
          else if (i === m.description) init[i] = "Description";
          else if (i === m.debit)       init[i] = "Debit";
          else if (i === m.credit)      init[i] = "Credit";
          else if (i === m.amount)      init[i] = "Amount";
          else                          init[i] = "— ignore —";
        });
        setColMap(init); setStep("map");
      } else {
        setError("Could not extract transactions. Make sure your file has a header row and data rows.");
        setStep("select");
      }
    } catch (err) {
      setError(err?.message ?? "Failed to parse file."); setStep("select");
    }
  }

  function handleApplyMapping() {
    const m = { date: null, description: null, debit: null, credit: null, amount: null };
    Object.entries(colMap).forEach(([idx, label]) => {
      const i = parseInt(idx);
      if (label === "Date")        m.date        = i;
      if (label === "Description") m.description = i;
      if (label === "Debit")       m.debit       = i;
      if (label === "Credit")      m.credit      = i;
      if (label === "Amount")      m.amount      = i;
    });
    if (m.date === null)        { setError("Please mark a Date column."); return; }
    if (m.description === null) { setError("Please mark a Description column."); return; }
    if (m.amount === null && m.debit === null && m.credit === null) {
      setError("Please mark at least one amount column (Debit, Credit, or Amount)."); return;
    }
    setError(""); buildPreview(mapToTransactions(parsed.rows, m));
  }

  function buildPreview(txns) {
    setPreview(txns);
    setSelected(Object.fromEntries(txns.map((_, i) => [i, true])));
    setStep("preview");
  }

  async function handleImport() {
    const rows = preview.filter((_, i) => selected[i]).map(t => ({ ...t, bank_account_id: accountId }));
    if (!rows.length) { setError("No transactions selected."); return; }
    setError("");
    try {
      await importMut.mutateAsync(rows);
      setImported(rows.length); setStep("done");
    } catch (err) {
      setError(err?.message ?? "Import failed. Please try again.");
    }
  }

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const titles = { select: "Upload Bank Statement", parsing: "Reading file…", map: "Map Columns", preview: "Preview Transactions", done: "Import Complete" };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{titles[step]}</h3>
            {step === "select"  && <p className="text-xs text-gray-500 mt-0.5">CSV or Excel (.xlsx / .xls)</p>}
            {step === "map" && parsed?.type === "structured" && <p className="text-xs text-gray-500 mt-0.5">We've made our best guess — adjust if needed</p>}
            {step === "preview" && <p className="text-xs text-gray-500 mt-0.5">{preview.length} transaction{preview.length !== 1 ? "s" : ""} found — uncheck any you don't want</p>}
          </div>
          {step !== "parsing" && <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div className="flex items-center gap-2 mb-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              <AlertCircle size={13} className="shrink-0" />{error}
            </div>
          )}

          {/* SELECT */}
          {step === "select" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Account <span className="text-red-400">*</span></label>
                <select value={accountId} onChange={e => setAccountId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500">
                  <option value="">Select account…</option>
                  {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls"
                className="hidden" onChange={e => pickFile(e.target.files?.[0])} />
              {file ? (
                <div className="flex items-center gap-2 border border-green-200 bg-green-50 rounded-lg px-3 py-3">
                  <FileSpreadsheet size={16} className="text-green-600 shrink-0" />
                  <span className="text-sm text-green-700 truncate flex-1">{file.name}</span>
                  <button onClick={() => setFile(null)} className="text-green-500 hover:text-green-700"><X size={14} /></button>
                </div>
              ) : (
                <div onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0]); }}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    dragOver ? "border-green-400 bg-green-50" : "border-gray-300 hover:border-green-400"
                  }`}>
                  <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Drop your statement here or <span className="text-green-600 font-medium">browse</span></p>
                  <p className="text-xs text-gray-400 mt-1">CSV · Excel (.xlsx / .xls)</p>
                </div>
              )}
            </div>
          )}

          {/* PARSING */}
          {step === "parsing" && (
            <div className="py-12 text-center">
              <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-medium text-gray-700">Reading {file?.name}…</p>
              <p className="text-xs text-gray-400 mt-1">Extracting transactions</p>
            </div>
          )}

          {/* MAP — structured (CSV / Excel / PDF) */}
          {step === "map" && parsed?.type === "structured" && (
            <div>
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2.5 w-1/2">Column in your file</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-4 py-2.5 w-1/2">Maps to</th>
                    </tr>
                  </thead>
                  <tbody>
                    {headers.map((h, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0">
                        <td className="px-4 py-2.5 text-gray-700 font-medium truncate max-w-xs">{h || `Column ${i+1}`}</td>
                        <td className="px-4 py-2.5">
                          <select value={colMap[i] ?? "— ignore —"} onChange={e => setColMap(m => ({ ...m, [i]: e.target.value }))}
                            className="w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500">
                            {COL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.rows?.[0] && (
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-400 font-medium mb-1">First data row (preview)</p>
                  <p className="text-xs text-gray-600 font-mono truncate">
                    {parsed.rows[0].map((c, i) => `${headers[i] || `C${i}`}: ${c}`).join("  ·  ")}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* PREVIEW */}
          {step === "preview" && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500">{selectedCount} of {preview.length} selected</p>
                <div className="flex gap-3">
                  <button onClick={() => setSelected(Object.fromEntries(preview.map((_,i)=>[i,true])))}
                    className="text-xs text-green-600 hover:underline">Select all</button>
                  <button onClick={() => setSelected(Object.fromEntries(preview.map((_,i)=>[i,false])))}
                    className="text-xs text-gray-400 hover:underline">Deselect all</button>
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="w-8 px-3 py-2.5" />
                      <th className="text-left font-semibold text-gray-500 px-3 py-2.5">Date</th>
                      <th className="text-left font-semibold text-gray-500 px-3 py-2.5">Description</th>
                      <th className="text-right font-semibold text-gray-500 px-3 py-2.5">Amount</th>
                      <th className="text-center font-semibold text-gray-500 px-3 py-2.5">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((t, i) => (
                      <tr key={i} onClick={() => setSelected(s => ({ ...s, [i]: !s[i] }))}
                        className={`border-b border-gray-100 last:border-0 cursor-pointer transition-colors ${selected[i] ? "hover:bg-gray-50" : "opacity-40 bg-gray-50/60"}`}>
                        <td className="px-3 py-2.5 text-center">
                          <input type="checkbox" checked={!!selected[i]} onChange={() => {}} className="w-3.5 h-3.5 accent-green-500" />
                        </td>
                        <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{t.txn_date}</td>
                        <td className="px-3 py-2.5 text-gray-800 max-w-[200px] truncate">{t.description}</td>
                        <td className={`px-3 py-2.5 text-right font-semibold tabular-nums ${t.direction === "credit" ? "text-green-600" : "text-gray-900"}`}>
                          {t.direction === "credit" ? "+" : "-"}{(t.amount / 100).toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full font-medium ${t.direction === "credit" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                            {t.direction}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DONE */}
          {step === "done" && (
            <div className="py-10 text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-green-500" />
              </div>
              <p className="text-lg font-semibold text-gray-900">{imported} transaction{imported !== 1 ? "s" : ""} imported</p>
              <p className="text-sm text-gray-500 mt-1">They're in your list, marked Pending Review — categorise them to pass to Books</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 shrink-0">
          {step === "select" && (
            <>
              <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={handleParse} disabled={!file || !accountId}
                className="flex-1 bg-green-500 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-green-600 disabled:opacity-40">
                Continue
              </button>
            </>
          )}
          {step === "map" && parsed?.type === "structured" && (
            <>
              <button onClick={() => { setStep("select"); setError(""); }}
                className="flex-1 border border-gray-200 text-gray-600 rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-50">Back</button>
              <button onClick={handleApplyMapping}
                className="flex-1 bg-green-500 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-green-600">
                Preview Transactions
              </button>
            </>
          )}
          {step === "map" && parsed?.type === "image" && (
            <button onClick={onClose} className="w-full border border-gray-200 text-gray-600 rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-50">Close</button>
          )}
          {step === "preview" && (
            <>
              <button onClick={() => { setStep("map"); setError(""); }}
                className="flex-1 border border-gray-200 text-gray-600 rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-50">Back</button>
              <button onClick={handleImport} disabled={importMut.isPending || selectedCount === 0}
                className="flex-1 bg-green-500 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-green-600 disabled:opacity-40">
                {importMut.isPending ? "Importing…" : `Import ${selectedCount} Transaction${selectedCount !== 1 ? "s" : ""}`}
              </button>
            </>
          )}
          {step === "done" && (
            <button onClick={onClose} className="w-full bg-green-500 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-green-600">Done</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add Bank / MoMo Wallet Modal ───────────────────────────────────────────────
const GHANA_BANKS = [
  "Absa Bank Ghana Limited",
  "Access Bank Ghana Plc",
  "Agricultural Development Bank of Ghana (ADB)",
  "Bank of Africa Ghana Limited",
  "CalBank PLC",
  "Consolidated Bank Ghana Limited (CBG)",
  "Ecobank Ghana Limited",
  "FBN Bank (Ghana) Limited",
  "Fidelity Bank Ghana Limited",
  "First Atlantic Bank Limited",
  "First National Bank Ghana Limited (FNB)",
  "GCB Bank Limited",
  "Guaranty Trust Bank (Ghana) Limited",
  "National Investment Bank Limited (NIB)",
  "OmniBSIC Bank Ghana Limited",
  "Prudential Bank Limited",
  "Republic Bank (Ghana) Limited",
  "Société Générale Ghana Limited",
  "Stanbic Bank Ghana Limited",
  "Standard Chartered Bank Ghana Limited",
  "United Bank for Africa (Ghana) Limited",
  "Universal Merchant Bank Limited (UMB)",
  "Zenith Bank (Ghana) Limited",
];

const MOMO_NETWORKS = ["MTN Mobile Money (MoMo)", "Telecel Cash (Vodafone Cash)", "AirtelTigo Money"];

const ACCOUNT_COLORS = ["#10B981","#3B82F6","#F59E0B","#EF4444","#8B5CF6","#EC4899","#14B8A6","#F97316"];

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    + "-" + Math.random().toString(36).slice(2, 7);
}

function AddBankModal({ onClose }) {
  const createMut = useCreateBankAccount();
  const [form, setForm] = useState({
    name: "", type: "bank", institution: "", accountNumber: "", currency: "GHS",
    color: ACCOUNT_COLORS[0],
  });
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    if (!form.name.trim())    { setError("Account name is required."); return; }
    if (!form.institution)    { setError(`Please select a ${form.type === "momo" ? "network" : "bank"}.`); return; }

    // mask account number — keep last 4 digits only
    const masked = form.accountNumber.replace(/\s/g, "").slice(-4)
      ? "•••• " + form.accountNumber.replace(/\s/g, "").slice(-4)
      : null;

    try {
      await createMut.mutateAsync({
        name:                 form.name.trim(),
        slug:                 slugify(form.name.trim()),
        type:                 form.type === "momo" ? "mobile_money" : "bank",
        institution_name:     form.institution,
        account_number_masked: masked,
        currency:             form.currency,
        color:                form.color,
        is_active:            true,
        is_default:           false,
      });
      onClose();
    } catch (err) {
      setError(err?.message ?? "Failed to add account. Please try again.");
    }
  }

  const institutions = form.type === "momo" ? MOMO_NETWORKS : GHANA_BANKS;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Add Bank / MoMo Wallet</h3>
            <p className="text-xs text-gray-500 mt-0.5">Connect a financial account to track transactions</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {error && (
          <div className="flex items-center gap-2 mb-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            <AlertCircle size={13} className="shrink-0" />{error}
          </div>
        )}

        {/* Account type toggle */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {[{ value: "bank", label: "Bank Account", Icon: Landmark }, { value: "momo", label: "Mobile Money", Icon: Smartphone }].map(({ value, label, Icon }) => (
            <button key={value} onClick={() => setForm(f => ({ ...f, type: value, institution: "" }))}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                form.type === value ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-600 hover:border-green-300"
              }`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {/* Account name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Name <span className="text-red-400">*</span></label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={form.type === "momo" ? "e.g. My MTN MoMo" : "e.g. GCB Business Account"}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
          </div>

          {/* Bank / Network */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {form.type === "momo" ? "Network" : "Bank"} <span className="text-red-400">*</span>
            </label>
            <select value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500">
              <option value="">Select {form.type === "momo" ? "network" : "bank"}…</option>
              {institutions.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Account / phone number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {form.type === "momo" ? "Phone Number" : "Account Number"} <span className="text-gray-400 font-normal text-xs">(optional)</span>
            </label>
            <input value={form.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))}
              placeholder={form.type === "momo" ? "e.g. 0244 000 000" : "e.g. 1234567890"}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" />
            <p className="text-xs text-gray-400 mt-1">Only the last 4 digits are stored for display</p>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500">
              {["GHS", "USD", "GBP", "EUR", "NGN"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Account Colour</label>
            <div className="flex gap-2 flex-wrap">
              {ACCOUNT_COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? "border-gray-800 scale-110" : "border-transparent"}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={createMut.isPending}
            className="flex-1 bg-green-500 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-green-600 disabled:opacity-50">
            {createMut.isPending ? "Adding…" : "Add Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Connect Payment Provider Modal ────────────────────────────────────────────
function ConnectProviderModal({ onClose }) {
  const PROVIDERS = [
    { name: "Paystack",      logo: "🟢", desc: "Accept payments across Africa",         color: "border-green-200 hover:border-green-400"  },
    { name: "Flutterwave",   logo: "🟠", desc: "Pan-African payment infrastructure",    color: "border-orange-200 hover:border-orange-400" },
    { name: "Stripe",        logo: "🔵", desc: "Global online payments",                color: "border-blue-200 hover:border-blue-400"     },
    { name: "MTN MoMo API",  logo: "🟡", desc: "MTN Mobile Money collection & payout", color: "border-yellow-200 hover:border-yellow-400" },
    { name: "Hubtel",        logo: "🔴", desc: "Ghana-based payment aggregator",        color: "border-red-200 hover:border-red-400"       },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Connect Payment Service Provider</h3>
            <p className="text-xs text-gray-500 mt-0.5">Sync payments automatically — transactions will flow in real-time</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="space-y-2 mb-5">
          {PROVIDERS.map(p => (
            <div key={p.name}
              className={`flex items-center justify-between border-2 rounded-xl px-4 py-3 transition-all ${p.color}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{p.logo}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.desc}</p>
                </div>
              </div>
              <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">Coming soon</span>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5 flex items-start gap-2 mb-5">
          <AlertCircle size={13} className="text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700">Payment provider integrations are in development. You'll be notified as each one goes live. In the meantime, import transactions via bank statement upload.</p>
        </div>

        <button onClick={onClose}
          className="w-full border border-gray-200 text-gray-600 rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-50">
          Close
        </button>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────────
export default function Transactions() {
  const { orgCurrency } = useAuth();
  const currency = orgCurrency ?? "GHS";

  const [activeSource,       setActiveSource]       = useState("all");
  const [statusFilter,       setStatusFilter]       = useState("all");
  const [search,             setSearch]             = useState("");
  const [panelTxn,           setPanelTxn]           = useState(null);
  const [toast,              setToast]              = useState(null);
  const [showUploadModal,    setShowUploadModal]    = useState(false);
  const [showAddBankModal,   setShowAddBankModal]   = useState(false);
  const [showProviderModal,  setShowProviderModal]  = useState(false);

  const queryFilters = {
    ...(activeSource !== "all" && { bankId: activeSource }),
    ...(statusFilter !== "all" && { status: statusFilter }),
    ...(search.trim()          && { search: search.trim() }),
    limit: 150,
  };

  const { data: txns = [],        isLoading } = useTransactions(queryFilters);
  const { data: bankAccounts = [] }            = useBankAccounts();
  const { data: categories = [] }              = useTransactionCategories();
  const updateMut = useUpdateTransaction();

  const pendingCount     = txns.filter((t) => t.status === "pending").length;
  const categorizedCount = txns.filter((t) => t.status === "categorized").length;

  const handlePassConfirm = ({ categoryId, bookType, note }) => {
    updateMut.mutate({ id: panelTxn.id, category_id: categoryId, type: bookType, status: "categorized", note });
    const cat = categories.find((c) => c.id === categoryId);
    setToast(`✓ Passed to ${bookType === "revenue" ? "Revenue" : "Expenses"} as "${cat?.name ?? ""}"`);
    setTimeout(() => setToast(null), 3500);
    setPanelTxn(null);
  };

  const sourceTabs = [{ id: "all", name: "All Accounts", color: null }, ...bankAccounts];

  return (
    <div className="min-h-screen bg-[#F7F7F8] p-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl flex items-center gap-2">
          <CheckCircle size={15} /> {toast}
        </div>
      )}

      {/* Modals */}
      {panelTxn && (
        <PassPanel txn={panelTxn} categories={categories} currency={currency}
          onClose={() => setPanelTxn(null)} onConfirm={handlePassConfirm} />
      )}
      {showUploadModal   && <UploadStatementModal onClose={() => setShowUploadModal(false)}   bankAccounts={bankAccounts} />}
      {showAddBankModal  && <AddBankModal         onClose={() => setShowAddBankModal(false)} />}
      {showProviderModal && <ConnectProviderModal  onClose={() => setShowProviderModal(false)} />}

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500 mt-0.5">Bank and mobile money activity — pass anything to your books</p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg shadow-sm transition-colors">
            <Upload size={14} /> Upload Bank Statement
          </button>
          <button onClick={() => setShowAddBankModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium rounded-lg shadow-sm transition-colors">
            <Landmark size={14} /> Add Bank / MoMo Wallet
          </button>
          <button onClick={() => setShowProviderModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium rounded-lg shadow-sm transition-colors">
            <Plug size={14} /> Connect Payment Provider
          </button>
        </div>
      </div>

      {/* Stat filter badges */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setStatusFilter(statusFilter === "pending" ? "all" : "pending")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
            statusFilter === "pending"
              ? "bg-amber-500 text-white border-amber-500 shadow-sm"
              : "bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400"
          }`}>
          <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
            statusFilter === "pending" ? "bg-amber-400 text-white" : "bg-amber-200 text-amber-800"
          }`}>
            {isLoading ? "…" : pendingCount}
          </span>
          Pending review
        </button>

        <button onClick={() => setStatusFilter(statusFilter === "categorized" ? "all" : "categorized")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
            statusFilter === "categorized"
              ? "bg-green-500 text-white border-green-500 shadow-sm"
              : "bg-green-50 text-green-700 border-green-200 hover:border-green-400"
          }`}>
          <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
            statusFilter === "categorized" ? "bg-green-400 text-white" : "bg-green-200 text-green-800"
          }`}>
            {isLoading ? "…" : categorizedCount}
          </span>
          Passed to books
        </button>

        {statusFilter !== "all" && (
          <button onClick={() => setStatusFilter("all")} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 ml-1">
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Source tabs + Search */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm overflow-x-auto max-w-full">
          {sourceTabs.map((acc) => (
            <button key={acc.id} onClick={() => setActiveSource(acc.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeSource === acc.id ? "bg-gray-900 text-white shadow-sm" : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}>
              {acc.color && (
                <span className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: activeSource === acc.id ? "rgba(255,255,255,0.6)" : acc.color }} />
              )}
              {acc.name}
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search transactions..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-green-400 shadow-sm" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-100">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
            {isLoading ? "Loading…" : `${txns.length} transaction${txns.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div>
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            ))}
          </div>
        ) : txns.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Search size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No transactions found</p>
            <button onClick={() => { setActiveSource("all"); setStatusFilter("all"); setSearch(""); }}
              className="text-sm text-green-600 mt-1 hover:underline">Clear filters</button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {txns.map((t) => {
              const isPending = t.status === "pending";
              const cat       = t.transaction_categories;
              return (
                <div key={t.id}
                  className={`flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors border-l-[3px] ${
                    isPending ? "border-l-amber-400" : "border-l-green-400"
                  }`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${t.direction === "credit" ? "bg-green-50" : "bg-gray-100"}`}>
                    {t.direction === "credit" ? <ArrowDownLeft size={16} className="text-green-600" /> : <ArrowUpRight size={16} className="text-gray-500" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{t.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <AccountBadge account={t.bank_accounts} />
                      <span className="text-xs text-gray-400">{fmtDate(t.txn_date)}</span>
                      {t.note && <span className="text-xs text-gray-400 italic truncate max-w-[140px]">"{t.note}"</span>}
                    </div>
                  </div>

                  {cat && (
                    <div className="hidden md:block shrink-0">
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-700">
                        {cat.emoji ?? "📦"} {cat.name}
                      </span>
                    </div>
                  )}

                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold tabular-nums ${t.direction === "credit" ? "text-green-600" : "text-gray-900"}`}>
                      {t.direction === "credit" ? "+" : "-"}{fmt(t.amount, currency)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{t.direction}</p>
                  </div>

                  <div className="shrink-0 ml-2">
                    {isPending ? (
                      <button onClick={() => setPanelTxn(t)}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 hover:border-amber-400 text-xs font-semibold rounded-lg transition-all whitespace-nowrap">
                        Pass to Books
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
                        <CheckCircle size={12} /> In Books
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
