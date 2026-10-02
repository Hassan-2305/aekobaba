import Link from "next/link";

import { ReviewScore } from "./review-score";
import { TierBadge } from "./tier-badge";
import { STATUS_RANK } from "@/lib/catalog/featured";
import type { ProductVM, SupplierSummaryVM } from "@/lib/catalog/view-models";

// Supplier directory — every supplier with at least one listing, ranked by
// tier then by catalog size. Built from the same catalog pass as the results
// page: no extra query, and no supplier appears without something to show.

export interface DirectoryEntry {
  supplier: SupplierSummaryVM;
  productCount: number;
  categories: string[];
}

export function buildDirectory(products: ProductVM[]): DirectoryEntry[] {
  const bySlug = new Map<string, DirectoryEntry>();
  for (const product of products) {
    const entry = bySlug.get(product.supplier.slug) ?? {
      supplier: product.supplier,
      productCount: 0,
      categories: [],
    };
    entry.productCount += 1;
    if (!entry.categories.includes(product.categoryName))
      entry.categories.push(product.categoryName);
    bySlug.set(product.supplier.slug, entry);
  }
  return [...bySlug.values()].sort(
    (a, b) =>
      STATUS_RANK[a.supplier.status] - STATUS_RANK[b.supplier.status] ||
      b.productCount - a.productCount ||
      a.supplier.name.localeCompare(b.supplier.name),
  );
}

export function SupplierDirectory({ entries }: { entries: DirectoryEntry[] }) {
  return (
    <div>
      <section className="grain border-b border-line-dark bg-void text-on-dark">
        <div className="mx-auto max-w-[1400px] px-5 pb-10 pt-12 sm:px-8 lg:px-12 lg:pb-12 lg:pt-16">
          <h1 className="font-semiwide text-4xl font-light leading-[1.02] tracking-[-0.03em] sm:text-5xl">
            Suppliers
            <span className="ml-4 align-middle font-sans text-sm font-normal tracking-normal text-on-dark-muted tabular-nums">
              {entries.length}
            </span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-on-dark-muted">
            Every company here sells packaging we could verify on its own website. Recommended
            suppliers pass every quality gate we check.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-5 pb-24 pt-10 sm:px-8 lg:px-12">
        <ul data-testid="supplier-directory" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {entries.map(({ supplier, productCount, categories }) => (
            <li key={supplier.slug}>
              <Link
                href={`/suppliers/${supplier.slug}`}
                className="group flex h-full flex-col border border-line bg-card p-5 transition-shadow hover:shadow-[0_18px_40px_-24px_rgba(16,19,24,.35)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-base font-medium leading-snug text-ink group-hover:underline group-hover:decoration-orange group-hover:underline-offset-4">
                    {supplier.name}
                  </p>
                  <TierBadge status={supplier.status} />
                </div>
                <p className="mt-1 text-xs text-ink-faint">{supplier.location}</p>
                <p className="mt-4 line-clamp-2 text-sm text-ink-muted">{categories.join(", ")}</p>
                <div className="mt-auto flex items-center justify-between gap-4 border-t border-line pt-4 text-sm">
                  <span className="text-ink tabular-nums">
                    {productCount} listing{productCount === 1 ? "" : "s"}
                  </span>
                  <ReviewScore
                    reviewScore={supplier.reviewScore}
                    reviewCount={supplier.reviewCount}
                    reviewPlatform={supplier.reviewPlatform}
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
