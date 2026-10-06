// Display formatting for catalog values.
//
// The product's truth rule lives here: a price the supplier never published
// formats as "Ask the supplier", and an unpublished MOQ or lead time as
// "Not published" — never a default, midpoint, or estimate. Every money and
// provenance string the UI shows goes through this module.

import type { ProductVM } from "./view-models";

// ─── Currency ────────────────────────────────────────────────────────────────

export type CurrencyCode = "USD" | "GBP" | "EUR" | "INR" | "CNY";

/**
 * The currency a price was published in. The capture records it inside the
 * price basis ("per pack of 10 boxes (GBP, inc. VAT)"); a basis without a
 * currency marker is a US-dollar listing. Prices are never converted for
 * display — a £ price is shown as £, with its code.
 */
export function priceCurrency(priceBasis: string | null): CurrencyCode {
  const basis = priceBasis ?? "";
  if (/\bGBP\b|£/.test(basis)) return "GBP";
  if (/\bEUR\b|€/.test(basis)) return "EUR";
  if (/\bINR\b|₹/.test(basis)) return "INR";
  if (/\bCNY\b|\bRMB\b|¥/.test(basis)) return "CNY";
  return "USD";
}

/**
 * Indicative rates used ONLY to order a mixed-currency result set by price.
 * They are never rendered as a price; the sort bar says so. Update them with
 * each capture batch.
 */
export const SORT_FX_TO_USD: Record<CurrencyCode, number> = {
  USD: 1,
  GBP: 1.3,
  EUR: 1.1,
  INR: 0.012,
  CNY: 0.14,
};

/** "$0.58" / "£8.52" — two decimals, thousands separators for whole units. */
export function formatMoney(value: number, currency: CurrencyCode = "USD"): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Per-unit money keeps a third decimal below 10¢, so "£0.015" never rounds to "£0.02". */
export function formatUnitMoney(value: number, currency: CurrencyCode = "USD"): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: value < 0.1 ? 3 : 2,
  });
}

// ─── Normalized per-unit price ───────────────────────────────────────────────

export interface UnitPrice {
  amount: number;
  currency: CurrencyCode;
  /** Singular noun the amount is per: "bottle", "bag", "unit". */
  unit: string;
  /** Units the published price covers (1 when priced each, 0 when unknown). */
  packSize: number;
}

const IRREGULAR_SINGULAR: Record<string, string> = {
  boxes: "box",
  pouches: "pouch",
  pcs: "piece",
};

function singular(noun: string): string {
  const n = noun.toLowerCase();
  return IRREGULAR_SINGULAR[n] ?? n.replace(/s$/, "");
}

const COUNT_NOUN =
  "(bags|boxes|bottles|jars|pieces|pcs|units|sheets|rolls|envelopes|stickers|pouches|tubes)";

/**
 * Pack size and unit noun from the published basis, e.g. "per case of 24
 * jars" → 24 jars, "per 1000 bags" → 1000 bags, "per 10-pack" → 10 units.
 * Null when the basis does not state how many units the price covers.
 */
export function packFromBasis(priceBasis: string | null): { size: number; unit: string } | null {
  if (!priceBasis) return null;
  const basis = priceBasis.replace(/(\d),(?=\d{3})/g, "$1");
  const patterns: RegExp[] = [
    new RegExp(`per (?:pack|case|bundle|carton|ream|bag) of (\\d+)(?: ${COUNT_NOUN})?`, "i"),
    new RegExp(`per (\\d+)(?:-pack|(?: ${COUNT_NOUN}))`, "i"),
    /per (\d+) at entry tier/i,
    /per order at the (\d+)-piece/i,
    new RegExp(`total for (\\d+)(?: ${COUNT_NOUN})?`, "i"),
    new RegExp(`(\\d+) ${COUNT_NOUN} at `, "i"),
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(basis);
    if (!match) continue;
    const size = Number(match[1]);
    if (!Number.isFinite(size) || size < 1) continue;
    return { size, unit: match[2] ? singular(match[2]) : "unit" };
  }
  return null;
}

const SINGLE_UNIT =
  /^per (?:custom |sample )?(bottle|jar|piece|box|pouch|bucket|roll|unit|tube|bag)\b/i;

/**
 * The comparable figure: what one unit costs, in the published currency.
 * Pack prices are divided by the pack size the supplier states; a supplied
 * per-unit figure is used when the basis gives no count; a price already
 * quoted per item stands as is. Null when the pack size is unknown — a
 * per-unit number is never guessed.
 */
export function unitPrice(
  p: Pick<ProductVM, "basePrice" | "priceBasis" | "priceUnit">,
): UnitPrice | null {
  if (p.basePrice === null) return null;
  const currency = priceCurrency(p.priceBasis);
  const pack = packFromBasis(p.priceBasis);
  if (pack) {
    return { amount: p.basePrice / pack.size, currency, unit: pack.unit, packSize: pack.size };
  }
  if (p.priceUnit !== null) {
    const unit = /per foot/i.test(p.priceBasis ?? "") ? "ft" : "unit";
    return { amount: p.priceUnit, currency, unit, packSize: 0 };
  }
  const single = SINGLE_UNIT.exec(p.priceBasis ?? "");
  if (single) return { amount: p.basePrice, currency, unit: single[1].toLowerCase(), packSize: 1 };
  return null;
}

/** The published basis without its bracketed notes: "per 1000 bags, ex. VAT". */
export function shortBasis(priceBasis: string | null): string | null {
  if (!priceBasis) return null;
  const short = priceBasis
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s*;.*$/, "")
    .replace(/\s+,/g, ",")
    .trim();
  return short.length > 0 ? short : null;
}

// ─── Capture age ─────────────────────────────────────────────────────────────

/** Captures older than this are flagged wherever the capture date shows. */
export const STALE_AFTER_DAYS = 14;

/** Whole UTC days between the capture and `now` (never negative). */
export function captureAgeDays(iso: string, now: Date = new Date()): number {
  const captured = new Date(iso);
  if (Number.isNaN(captured.getTime())) return 0;
  const day = 24 * 60 * 60 * 1000;
  const from = Date.UTC(captured.getUTCFullYear(), captured.getUTCMonth(), captured.getUTCDate());
  const to = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(0, Math.round((to - from) / day));
}

export function isStaleCapture(iso: string, now: Date = new Date()): boolean {
  return captureAgeDays(iso, now) > STALE_AFTER_DAYS;
}

/** UTC-stable "21 Sep 2026" — the capture date must not drift by timezone. */
export function formatCaptureDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown date";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * The per-item price used for the "lowest price per item" sort, in US dollars
 * at the indicative sort rates: the normalized unit price when the pack size
 * is known, otherwise the supplied per-unit figure, otherwise the base price.
 * Null prices sort last — a missing price is never "free".
 */
export function effectiveUnitPrice(p: {
  priceUnit: number | null;
  basePrice: number | null;
  priceBasis?: string | null;
}): number | null {
  const basis = p.priceBasis ?? null;
  const unit = unitPrice({ basePrice: p.basePrice, priceUnit: p.priceUnit, priceBasis: basis });
  const amount = unit?.amount ?? p.priceUnit ?? p.basePrice;
  if (amount === null) return null;
  return amount * SORT_FX_TO_USD[priceCurrency(basis)];
}

/** Price → basis line: "$5.61 per bucket (USD)" or "Ask the supplier". */
export function formatPriceLine(basePrice: number | null, priceBasis: string | null): string {
  if (basePrice === null) return "Ask the supplier";
  const money = formatMoney(basePrice, priceCurrency(priceBasis));
  return priceBasis ? `${money} ${priceBasis}` : money;
}

/** The per-unit figure shown next to the basis, e.g. "≈ $0.47 per unit". */
export function formatPerUnit(
  priceUnit: number | null,
  currency: CurrencyCode = "USD",
  unit = "unit",
): string | null {
  if (priceUnit === null) return null;
  return `≈ ${formatUnitMoney(priceUnit, currency)} per ${unit}`;
}

/** Shown, muted, for a commercial fact the supplier has not published. */
export const NOT_PUBLISHED = "Not published";

/** "1 piece" / "500 units" — MOQ line, or "Not published" when null. */
export function formatMoq(moq: number | null, moqUnit: string | null): string {
  if (moq === null) return NOT_PUBLISHED;
  const unit = moqUnit ?? "units";
  return `${moq.toLocaleString("en-US")} ${unit}`;
}

/** "14 days" / "Not published" for lead time. */
export function formatLeadTime(leadTimeDays: number | null): string {
  if (leadTimeDays === null) return NOT_PUBLISHED;
  return `${leadTimeDays} day${leadTimeDays === 1 ? "" : "s"}`;
}

/** Quantity-break range label: "1–249" / "1,000+" for an open top tier. */
export function formatBreakRange(minQty: number, maxQty: number | null): string {
  const min = minQty.toLocaleString("en-US");
  if (maxQty === null) return `${min}+`;
  return `${min}–${maxQty.toLocaleString("en-US")}`;
}

/** "From $0.39" badge for FROM price type; null for the others. */
export function priceTypeLabel(priceType: string): string {
  switch (priceType) {
    case "EXACT":
      return "Exact price";
    case "FROM":
      return "From price";
    case "CALCULATOR":
      return "Calculator quote";
    case "QUOTE_ONLY":
      return "Quote only";
    default:
      return priceType;
  }
}

/** Human tier names for supplier status badges. */
export function supplierStatusLabel(status: string): string {
  switch (status) {
    case "RECOMMENDED":
      return "Recommended";
    case "LISTED":
      return "Listed";
    case "QUOTE_ONLY":
      return "Quote only";
    case "PENDING":
      return "Pending verification";
    case "DISABLED":
      return "Disabled";
    default:
      return status;
  }
}
