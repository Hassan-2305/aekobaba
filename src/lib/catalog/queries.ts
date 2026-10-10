import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { cache } from "react";

import { db } from "@/lib/db";
import { CATALOG_REVALIDATE_SECONDS, CATALOG_TAG } from "./cache";
import type { CategoryVM, ProductVM, ReviewVM, SupplierDetailVM } from "./view-models";
import { toProductVM } from "./view-models";
import { selectFeaturedProducts } from "./featured";

// Server-side catalog loaders. Pages call these; components never do.
//
// Speed: the catalog changes only when it is reseeded or an admin edits it,
// so every loader is cached across requests (Next data cache, tag
// "catalog", refreshed every CATALOG_REVALIDATE_SECONDS) and de-duplicated
// within a request (React cache — metadata and page share one result).
// Admin mutations call revalidateCatalog() so their edits show at once.
// Cached values are plain JSON: every view model here is serializable.
//
// The demo catalog is small (70 products), so the Results page loads the full
// product list once per request and filters in memory — that keeps facet
// counts and sorts pure and testable. When the catalog outgrows this, these
// are the only functions that change.

const productInclude = {
  supplier: {
    include: {
      reviews: { orderBy: [{ reviewedAt: "desc" }] },
      certifications: { orderBy: { name: "asc" } },
    },
  },
  category: true,
  quantityBreaks: { orderBy: { minQty: "asc" } },
  // Lowest sortOrder first — the seed writes exactly one primary image per
  // product, so the first row is the card/detail image.
  images: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.ProductInclude;

const cached = <A extends unknown[], R>(fn: (...args: A) => Promise<R>, key: string) =>
  cache(
    unstable_cache(fn, [key], { tags: [CATALOG_TAG], revalidate: CATALOG_REVALIDATE_SECONDS }),
  );

/** Listings of suppliers removed from the catalog (status DISABLED) never show. */
const LIVE_SUPPLIER = { supplier: { status: { not: "DISABLED" as const } } };

export const getAllProducts = cached(async (): Promise<ProductVM[]> => {
  const rows = await db.product.findMany({
    where: LIVE_SUPPLIER,
    include: productInclude,
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => toProductVM(row));
}, "catalog:all-products");

/** One product — served from the cached catalog, no extra round-trip. */
export const getProduct = cache(async (id: string): Promise<ProductVM | null> => {
  const products = await getAllProducts();
  return products.find((p) => p.id === id) ?? null;
});

export const getCategories = cached(async (): Promise<CategoryVM[]> => {
  const rows = await db.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: { where: LIVE_SUPPLIER } } } },
  });
  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    description: row.description,
    productCount: row._count.products,
  }));
}, "catalog:categories");

/** Rail size for the home featured section. */
export const FEATURED_PRODUCT_CAP = 10;

/**
 * Featured products for the home rail: one pass over the catalog, then the
 * pure verified-first / category-spread selection — no extra round-trips.
 */
export async function getFeaturedProducts(
  cap: number = FEATURED_PRODUCT_CAP,
): Promise<ProductVM[]> {
  const products = await getAllProducts();
  return selectFeaturedProducts(products, cap);
}

export interface SupplierWithCatalog extends SupplierDetailVM {
  products: ProductVM[];
}

export const getSupplier = cached(loadSupplier, "catalog:supplier");

async function loadSupplier(slug: string): Promise<SupplierWithCatalog | null> {
  const row = await db.supplier.findUnique({
    where: { slug },
    include: {
      reviews: { orderBy: { reviewedAt: "desc" } },
      certifications: { orderBy: { name: "asc" } },
      products: {
        include: {
          category: true,
          quantityBreaks: { orderBy: { minQty: "asc" } },
          images: { orderBy: { sortOrder: "asc" } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!row || row.status === "DISABLED") return null;

  const reviews: ReviewVM[] = row.reviews.map((r) => ({
    score: r.score,
    sourcePlatform: r.sourcePlatform,
    reviewedAt: r.reviewedAt.toISOString(),
    sourceUrl: r.sourceUrl,
    sourceCapturedAt: r.sourceCapturedAt.toISOString(),
    summary: r.summary,
  }));

  const supplierSummary = {
    slug: row.slug,
    name: row.name,
    website: row.website,
    location: row.location,
    status: row.status,
    reviewScore: row.reviewScore,
    reviewCount: row.reviewCount,
    legalIdentity: row.legalIdentity,
    isPartner: row.isPartner,
    reviews: row.reviews.map((r) => ({ sourcePlatform: r.sourcePlatform, sourceUrl: r.sourceUrl })),
    certifications: row.certifications.map((c) => ({ name: c.name })),
  };

  const detail: SupplierWithCatalog = {
    slug: row.slug,
    name: row.name,
    website: row.website,
    location: row.location,
    status: row.status,
    reviewScore: row.reviewScore,
    reviewCount: row.reviewCount,
    reviewPlatform: row.reviews[0]?.sourcePlatform ?? null,
    reviewUrl: row.reviews[0]?.sourceUrl ?? null,
    legalIdentity: row.legalIdentity,
    isPartner: row.isPartner,
    lastVerifiedAt: row.lastVerifiedAt ? row.lastVerifiedAt.toISOString() : null,
    reviews,
    certifications: row.certifications.map((c) => ({
      name: c.name,
      sourceUrl: c.sourceUrl,
      sourceCapturedAt: c.sourceCapturedAt.toISOString(),
    })),
    products: row.products.map((p) => toProductVM({ ...p, supplier: supplierSummary })),
  };
  return detail;
}
