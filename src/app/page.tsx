import { HomeLanding } from "@/components/home/home-landing";
import { distinctImages, selectFeaturedProducts, selectSpecimen } from "@/lib/catalog/featured";
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

/** Partner listings that open the home product rail. */
const PARTNER_RAIL_SLOTS = 6;

export default async function HomePage() {
  const [categories, products] = await Promise.all([getCategories(), getAllProducts()]);
  const supplierCount = new Set(products.map((p) => p.supplier.slug)).size;

  // The lead featured partner opens the page right after the hero.
  const profile = partnerProfile(LEAD_PARTNER_SLUG);
  const partnerProducts = varietyOrder(
    products.filter((p) => p.supplier.slug === LEAD_PARTNER_SLUG && p.primaryImage),
  );
  const partner =
    profile && partnerProducts.length > 0 ? { profile, products: partnerProducts } : null;

  // The product rail opens with the partner's listings (ribboned, sponsored),
  // then the best of everyone else. The "live listing" example stays a
  // non-partner record so the receipt claim is shown on a neutral listing.
  const others = partner
    ? products.filter((p) => p.supplier.slug !== LEAD_PARTNER_SLUG)
    : products;
  const specimen = selectSpecimen(others);
  const specimenImage = specimen?.primaryImage?.url ?? null;
  const pool = others.filter(
    (p) => p.id !== specimen?.id && (specimenImage === null || p.primaryImage?.url !== specimenImage),
  );
  const partnerLead = partner ? partnerProducts.slice(0, PARTNER_RAIL_SLOTS) : [];
  const featured = [
    ...partnerLead,
    ...distinctImages(selectFeaturedProducts(pool, pool.length)).slice(0, FEATURED_PRODUCT_CAP),
  ];

  return (
    <HomeLanding
      categories={categories}
      featured={featured}
      supplierCount={supplierCount}
      partner={partner}
      specimen={specimen}
    />
  );
}
