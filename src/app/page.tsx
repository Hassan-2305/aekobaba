import { HomeLanding } from "@/components/home/home-landing";
import { LEAD_PARTNER_SLUG, partnerProfile, varietyOrder } from "@/lib/catalog/partners";
import { getAllProducts, getCategories } from "@/lib/catalog/queries";

// Home page: thin data wrapper. The layout and rendering live in
// src/components/home/home-landing.tsx (presentational, test-covered); this
// file owns the queries — one cached catalog pass feeds every section.

// Catalog pages render at request time — the build must never need a database.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categories, products] = await Promise.all([getCategories(), getAllProducts()]);

  // The lead partner's spotlight (sponsored, labelled), one product per type first.
  const profile = partnerProfile(LEAD_PARTNER_SLUG);
  const partnerProducts = varietyOrder(
    products.filter((p) => p.supplier.slug === LEAD_PARTNER_SLUG && p.primaryImage),
  );
  const partner =
    profile && partnerProducts.length > 0 ? { profile, products: partnerProducts } : null;

  return <HomeLanding categories={categories} products={products} partner={partner} />;
}
