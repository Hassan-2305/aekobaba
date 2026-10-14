// The downloadable specification sheet: one ordered list of label → value
// rows, used by the printable page (/products/[id]/spec) and the CSV
// (/products/[id]/spec.csv). Values are exactly what the product page shows.

import {
  formatCaptureDate,
  formatLeadTime,
  formatMoney,
  formatMoq,
  formatPriceLine,
  NOT_PUBLISHED,
  priceCurrency,
} from "./format";
import { isFoodGrade } from "./tags";
import type { ProductVM } from "./view-models";

export function specSheetRows(p: ProductVM): [string, string][] {
  const s = p.specs;
  const currency = priceCurrency(p.priceBasis);
  const rows: [string, string | null][] = [
    ["Product", p.title],
    ["Supplier", p.supplier.name],
    ["Supplier location", p.supplier.location],
    ["Category", p.subcategory ? `${p.categoryName} / ${p.subcategory}` : p.categoryName],
    ["Material", p.material],
    ["Capacity", s.capacity?.label ?? null],
    ["Dimensions", s.dimensions?.label ?? null],
    ["Thickness", s.thickness?.label ?? null],
    ["Neck finish", s.neckFinish],
    ["Closure", s.closures.join(", ") || null],
    ["Colour & finish", s.finishes.join(", ") || null],
    ["Wall / flute", s.wall],
    ["Board strength", s.strength],
    ["Type", p.stockOrCustom === "STOCK" ? "Stock item" : "Custom manufacture"],
    ["Food contact", isFoodGrade(p) ? "Food grade / food contact (supplier's wording)" : NOT_PUBLISHED],
    ["Certifications", p.certificationNames.join(", ") || null],
    ["Price", formatPriceLine(p.basePrice, p.priceBasis)],
    ...p.quantityBreaks.map(
      (b): [string, string] => [
        `Price tier ${b.maxQty === null ? `${b.minQty}+` : `${b.minQty}–${b.maxQty}`}`,
        formatMoney(b.unitPrice, currency),
      ],
    ),
    ["Minimum order", formatMoq(p.moq, p.moqUnit)],
    ["Setup / tooling", s.setupNote ?? NOT_PUBLISHED],
    ["Production lead time", p.leadTimeDays !== null ? formatLeadTime(p.leadTimeDays) : (s.leadNote ?? NOT_PUBLISHED)],
    ["Samples", p.samplePolicyVerified ? "Available (published sample policy)" : NOT_PUBLISHED],
    ["Sample cost", s.sampleNote ?? NOT_PUBLISHED],
    ["Printing & customization", [...new Set([...s.customization, ...s.printing])].join(", ") || NOT_PUBLISHED],
    ["Price last updated", formatCaptureDate(p.sourceCapturedAt)],
    ["Source", p.sourceUrl],
  ];
  return rows.filter((r): r is [string, string] => r[1] !== null && r[1] !== "");
}

/** RFC 4180 CSV: every field quoted, quotes doubled. */
export function specSheetCsv(p: ProductVM): string {
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return ["Field,Value", ...specSheetRows(p).map(([k, v]) => `${q(k)},${q(v)}`)].join("\r\n") + "\r\n";
}
