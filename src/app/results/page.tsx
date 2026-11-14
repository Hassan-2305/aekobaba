import type { Metadata } from "next";
import Link from "next/link";

import { ResultsView } from "@/components/catalog/results-view";
import { parseFilters } from "@/lib/catalog/filters";
import { resolveSearchQuery } from "@/lib/catalog/aliases";
import { getIngredientProducts, getPackagingProducts } from "@/lib/catalog/queries";

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
  const [allProducts, ingredients] = await Promise.all([getPackagingProducts(), getIngredientProducts()]);
  // Ingredients live in their own section; a search that matches some points there.
  const words = (filters.q ?? "").toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const ingredientMatches = words.length
    ? ingredients.filter((p) => {
        const hay = `${p.title} ${p.categoryName} ${p.subcategory ?? ""} ${p.supplier.name} ${(p.applications ?? []).join(" ")}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      }).length
    : 0;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const page = Math.max(1, Math.floor(Number(rawPage)) || 1);

  return (
    <>
      {ingredientMatches > 0 ? (
        <p
          data-testid="ingredient-matches"
          className="border-b border-line bg-well px-5 py-2.5 text-center text-sm text-ink sm:px-8"
        >
          <span aria-hidden className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#2BB673] align-middle" />
          {ingredientMatches} ingredient{ingredientMatches === 1 ? "" : "s"} also match &ldquo;{filters.q}&rdquo; —{" "}
          <Link href="/ingredients" className="font-medium underline decoration-orange underline-offset-4">
            see ingredient suppliers
          </Link>
        </p>
      ) : null}
      <ResultsView filters={filters} resolved={resolved} allProducts={allProducts} page={page} />
    </>
  );
}
