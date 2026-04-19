/**
 * Bank Statement Parser
 * Supports: CSV, Excel (.xlsx/.xls), PDF, Images (JPG/PNG)
 *
 * Returns one of:
 *   { type: 'structured', headers, rows, mapping }  — CSV / Excel
 *   { type: 'pdf_parsed', transactions }             — PDF auto-parsed
 *   { type: 'image', file }                          — image (manual review)
 */

import Papa from "papaparse";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Point PDF.js at the locally-bundled worker (avoids CDN version mismatch)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

// ── Column-name dictionaries ───────────────────────────────────────────────────
const DATE_HINTS  = ["date", "txn date", "transaction date", "value date",
                     "posting date", "trans date", "tran date", "created"];
const DESC_HINTS  = ["description", "narration", "details", "particulars",
                     "reference", "remarks", "memo", "narrative", "beneficiary",
                     "transaction type", "type"];
const DEBIT_HINTS = ["debit", "dr", "withdrawal", "withdrawals", "payment",
                     "charge", "charges", "money out", "out"];
const CREDIT_HINTS= ["credit", "cr", "deposit", "deposits", "receipt",
                     "receipts", "money in", "in"];
const AMOUNT_HINTS= ["amount", "value", "transaction amount", "tran amount"];

// ── Helpers ────────────────────────────────────────────────────────────────────
const norm = (s) => (s ?? "").toString().toLowerCase().trim();

export function detectMapping(headers) {
  const m = { date: null, description: null, debit: null, credit: null, amount: null };
  headers.forEach((h, i) => {
    const n = norm(h);
    if (m.date        === null && DATE_HINTS.some(p  => n.includes(p)))   m.date        = i;
    else if (m.description === null && DESC_HINTS.some(p  => n.includes(p)))   m.description = i;
    else if (m.debit       === null && DEBIT_HINTS.some(p => n.includes(p)))   m.debit       = i;
    else if (m.credit      === null && CREDIT_HINTS.some(p => n.includes(p)))  m.credit      = i;
    else if (m.amount      === null && AMOUNT_HINTS.some(p => n.includes(p)))  m.amount      = i;
  });
  return m;
}

function toMinorUnits(val) {
  if (val === null || val === undefined || val === "") return null;
  const cleaned = val.toString().replace(/[^\d.\-()]/g, "").replace(/\((.+)\)/, "-$1");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : Math.round(Math.abs(n) * 100);
}

function parseDate(val) {
  if (!val) return null;
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const m = val.toString().match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const year = y.length === 2 ? "20" + y : y;
    return `${year}-${mo.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }
  // YYYY/MM/DD
  const m2 = val.toString().match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (m2) {
    const [, y, mo, d] = m2;
    return `${y}-${mo.padStart(2,"0")}-${d.padStart(2,"0")}`;
  }
  return val.toString().slice(0, 10) || null;
}

/** Convert raw rows + column mapping into transaction objects */
export function mapToTransactions(rows, mapping) {
  return rows
    .filter((row) => row.some((c) => c !== "" && c != null))
    .map((row) => {
      const dateRaw = mapping.date        !== null ? row[mapping.date]        : null;
      const desc    = mapping.description !== null ? row[mapping.description] : null;

      let amount = null, direction = null;

      if (mapping.amount !== null) {
        const raw = row[mapping.amount]?.toString() ?? "";
        amount = toMinorUnits(raw);
        const negative = raw.includes("-") || /\(.+\)/.test(raw);
        direction = negative ? "debit" : "credit";
      } else {
        const drAmt = mapping.debit  !== null ? toMinorUnits(row[mapping.debit])  : null;
        const crAmt = mapping.credit !== null ? toMinorUnits(row[mapping.credit]) : null;
        if (drAmt && drAmt > 0)       { amount = drAmt; direction = "debit";  }
        else if (crAmt && crAmt > 0)  { amount = crAmt; direction = "credit"; }
      }

      return {
        txn_date:    parseDate(dateRaw) ?? new Date().toISOString().slice(0, 10),
        description: (desc ?? "Imported transaction").toString().trim() || "Imported transaction",
        amount:      amount ?? 0,
        direction:   direction ?? "debit",
        status:      "pending",
      };
    })
    .filter((t) => t.amount > 0);
}

// ── CSV ────────────────────────────────────────────────────────────────────────
function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      skipEmptyLines: "greedy",
      complete({ data, errors }) {
        if (errors.length && !data.length) {
          reject(new Error(errors[0].message)); return;
        }
        if (data.length < 2) { reject(new Error("CSV has no data rows.")); return; }

        // Find the first row with ≥ 3 non-empty cells — treat as header
        let headerIdx = 0;
        for (let i = 0; i < Math.min(15, data.length); i++) {
          if (data[i].filter((c) => c?.toString().trim()).length >= 3) {
            headerIdx = i; break;
          }
        }
        const headers = data[headerIdx].map((h) => h?.toString().trim() ?? "");
        const rows    = data.slice(headerIdx + 1);
        resolve({ type: "structured", headers, rows, mapping: detectMapping(headers) });
      },
      error: reject,
    });
  });
}

// ── Excel ──────────────────────────────────────────────────────────────────────
function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ({ target }) => {
      try {
        const wb = XLSX.read(target.result, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        if (raw.length < 2) { reject(new Error("Excel file has no data.")); return; }

        let headerIdx = 0;
        for (let i = 0; i < Math.min(15, raw.length); i++) {
          if (raw[i].filter((c) => c !== "" && c != null).length >= 3) {
            headerIdx = i; break;
          }
        }
        const headers = raw[headerIdx].map((h) =>
          h instanceof Date ? h.toISOString().slice(0, 10) : h?.toString().trim() ?? ""
        );
        const rows = raw.slice(headerIdx + 1).map((row) =>
          row.map((cell) => {
            if (cell instanceof Date) return cell.toISOString().slice(0, 10);
            return cell?.toString().trim() ?? "";
          })
        );
        resolve({ type: "structured", headers, rows, mapping: detectMapping(headers) });
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ── PDF ────────────────────────────────────────────────────────────────────────
async function parsePDF(file) {
  // pdfjsLib and worker are imported statically at the top of this file

  const buf  = await file.arrayBuffer();
  const pdf  = await pdfjsLib.getDocument({ data: buf }).promise;

  let allLines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page    = await pdf.getPage(p);
    const content = await page.getTextContent();
    // Group items by y-position to reconstruct rows
    const byY = {};
    content.items.forEach(({ str, transform }) => {
      const y = Math.round(transform[5]);
      byY[y] = byY[y] ? byY[y] + " " + str : str;
    });
    Object.keys(byY).sort((a, b) => b - a).forEach((y) => allLines.push(byY[y].trim()));
  }

  // Detect header row — look for a line with date + amount-like keywords
  const headerKeywords = [...DATE_HINTS, ...DESC_HINTS, ...DEBIT_HINTS, ...CREDIT_HINTS, ...AMOUNT_HINTS];
  let headerLine = null, headerLineIdx = -1;
  for (let i = 0; i < Math.min(30, allLines.length); i++) {
    const n = norm(allLines[i]);
    const hits = headerKeywords.filter((k) => n.includes(k)).length;
    if (hits >= 2) { headerLine = allLines[i]; headerLineIdx = i; break; }
  }

  const DATE_RE   = /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b|\b\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}\b/;
  const AMOUNT_RE = /\b[\d,]+\.\d{2}\b/;

  if (headerLine) {
    // Split header into columns by whitespace runs
    const headers = headerLine.split(/\s{2,}|\t/).map((h) => h.trim()).filter(Boolean);
    const mapping = detectMapping(headers);

    const rows = allLines.slice(headerLineIdx + 1)
      .filter((l) => DATE_RE.test(l) || AMOUNT_RE.test(l))
      .map((line) => {
        // Split each data line the same way
        return line.split(/\s{2,}|\t/).map((c) => c.trim());
      })
      .filter((r) => r.length >= 2);

    if (rows.length > 0) {
      return { type: "structured", headers, rows, mapping };
    }
  }

  // Fallback: line-by-line heuristic — grab any line that has a date + amount
  const transactions = allLines
    .filter((l) => DATE_RE.test(l) && AMOUNT_RE.test(l))
    .map((line) => {
      const dateMatch   = line.match(DATE_RE);
      const amounts     = [...line.matchAll(/[\d,]+\.\d{2}/g)].map((m) => m[0]);
      const desc        = line.replace(DATE_RE, "").replace(/[\d,]+\.\d{2}/g, "").replace(/\s+/g, " ").trim();
      // Last amount is usually balance; penultimate is transaction amount
      const amtStr      = amounts.length >= 2 ? amounts[amounts.length - 2] : amounts[0];
      const amount      = toMinorUnits(amtStr);
      const isCredit    = /credit|deposit|receipt|lodgement|reversal/i.test(desc);
      return {
        txn_date:    parseDate(dateMatch?.[0]) ?? new Date().toISOString().slice(0,10),
        description: desc || "Imported",
        amount:      amount ?? 0,
        direction:   isCredit ? "credit" : "debit",
        status:      "pending",
      };
    })
    .filter((t) => t.amount > 0);

  if (transactions.length > 0) {
    return { type: "pdf_parsed", transactions };
  }

  // Nothing usable found
  return { type: "pdf_empty" };
}

// ── Main export ────────────────────────────────────────────────────────────────
export async function parseStatementFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (ext === "csv")                       return parseCSV(file);
  if (ext === "xlsx" || ext === "xls")     return parseExcel(file);
  if (ext === "pdf")                       return parsePDF(file);
  if (["jpg","jpeg","png"].includes(ext))  return { type: "image", file };
  throw new Error(`Unsupported file type: .${ext}`);
}
