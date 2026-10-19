// Side-by-side comparison rows (v12 design). Pure: products in, rows out.
//
// Rules from the design:
//  - Units are standardised (per-unit price, price per 100 ml where capacity
//    is stated) and the lowest price is highlighted ONLY among products with
//    the same unit and currency — never across £ and $, never against a
//    from-price.
//  - Anything a supplier hasn't published is marked missing, never zero, and
//    becomes a question in the quote request.

import {
  captureAgeDays,
  formatCaptureDate,
  formatLeadTime,
  formatMoney,
  formatMoqShort,
  formatUnitMoney,
  priceCurrency,
  shortBasis,
  unitPrice,
} from "@/lib/catalog/format";
import type { ProductVM } from "@/lib/catalog/view-models";

export interface CompareCell {
  value: string;
  sub: string | null;
  missing: boolean;
  /** Lowest in its unit + currency group. */
  lowest: boolean;
}

export interface CompareRow {
  key: string;
  label: string;
  cells: CompareCell[];
  /** Values differ across the compared products. */
  differs: boolean;
  /** Shown with a special "missing" wording instead of "Not published". */
  missingLabel?: string;
}

const cell = (value: string, sub: string | null = null, lowest = false): CompareCell => ({
  value,
  sub,
  missing: false,
  lowest,
});
const miss = (value = "Not published", sub: string | null = "Asked in your quote"): CompareCell => ({
  value,
  sub,
  missing: true,
  lowest: false,
});

function lowestIds(products: ProductVM[], value: (p: ProductVM) => number | null, group: (p: ProductVM) => string): Set<string> {
  const out = new Set<string>();
  const groups = new Map<string, ProductVM[]>();
  for (const p of products) {
    if (value(p) === null || p.priceType === "FROM") continue;
    const g = group(p);
    groups.set(g, [...(groups.get(g) ?? []), p]);
  }
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    const lo = Math.min(...members.map((p) => value(p)!));
    for (const p of members) if (value(p) === lo) out.add(p.id);
  }
  return out;
}

export function compareRows(products: ProductVM[], now: Date = new Date()): CompareRow[] {
  const unit = (p: ProductVM) => unitPrice(p);
  const cur = (p: ProductVM) => priceCurrency(p.priceBasis);
  const ml = (p: ProductVM) => p.specs.capacity?.value ?? null;
  const per100 = (p: ProductVM) => {
    const u = unit(p);
    const m = ml(p);
    return u && m ? (u.amount / m) * 100 : null;
  };
  const lowUnit = lowestIds(products, (p) => unit(p)?.amount ?? null, (p) => `${unit(p)?.unit}|${cur(p)}`);
  const low100 = lowestIds(products, per100, (p) => cur(p));

  const rows: CompareRow[] = [
    {
      key: "unit-price",
      label: "Unit price",
      cells: products.map((p) => {
        const u = unit(p);
        if (!u || p.basePrice === null) return miss("Ask the supplier", "No published price");
        return cell(
          `${formatUnitMoney(u.amount, u.currency)} / ${u.unit}`,
          `${u.currency}${p.priceType === "FROM" ? " · from-price" : ""}`,
          lowUnit.has(p.id),
        );
      }),
      differs: false,
    },
    {
      key: "per-100ml",
      label: "Per 100 ml",
      cells: products.map((p) => {
        const v = per100(p);
        if (v === null) return ml(p) === null ? cell("Not applicable") : miss();
        return cell(formatUnitMoney(v, cur(p)), "Standardised", low100.has(p.id));
      }),
      differs: false,
    },
    {
      key: "pack-price",
      label: "Pack price",
      cells: products.map((p) => {
        const u = unit(p);
        if (p.basePrice === null) return miss();
        if (u && u.packSize === 1) return cell("Sold individually");
        return cell(`${formatMoney(p.basePrice, cur(p))} ${shortBasis(p.priceBasis) ?? ""}`.trim());
      }),
      differs: false,
    },
    {
      key: "moq",
      label: "MOQ",
      cells: products.map((p) => (p.moq === null ? miss() : cell(formatMoqShort(p.moq, p.moqUnit)))),
      differs: false,
    },
    {
      key: "size",
      label: "Volume / size",
      cells: products.map((p) => {
        const s = p.specs.capacity?.label ?? p.specs.dimensions?.label ?? null;
        return s ? cell(s) : miss();
      }),
      differs: false,
    },
    { key: "material", label: "Material", cells: products.map((p) => cell(p.material)), differs: false },
    {
      key: "lead",
      label: "Lead time",
      cells: products.map((p) =>
        p.leadTimeDays !== null ? cell(formatLeadTime(p.leadTimeDays)) : p.specs.leadNote ? cell(p.specs.leadNote) : miss(),
      ),
      differs: false,
    },
    {
      key: "printing",
      label: "Printing",
      cells: products.map((p) => {
        const opts = [...new Set([...p.specs.printing, ...p.specs.customization])];
        return opts.length ? cell(opts.join(", ")) : miss("Not published", "Cost not included");
      }),
      differs: false,
    },
    {
      key: "shipping",
      label: "Shipping",
      cells: products.map(() => miss("Not included", "Quoted by supplier")),
      differs: false,
    },
    {
      key: "type",
      label: "Type",
      cells: products.map((p) => cell(p.stockOrCustom === "STOCK" ? "Stock item" : "Custom printed")),
      differs: false,
    },
    {
      key: "supplier",
      label: "Supplier",
      cells: products.map((p) =>
        cell(
          p.supplier.name,
          p.supplier.reviewScore !== null
            ? `★ ${p.supplier.reviewScore.toFixed(1)} (${p.supplier.reviewCount.toLocaleString("en-US")})${p.supplier.reviewPlatform ? ` · ${p.supplier.reviewPlatform}` : ""}`
            : "No published rating",
        ),
      ),
      differs: false,
    },
    {
      key: "checked",
      label: "Price checked",
      cells: products.map((p) =>
        cell(formatCaptureDate(p.sourceCapturedAt), `${captureAgeDays(p.sourceCapturedAt, now)} days ago`),
      ),
      differs: false,
    },
  ];

  return rows.map((r) => {
    const values = r.cells.map((c) => c.value);
    return { ...r, differs: products.length > 1 && new Set(values).size > 1 };
  });
}

/** Number of unpublished values per product (the "3 missing" badge). */
export function missingCount(rows: CompareRow[], index: number): number {
  return rows.filter((r) => r.key !== "shipping" && r.cells[index]?.missing).length;
}
