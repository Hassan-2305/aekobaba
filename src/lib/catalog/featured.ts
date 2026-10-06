import type { ProductVM } from "./view-models";

// Featured rail selection for Home.
//
// "Verified suppliers first" is the ordering rule (spec: featured rail shows
// real catalog depth): the admin-assigned tier ranks RECOMMENDED above LISTED,
// and unverified states (QUOTE_ONLY, PENDING, DISABLED) rank last. Within a
// tier, better-reviewed suppliers lead. Categories then interleave — one
// product per category per round — so the rail shows the breadth of the
// catalog instead of running one deep category end to end.
//
// Pure function: same products, same cap, same output — no clock, no randomness.

export const STATUS_RANK: Record<ProductVM["supplier"]["status"], number> = {
  RECOMMENDED: 0,
  LISTED: 1,
  QUOTE_ONLY: 2,
  PENDING: 3,
  DISABLED: 4,
};

/**
 * Pick the featured products: verified-first ordering, spread across
 * categories, capped. Deterministic — ties break on review count, then id —
 * so the rail is stable across renders and runs.
 */
/**
 * One card per picture: generated packshots are per-category archetypes, so
 * two listings in the same category can share an image. A rail where the
 * same placeholder repeats makes the catalog look thinner than it is — keep
 * the first listing per image URL (listings without an image pass through).
 */
export function distinctImages(products: ProductVM[]): ProductVM[] {
  const seen = new Set<string>();
  return products.filter((p) => {
    const url = p.primaryImage?.url;
    if (!url) return true;
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

/**
 * The "live listing" example on Home: the listing that best proves the
 * receipt claim — a published price AND minimum order, an image, from a
 * verified (non-partner, so it is not a third appearance of the spotlight)
 * supplier, freshest capture first. Falls back to any priced listing.
 */
export function selectSpecimen(products: ProductVM[], excludeSupplier?: string): ProductVM | null {
  const pool = products.filter(
    (p) => p.supplier.slug !== excludeSupplier && p.basePrice !== null && p.primaryImage !== null,
  );
  const ranked = [...pool].sort((a, b) => {
    const complete = (p: ProductVM) =>
      Number(p.moq !== null) + Number(p.leadTimeDays !== null) + Number(p.quantityBreaks.length > 0);
    const byComplete = complete(b) - complete(a);
    if (byComplete !== 0) return byComplete;
    const byStatus = STATUS_RANK[a.supplier.status] - STATUS_RANK[b.supplier.status];
    if (byStatus !== 0) return byStatus;
    const byFresh = b.sourceCapturedAt.localeCompare(a.sourceCapturedAt);
    if (byFresh !== 0) return byFresh;
    return a.id.localeCompare(b.id);
  });
  return ranked[0] ?? null;
}

export function selectFeaturedProducts(products: ProductVM[], cap: number): ProductVM[] {
  const ranked = [...products].sort((a, b) => {
    // Featured partners lead the rail (signed-up suppliers get first placement).
    const byPartner = Number(b.supplier.isPartner) - Number(a.supplier.isPartner);
    if (byPartner !== 0) return byPartner;
    const byStatus = STATUS_RANK[a.supplier.status] - STATUS_RANK[b.supplier.status];
    if (byStatus !== 0) return byStatus;
    const byScore = (b.supplier.reviewScore ?? -1) - (a.supplier.reviewScore ?? -1);
    if (byScore !== 0) return byScore;
    if (a.supplier.reviewCount !== b.supplier.reviewCount) {
      return b.supplier.reviewCount - a.supplier.reviewCount;
    }
    return a.id.localeCompare(b.id);
  });

  // Group by category, preserving the ranked order within each group. Map
  // insertion order keeps groups in best-rank-first order for interleaving.
  const groups = new Map<string, ProductVM[]>();
  for (const product of ranked) {
    const group = groups.get(product.categorySlug) ?? [];
    group.push(product);
    groups.set(product.categorySlug, group);
  }

  const featured: ProductVM[] = [];
  while (featured.length < cap) {
    let picked = false;
    for (const group of groups.values()) {
      if (featured.length >= cap) break;
      const next = group.shift();
      if (next) {
        featured.push(next);
        picked = true;
      }
    }
    if (!picked) break;
  }
  return featured;
}
