// Sizes inside one listing (the product-page size picker). Pure helpers over
// view models, shared by the picker, the Quote Basket and the quote request.

import type { ProductSizeVM, ProductVM } from "./view-models";

/** The listing's sizes, smallest first; empty for single-size products. */
export function sizesOf(product: Pick<ProductVM, "sizes">): ProductSizeVM[] {
  return product.sizes ?? [];
}

/** The size with this label, or null when the listing has no such size. */
export function findSize(product: Pick<ProductVM, "sizes">, label: string | null | undefined): ProductSizeVM | null {
  if (!label) return null;
  return sizesOf(product).find((size) => size.label === label) ?? null;
}

/** The minimum order for a chosen size: the size's own MOQ when published, else the listing's. */
export function sizeMoq(
  product: Pick<ProductVM, "sizes" | "moq" | "moqUnit">,
  label: string | null | undefined,
): { moq: number | null; moqUnit: string | null } {
  const size = findSize(product, label);
  if (size?.moq != null) return { moq: size.moq, moqUnit: size.moqUnit ?? product.moqUnit };
  return { moq: product.moq, moqUnit: product.moqUnit };
}

/** "Size: 750 ml (QY-SB750-K)" — the line a quote request carries for the supplier. */
export function sizeLine(product: Pick<ProductVM, "sizes">, label: string | null | undefined): string | null {
  if (!label) return null;
  const sku = findSize(product, label)?.sku;
  return `Size: ${label}${sku ? ` (${sku})` : ""}`;
}

/** Spec notes sent with a basket line: the chosen size first, then the buyer's own notes. */
export function lineSpecNotes(
  product: Pick<ProductVM, "sizes">,
  size: string | null | undefined,
  notes: string | undefined,
): string | undefined {
  const parts = [sizeLine(product, size), notes?.trim() || null].filter(Boolean);
  return parts.length ? parts.join("; ").slice(0, 1000) : undefined;
}

/** The spec names used across a listing's sizes, in first-seen order — the sizes table's columns. */
export function sizeSpecColumns(sizes: ProductSizeVM[]): string[] {
  const out: string[] = [];
  for (const size of sizes) for (const row of size.specs) if (!out.includes(row.name)) out.push(row.name);
  return out;
}

/** True when at least one size carries its own published price. */
export function hasSizePrices(product: Pick<ProductVM, "sizes">): boolean {
  return sizesOf(product).some((size) => size.basePrice != null);
}

/**
 * The listing priced as one of its sizes: when the size publishes its own
 * price and tiers, those replace the listing-level figures (which, for a
 * listing priced per size, are only the lowest "from" price). Unpriced sizes
 * and single-size listings return the product unchanged.
 */
export function pricedAsSize(product: ProductVM, label: string | null | undefined): ProductVM {
  const size = findSize(product, label);
  if (!size || size.basePrice == null) return product;
  return {
    ...product,
    priceType: "EXACT",
    basePrice: size.basePrice,
    priceMax: null,
    quantityBreaks: size.quantityBreaks ?? [],
    moq: size.moq ?? product.moq,
    moqUnit: size.moq != null ? (size.moqUnit ?? product.moqUnit) : product.moqUnit,
  };
}
