/**
 * Currency formatter — amounts are stored as minor units (pesewas for GHS).
 * e.g. 100000 → "GH₵ 1,000.00"
 */
export function fmt(minorUnits, currency = "GHS") {
  if (minorUnits == null) return "—";
  const value = minorUnits / 100;
  const locales = {
    GHS: "en-GH", NGN: "en-NG", KES: "en-KE",
    ZAR: "en-ZA", USD: "en-US", GBP: "en-GB", EUR: "en-DE",
  };
  const symbols = {
    GHS: "GH₵", NGN: "₦", KES: "KSh",
    ZAR: "R",   USD: "$",  GBP: "£", EUR: "€",
  };
  const locale = locales[currency] ?? "en-GH";
  const symbol = symbols[currency] ?? currency;
  const formatted = value.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol} ${formatted}`;
}

/** Compact version: GH₵ 1.2M, GH₵ 45K */
export function fmtCompact(minorUnits, currency = "GHS") {
  if (minorUnits == null) return "—";
  const value = minorUnits / 100;
  const symbols = { GHS: "GH₵", NGN: "₦", KES: "KSh", ZAR: "R", USD: "$", GBP: "£", EUR: "€" };
  const sym = symbols[currency] ?? currency;
  if (value >= 1_000_000) return `${sym} ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `${sym} ${(value / 1_000).toFixed(1)}K`;
  return `${sym} ${value.toFixed(2)}`;
}

/** Date → "Apr 14, 2026" */
export function fmtDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GH", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

/** Date → "Apr 2026" */
export function fmtMonth(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GH", { month: "short", year: "numeric" });
}
