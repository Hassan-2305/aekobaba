import type { Metadata } from "next";

import { buildDirectory, SupplierDirectory } from "@/components/catalog/supplier-directory";
import { getAllProducts } from "@/lib/catalog/queries";

export const metadata: Metadata = {
  title: "Suppliers",
  description: "Packaging suppliers with verified, dated listings on Aekobaba.",
};

// Catalog pages render at request time — the build must never need a database.
export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const products = await getAllProducts();
  return <SupplierDirectory entries={buildDirectory(products)} />;
}
