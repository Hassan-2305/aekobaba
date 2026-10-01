import Link from "next/link";

// The four spec sorts (C5) as links — server-rendered, URL-encoded state.
// Active sort carries an orange rule underneath, like a selected tab.

import { buildResultsUrl, SORTS, SORT_LABELS, type ResultsFilters, type SortKey } from "@/lib/catalog/filters";

export function SortBar({ filters }: { filters: ResultsFilters }) {
  return (
    <div data-testid="sort-bar" className="flex items-center gap-5 overflow-x-auto text-sm">
      <span className="shrink-0 text-ink-faint">Sort by</span>
      {SORTS.map((sort: SortKey) => {
        const active = filters.sort === sort;
        return (
          <Link
            key={sort}
            href={buildResultsUrl(filters, { sort })}
            aria-current={active ? "true" : undefined}
            className={`shrink-0 border-b-2 py-3 transition-colors ${
              active ? "border-orange text-ink" : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {SORT_LABELS[sort]}
          </Link>
        );
      })}
    </div>
  );
}
