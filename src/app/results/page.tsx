import type { Metadata } from "next";

import { ResultsView } from "@/components/catalog/results-view";
import { parseFilters } from "@/lib/catalog/filters";
import { resolveSearchQuery } from "@/lib/catalog/aliases";
import { getAllProducts } from "@/lib/catalog/queries";

// Results (spec C5): server-rendered, URL-encoded filter state. Loads the
// catalog once per request; the pure filter/facet/sort pipeline and the
// layout live in ResultsView.

export const metadata: Metadata = {
  title: "Results",
};

// Catalog pages render at request time — the build must never need a database.
export const dynamic = "force-dynamic";

interface ResultsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const resolved = filters.q ? resolveSearchQuery(filters.q) : null;
  const allProducts = await getAllProducts();

  return <ResultsView filters={filters} resolved={resolved} allProducts={allProducts} />;
}
