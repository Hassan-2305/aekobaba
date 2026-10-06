import type { Metadata } from "next";

import {
  buildDirectory,
  SupplierDirectory,
  type PremiumPartner,
} from "@/components/catalog/supplier-directory";
import { partnerProfile, varietyOrder } from "@/lib/catalog/partners";
import { getAllProducts } from "@/lib/catalog/queries";

export const metadata: Metadata = {
  title: "Suppliers",
  description: "Packaging suppliers with verified, dated listings on Aekobaba.",
};

// Catalog pages render at request time — the build must never need a database.
export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const products = await getAllProducts();
  const entries = buildDirectory(products);

  // Partners with a storefront profile open the page as premium cards.
  const premium: PremiumPartner[] = entries.flatMap((entry) => {
    const profile = entry.supplier.isPartner ? partnerProfile(entry.supplier.slug) : null;
    if (!profile) return [];
    const photos = varietyOrder(
      products.filter((p) => p.supplier.slug === entry.supplier.slug && p.primaryImage),
    ).slice(0, 4);
    return [{ entry, profile, products: photos }];
  });

  return <SupplierDirectory entries={entries} premium={premium} />;
}
