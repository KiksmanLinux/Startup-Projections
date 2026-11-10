export const CURRENCIES = [
  { code: "USD", label: "USD · US dollar", locale: "en-US", symbol: "$" },
  { code: "EUR", label: "EUR · Euro", locale: "de-DE", symbol: "€" },
  { code: "GBP", label: "GBP · Pound", locale: "en-GB", symbol: "£" },
  { code: "NOK", label: "NOK · Norwegian krone", locale: "nb-NO", symbol: "kr " },
  { code: "SEK", label: "SEK · Swedish krona", locale: "sv-SE", symbol: "kr " },
  { code: "DKK", label: "DKK · Danish krone", locale: "da-DK", symbol: "kr " },
];

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code);

const currencyFor = (code) => CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];

const safe = (value) => (Number.isFinite(value) ? value : 0);

const trim = (n, digits = 1) => {
  const rounded = Number(n.toFixed(digits));
  return String(rounded);
};

/** Signed compact money, e.g. -$1.2M, $840K, kr 12K. */
export function money(value, currency = "USD", { compact = false, decimals = 0 } = {}) {
  const n = safe(value);
  const { symbol, locale } = currencyFor(currency);
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);

  if (compact) {
    if (abs >= 1e9) return `${sign}${symbol}${trim(abs / 1e9)}B`;
    if (abs >= 1e6) return `${sign}${symbol}${trim(abs / 1e6)}M`;
    if (abs >= 1e4) return `${sign}${symbol}${Math.round(abs / 1e3)}K`;
    return `${sign}${symbol}${Math.round(abs)}`;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyFor(currency).code,
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    }).format(n);
  } catch {
    return `${sign}${symbol}${Math.round(abs)}`;
  }
}

/** Inputs need exact, unambiguous values — never compacted. */
export function amount(value, currency = "USD") {
  return money(value, currency, { compact: false, decimals: 0 });
}

export function percent(value, digits = 1) {
  return `${(safe(value) * 100).toFixed(digits)}%`;
}

export function signedPercent(value, digits = 1) {
  const n = safe(value);
  return `${n > 0 ? "+" : ""}${(n * 100).toFixed(digits)}%`;
}

export function count(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(safe(value));
}

export function months(value) {
  if (value === null || value === undefined) return "—";
  return value === 1 ? "1 month" : `${count(value)} months`;
}

export function formatFieldValue(value, unit, currency = "USD") {
  switch (unit) {
    case "percent":
      return percent(value, Number.isInteger(value * 1000) ? 0 : 1);
    case "count":
      return count(value);
    case "days":
      return `${count(value)} days`;
    case "money":
      return amount(value, currency);
    default:
      return String(value);
  }
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function monthLabel(startDate, index) {
  const start = new Date(`${startDate || "2026-01-01"}T00:00:00Z`);
  const base = Number.isNaN(start.getTime()) ? new Date(Date.UTC(2026, 0, 1)) : start;
  const date = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + index, 1));
  return `${MONTH_NAMES[date.getUTCMonth()]} ${String(date.getUTCFullYear()).slice(2)}`;
}

export function monthLongLabel(startDate, index) {
  const start = new Date(`${startDate || "2026-01-01"}T00:00:00Z`);
  const base = Number.isNaN(start.getTime()) ? new Date(Date.UTC(2026, 0, 1)) : start;
  const date = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + index, 1));
  return `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function yearLabel(startDate, index) {
  const start = new Date(`${startDate || "2026-01-01"}T00:00:00Z`);
  const base = Number.isNaN(start.getTime()) ? new Date(Date.UTC(2026, 0, 1)) : start;
  return `Y${index + 1} · ${base.getUTCFullYear() + index}`;
}
