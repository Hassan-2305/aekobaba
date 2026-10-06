import Link from "next/link";

// Left-rail filters (spec C5) — server-rendered links, no client JS. Each
// option toggles its filter on the current query; clicking the active option
// clears it. Groups render in FILTER_GROUP_ORDER: min order → food grade →
// material & category → supplier region → price type → stock/custom → lead
// time → certifications. Facet counts update with the query (computeFacets).

import {
  buildResultsUrl,
  FILTER_GROUP_ORDER,
  type Facets,
  type ResultsFilters,
} from "@/lib/catalog/filters";
import { hasAnyLeadTimeData } from "@/lib/catalog/filters";

interface FilterGroupProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

function FilterGroup({ id, title, children }: FilterGroupProps) {
  return (
    <section data-testid={`filter-group-${id}`} className="border-t border-line py-5">
      <h3 className="mb-3 text-sm font-medium text-ink">{title}</h3>
      {children}
    </section>
  );
}

function OptionLink({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  const empty = count === 0 && !active;
  return (
    <Link
      href={href}
      aria-pressed={active}
      className={`group flex items-center gap-2.5 py-1.5 text-sm transition-colors ${
        active ? "text-ink" : empty ? "text-ink-faint" : "text-ink-muted hover:text-ink"
      }`}
    >
      <span
        aria-hidden
        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center border transition-colors ${
          active ? "border-orange bg-orange" : "border-ink/25 group-hover:border-ink/60"
        }`}
      >
        {active ? (
          <svg width="10" height="10" viewBox="0 0 16 16">
            <path d="m3.5 8.2 3 2.9 6-6.2" fill="none" stroke="#080a0d" strokeWidth="2.2" />
          </svg>
        ) : null}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="ml-2 shrink-0 text-xs text-ink-faint tabular-nums">{count}</span>
    </Link>
  );
}

export function FilterRail({
  filters,
  facets,
  scopeProducts,
}: {
  filters: ResultsFilters;
  facets: Facets;
  scopeProducts: { leadTimeDays: number | null }[];
}) {
  const anyActive =
    filters.maxMoq !== null ||
    filters.priceType !== null ||
    filters.stockOrCustom !== null ||
    filters.material !== null ||
    filters.category !== null ||
    filters.location !== null ||
    filters.maxLeadDays !== null ||
    filters.cert !== null ||
    filters.foodGrade;

  return (
    <nav data-testid="filter-rail" aria-label="Filters">
      <div className="flex items-baseline justify-between pb-4">
        <h2 className="font-semiwide text-lg text-ink">Filters</h2>
        {anyActive ? (
          <Link
            href={buildResultsUrl(filters, { maxMoq: null, priceType: null, stockOrCustom: null, material: null, category: null, location: null, maxLeadDays: null, cert: null, foodGrade: false })}
            className="text-xs text-orange-ink underline underline-offset-4 hover:text-ink"
          >
            Clear all
          </Link>
        ) : null}
      </div>

      <FilterGroup id="min-order" title="Minimum order">
        {facets.minOrder.map((option) => (
          <OptionLink
            key={option.value}
            href={buildResultsUrl(filters, { maxMoq: filters.maxMoq === Number(option.value) ? null : Number(option.value) })}
            active={filters.maxMoq === Number(option.value)}
            label={option.label}
            count={option.count}
          />
        ))}
        <p className="mt-2 text-xs leading-relaxed text-ink-faint">
          Filters apply to published minimums — products without one are shown when this filter is off.
        </p>
      </FilterGroup>

      <FilterGroup id="food-grade" title="Food grade">
        {facets.foodGrade.map((option) => (
          <OptionLink
            key={option.value}
            href={buildResultsUrl(filters, { foodGrade: !filters.foodGrade })}
            active={filters.foodGrade}
            label={option.label}
            count={option.count}
          />
        ))}
        <p className="mt-2 text-xs leading-relaxed text-ink-faint">
          Only where the supplier&rsquo;s own page says food grade or food contact.
        </p>
      </FilterGroup>

      <FilterGroup id="material-category" title="Material &amp; category">
        <div>
          {facets.material.map((option) => (
            <OptionLink
              key={option.value}
              href={buildResultsUrl(filters, { material: filters.material === option.value ? null : option.value })}
              active={filters.material === option.value}
              label={option.label}
              count={option.count}
            />
          ))}
        </div>
        <div className="mt-3 border-t border-dashed border-line pt-3">
          {facets.category.map((option) => (
            <OptionLink
              key={option.value}
              href={buildResultsUrl(filters, { category: filters.category === option.value ? null : option.value })}
              active={filters.category === option.value}
              label={option.label}
              count={option.count}
            />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup id="location" title="Supplier region">
        {facets.location.map((option) => (
          <OptionLink
            key={option.value}
            href={buildResultsUrl(filters, { location: filters.location === option.value ? null : option.value })}
            active={filters.location === option.value}
            label={option.label}
            count={option.count}
          />
        ))}
      </FilterGroup>

      <FilterGroup id="price-type" title="Price type">
        {facets.priceType.map((option) => (
          <OptionLink
            key={option.value}
            href={buildResultsUrl(filters, { priceType: filters.priceType === option.value ? null : option.value })}
            active={filters.priceType === option.value}
            label={option.label}
            count={option.count}
          />
        ))}
      </FilterGroup>

      <FilterGroup id="stock-custom" title="Stock or custom">
        {facets.stockCustom.map((option) => (
          <OptionLink
            key={option.value}
            href={buildResultsUrl(filters, {
              stockOrCustom: filters.stockOrCustom === option.value ? null : (option.value as "STOCK" | "CUSTOM"),
            })}
            active={filters.stockOrCustom === option.value}
            label={option.label}
            count={option.count}
          />
        ))}
      </FilterGroup>

      <FilterGroup id="lead-time" title="Lead time">
        {hasAnyLeadTimeData(scopeProducts) ? (
          <>
            {facets.leadTime.map((option) => (
              <OptionLink
                key={option.value}
                href={buildResultsUrl(filters, { maxLeadDays: filters.maxLeadDays === Number(option.value) ? null : Number(option.value) })}
                active={filters.maxLeadDays === Number(option.value)}
                label={option.label}
                count={option.count}
              />
            ))}
          </>
        ) : (
          <p className="text-xs leading-relaxed text-ink-faint">
            No supplier in this view publishes a lead time — ask them with your quote request.
          </p>
        )}
      </FilterGroup>

      <FilterGroup id="certifications" title="Certifications">
        {facets.certifications.map((option) => (
          <OptionLink
            key={option.value}
            href={buildResultsUrl(filters, { cert: filters.cert === option.value ? null : option.value })}
            active={filters.cert === option.value}
            label={option.label}
            count={option.count}
          />
        ))}
        {facets.certifications.length === 0 ? (
          <p className="text-xs leading-relaxed text-ink-faint">No certification data captured yet.</p>
        ) : null}
      </FilterGroup>

      {/* Exposed for the C5 order test: the rail must render groups in this order. */}
      <span data-testid="filter-group-order" className="hidden" data-order={FILTER_GROUP_ORDER.join(",")} />
    </nav>
  );
}
