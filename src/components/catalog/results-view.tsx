import Link from "next/link";

import { FilterRail } from "./filter-rail";
import { ProductCard } from "./product-card";
import { SearchForm } from "./search-form";
import { SortBar } from "./sort-bar";
import { applyFilters, computeFacets, sortProducts, type ResultsFilters } from "@/lib/catalog/filters";
import type { ResolvedQuery } from "@/lib/catalog/aliases";
import type { ProductVM } from "@/lib/catalog/view-models";

// Results view (spec C5) — presentational. A dark band states where you are
// and lets you search again; below it, the light catalog: filter rail in the
// spec's priority order with live facet counts, the four sorts, and the grid.
// The page (src/app/results/page.tsx) owns the query and URL parsing.

export function ResultsView({
  filters,
  resolved,
  allProducts,
}: {
  filters: ResultsFilters;
  resolved: ResolvedQuery | null;
  allProducts: ProductVM[];
}) {
  const filtered = applyFilters(allProducts, filters, resolved);
  const products = sortProducts(filtered, filters.sort);
  const facets = computeFacets(allProducts, filters, resolved);
  const activeCount = [
    filters.maxMoq,
    filters.priceType,
    filters.stockOrCustom,
    filters.material,
    filters.category,
    filters.location,
    filters.maxLeadDays,
    filters.cert,
  ].filter((value) => value !== null).length;
  const categoryName = filters.category
    ? allProducts.find((p) => p.categorySlug === filters.category)?.categoryName ?? null
    : null;
  const heading = filters.q ? `Packaging for “${filters.q}”` : (categoryName ?? "All packaging");

  return (
    <div>
      {/* Dark band: where you are, what you searched, search again. */}
      <section className="grain border-b border-line-dark bg-void text-on-dark">
        <div className="mx-auto grid max-w-[1400px] gap-8 px-5 pb-10 pt-12 sm:px-8 lg:grid-cols-12 lg:items-end lg:px-12 lg:pb-12 lg:pt-16">
          <div className="lg:col-span-7">
            <nav aria-label="Breadcrumb" className="text-xs text-on-dark-muted">
              <Link href="/" className="hover:text-on-dark">
                Home
              </Link>
              <span className="mx-2 text-on-dark/30">/</span>
              <Link href="/results" className="hover:text-on-dark">
                Catalog
              </Link>
            </nav>
            <h1
              data-testid="results-heading"
              className="mt-5 font-semiwide text-4xl font-light leading-[1.02] tracking-[-0.03em] sm:text-5xl"
            >
              {heading}
              <span className="ml-4 align-middle font-sans text-sm font-normal tracking-normal text-on-dark-muted tabular-nums">
                {products.length} product{products.length === 1 ? "" : "s"}
              </span>
            </h1>
            {resolved ? (
              <p data-testid="search-mapping" className="mt-3 text-sm text-on-dark-muted">
                Matching {resolved.categorySlugs.length} {resolved.categorySlugs.length === 1 ? "category" : "categories"}
                {resolved.matchedTerms.length > 0 ? ` — ${resolved.matchedTerms.join(", ")}` : ""}.
              </p>
            ) : null}
          </div>
          <div className="lg:col-span-5">
            <SearchForm size="sm" tone="dark" defaultValue={filters.q ?? undefined} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-5 pb-24 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
          {/* Mobile: filters collapse behind one control. Desktop: sticky rail. */}
          <details className="border-b border-line py-4 lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
              <span>
                Filters
                {activeCount > 0 ? (
                  <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center bg-orange px-1 text-xs text-on-orange tabular-nums">
                    {activeCount}
                  </span>
                ) : null}
              </span>
              <span className="text-ink-faint">Show</span>
            </summary>
            <div className="pt-4">
              <FilterRail filters={filters} facets={facets} scopeProducts={allProducts} />
            </div>
          </details>
          <aside className="hidden w-60 shrink-0 pt-8 lg:block">
            <div className="sticky top-6">
              <FilterRail filters={filters} facets={facets} scopeProducts={allProducts} />
            </div>
          </aside>

          <section className="min-w-0 flex-1">
            <div className="border-b border-line lg:pt-4">
              <SortBar filters={filters} />
            </div>

            {products.length > 0 ? (
              <div
                data-testid="results-grid"
                className="mt-8 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 xl:grid-cols-3"
              >
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div data-testid="results-empty" className="mt-8 bg-well px-8 py-16 text-center">
                <p className="font-semiwide text-2xl font-light text-ink">Nothing matches these filters yet.</p>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
                  We only list what we have verified — no invented filler. Clear a filter or browse
                  the{" "}
                  <Link href="/results" className="text-ink underline decoration-orange underline-offset-4">
                    full catalog
                  </Link>
                  .
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
