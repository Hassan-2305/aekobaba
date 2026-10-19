import { redirect } from "next/navigation";

import { HomeLanding } from "@/components/home/home-landing";
import { getCurrentUserRole, getServerSessionUser } from "@/lib/auth/session";
import { LEAD_PARTNER_SLUG, partnerProfile, varietyOrder } from "@/lib/catalog/partners";
import { getAllProducts, getCategories } from "@/lib/catalog/queries";

// Home page: thin data wrapper. The layout and rendering live in
// src/components/home/home-landing.tsx (presentational, test-covered); this
// file owns the queries — one cached catalog pass feeds every section.

// Catalog pages render at request time — the build must never need a database.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // The team lands on its dashboard, not the storefront ("View marketplace"
  // in the admin bar still opens the catalog pages).
  const session = await getServerSessionUser().catch(() => null);
  if (session && (await getCurrentUserRole(session.supabaseUserId).catch(() => null)) === "ADMIN") {
    redirect("/admin");
  }
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
