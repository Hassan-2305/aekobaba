import { HomeLanding } from "@/components/home/home-landing";
import { selectFeaturedProducts } from "@/lib/catalog/featured";
import { LEAD_PARTNER_SLUG, partnerProfile, varietyOrder } from "@/lib/catalog/partners";
import { FEATURED_PRODUCT_CAP, getAllProducts, getCategories } from "@/lib/catalog/queries";

// Home page: thin data wrapper. The layout and rendering live in
// src/components/home/home-landing.tsx (presentational, test-covered);
// this file owns the queries and request-time rendering.
//
// One catalog pass feeds both the featured rail and the supplier count shown
// in the hero rail — no extra round-trips.
//
// Popular tiles are material categories only (user review: no use-case
// entries in navigation — PR #9).

// Catalog pages render at request time — the build must never need a database.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categories, products] = await Promise.all([getCategories(), getAllProducts()]);
  const featured = selectFeaturedProducts(products, FEATURED_PRODUCT_CAP);
  const supplierCount = new Set(products.map((p) => p.supplier.slug)).size;

  // The lead featured partner opens the page right after the hero.
  const profile = partnerProfile(LEAD_PARTNER_SLUG);
  const partnerProducts = varietyOrder(
    products.filter((p) => p.supplier.slug === LEAD_PARTNER_SLUG && p.primaryImage),
  );
  const partner =
    profile && partnerProducts.length > 0 ? { profile, products: partnerProducts } : null;

  return (
    <HomeLanding
      categories={categories}
      featured={featured}
      supplierCount={supplierCount}
      partner={partner}
    />
  );
}
