// Product-page relations: variants of the same product from the same
// supplier, similar products from other suppliers, and the published price
// that applies at a chosen quantity. Pure functions over view models.

import { partnerFirst } from "./partners";
import { unitPrice, type CurrencyCode } from "./format";
import type { ProductVM } from "./view-models";

export interface VariantVM {
  id: string;
  /** What distinguishes it: capacity, the bracketed option, the SKU. */
  label: string;
  sku: string | null;
  active: boolean;
}

/** "8 oz … Bottles (Yellow Flip Top Cap) — 3351B09" → { option: "Yellow Flip Top Cap", sku: "3351B09" } */
function titleParts(title: string): { option: string | null; sku: string | null } {
  const dash = title.split(" — ");
  const last = dash.length > 1 ? dash[dash.length - 1] : null;
  const sku = last && /^(?:SKU\s)?[A-Z0-9][A-Z0-9-]{3,}$/.test(last) ? last.replace(/^SKU\s/, "") : null;
  const paren = /\(([^)]+)\)/.exec(title)?.[1] ?? null;
  return { option: paren, sku };
}

/**
 * Variants: the same supplier's listings of the same product type
 * (category + subtype) — sizes, cap options, colours. Sorted by capacity,
 * then title, so a size ladder reads small to large.
 */
export function variantsOf(product: ProductVM, all: ProductVM[]): VariantVM[] {
  if (!product.subcategory) return [];
  const family = all.filter(
    (p) =>
      p.supplier.slug === product.supplier.slug &&
      p.categorySlug === product.categorySlug &&
      p.subcategory === product.subcategory,
  );
  if (family.length < 2) return [];
  return family
    .sort(
      (a, b) =>
        (a.specs.capacity?.value ?? 0) - (b.specs.capacity?.value ?? 0) || a.title.localeCompare(b.title),
    )
    .map((p) => {
      const { option, sku } = titleParts(p.title);
      const parts = [p.specs.capacity?.label.split(" (")[0], option].filter(Boolean);
      return {
        id: p.id,
        label: parts.length > 0 ? parts.join(" · ") : p.title,
        sku,
        active: p.id === product.id,
      };
    });
}

/**
 * Similar products from other suppliers: same category, ranked by closeness
 * (same subtype, then nearest capacity / size), partners first.
 */
export function similarProducts(product: ProductVM, all: ProductVM[], limit = 4): ProductVM[] {
  const scale = (p: ProductVM) => p.specs.capacity?.value ?? p.specs.dimensions?.value ?? null;
  const target = scale(product);
  const candidates = all.filter(
    (p) => p.categorySlug === product.categorySlug && p.supplier.slug !== product.supplier.slug,
  );
  const ranked = [...candidates].sort((a, b) => {
    const bySub = Number(b.subcategory === product.subcategory) - Number(a.subcategory === product.subcategory);
    if (bySub !== 0) return bySub;
    if (target !== null) {
      const da = scale(a) === null ? Infinity : Math.abs(Math.log(scale(a)! / target));
      const db = scale(b) === null ? Infinity : Math.abs(Math.log(scale(b)! / target));
      if (da !== db) return da - db;
    }
    return Number(b.basePrice !== null) - Number(a.basePrice !== null) || a.title.localeCompare(b.title);
  });
  return partnerFirst(ranked.slice(0, limit));
}

export interface QuantityQuote {
  /** Price per unit at this quantity, in the published currency. */
  perUnit: number;
  currency: CurrencyCode;
  unit: string;
  /** perUnit × quantity. */
  total: number;
  /** Which published figure was used. */
  basis: "tier" | "list";
  tierLabel: string | null;
}

/**
 * The published price that applies at `quantity` units. Quantity breaks are
 * used when the listing is priced per item (their unit matches the
 * quantity); otherwise the normalized per-unit list price. Null without a
 * published price. Always an estimate — the supplier's quote is final.
 */
export function priceAtQuantity(product: ProductVM, quantity: number): QuantityQuote | null {
  const unit = unitPrice(product);
  if (!unit || quantity <= 0) return null;
  let perUnit = unit.amount;
  let basis: QuantityQuote["basis"] = "list";
  let tierLabel: string | null = null;
  if (unit.packSize === 1 && product.quantityBreaks.length > 0) {
    const tier = [...product.quantityBreaks]
      .reverse()
      .find((b) => quantity >= b.minQty && (b.maxQty === null || quantity <= b.maxQty));
    if (tier) {
      perUnit = tier.unitPrice;
      basis = "tier";
      tierLabel = tier.maxQty === null ? `${tier.minQty}+` : `${tier.minQty}–${tier.maxQty}`;
    }
  }
  return { perUnit, currency: unit.currency, unit: unit.unit, total: perUnit * quantity, basis, tierLabel };
}

/** Sensible starting quantity: the published MOQ, else the first tier, else 1. */
export function defaultQuantity(product: ProductVM): number {
  return product.moq ?? product.quantityBreaks[0]?.minQty ?? 1;
}
