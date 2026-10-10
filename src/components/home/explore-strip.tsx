import Link from "next/link";

import { categoryImageAsset } from "../../../data/image-mapping";
import { CATEGORY_GROUPS, requestSupplierHref } from "@/lib/catalog/menu";
import type { CategoryVM } from "@/lib/catalog/view-models";
import { ProductPicture } from "@/components/catalog/product-picture";

// "Explore packaging" — the home page's one category index (the header menu
// is the other way in). Categories are grouped by what the buyer is shopping
// for; each group card shows its live categories with counts. Categories
// with no listings are not advertised as browsable: they collapse into a
// single "Coming soon" line where the buyer can ask for a supplier.

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function ExploreStrip({
  categories,
  className = "",
}: {
  categories: CategoryVM[];
  className?: string;
}) {
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const groups = CATEGORY_GROUPS.map((group) => {
    const live = group.slugs
      .map((slug) => bySlug.get(slug))
      .filter((c): c is CategoryVM => !!c && c.productCount > 0)
      .sort((a, b) => b.productCount - a.productCount);
    return { group, live, total: live.reduce((sum, c) => sum + c.productCount, 0) };
  }).filter((g) => g.live.length > 0);

  const grouped = new Set(CATEGORY_GROUPS.flatMap((g) => g.slugs));
  const comingSoon = categories
    .filter((c) => c.productCount === 0 && grouped.has(c.slug))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (groups.length === 0) return null;

  return (
    <section data-testid="explore-strip" className={`bg-paper ${className}`}>
      <div className="grid gap-8 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-[calc(19vw)_minmax(0,1fr)] lg:gap-0 lg:px-[var(--edge)] lg:pb-20 lg:pt-16">
        <div>
          <span aria-hidden className="block h-[2px] w-10 bg-orange" />
          <h2 className="mt-[19px] font-sans text-[clamp(2rem,2.35vw,2.6rem)] font-bold leading-[1.02] tracking-[-0.035em] text-ink">
            Explore
            <br />
            packaging
          </h2>
          <p className="mt-5 max-w-[290px] text-[clamp(0.95rem,0.95vw,1.05rem)] leading-[1.4] text-ink-muted">
            Grouped by what you&rsquo;re shopping for. Only categories with verified listings are
            shown.
          </p>
        </div>

        <div>
          <ul
            data-testid="category-groups"
            className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-3 lg:gap-[1vw]"
          >
            {groups.map(({ group, live, total }) => {
              const lead = live.find((c) => categoryImageAsset(c.slug)) ?? live[0];
              const asset = categoryImageAsset(lead.slug);
              return (
                <li
                  key={group.id}
                  data-testid="category-group"
                  data-group={group.id}
                  className="flex border border-line-dark bg-paper"
                >
                  <span
                    aria-hidden
                    className="group relative block w-[34%] shrink-0 overflow-hidden bg-well"
                  >
                    {asset ? (
                      <ProductPicture
                        src={asset}
                        alt=""
                        sizes="(min-width: 1280px) 10vw, (min-width: 640px) 16vw, 34vw"
                        className="origin-[50%_55%] scale-[1.25]"
                      />
                    ) : null}
                  </span>
                  <div className="min-w-0 flex-1 px-4 py-3.5">
                    <p className="flex items-baseline justify-between gap-3">
                      <span className="text-[16px] font-semibold leading-tight text-ink">
                        {group.name}
                      </span>
                      <span className="shrink-0 text-xs text-ink-faint tabular-nums">
                        {plural(total, "product")}
                      </span>
                    </p>
                    <ul className="mt-2 space-y-0.5">
                      {live.map((category) => (
                        <li key={category.slug}>
                          <Link
                            href={`/results?category=${encodeURIComponent(category.slug)}`}
                            data-testid="explore-card"
                            data-entry={category.slug}
                            className="flex items-baseline justify-between gap-3 py-0.5 text-sm text-ink-muted transition-colors hover:text-ink hover:underline hover:decoration-orange hover:underline-offset-4"
                          >
                            <span className="min-w-0 truncate">{category.name}</span>
                            <span className="shrink-0 text-xs text-ink-faint tabular-nums">
                              {category.productCount}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>

          {comingSoon.length > 0 ? (
            <details data-testid="coming-soon" className="mt-6 border-t border-line pt-4 text-sm">
              <summary className="cursor-pointer list-none text-ink-muted [&::-webkit-details-marker]:hidden">
                <span className="tag mr-2 text-ink-faint">Coming soon</span>
                {comingSoon.length} more {comingSoon.length === 1 ? "category" : "categories"}{" "}
                without verified listings yet —{" "}
                <span className="text-ink underline decoration-orange underline-offset-4">
                  see the list
                </span>
              </summary>
              <ul className="mt-3 flex flex-wrap gap-2">
                {comingSoon.map((category) => (
                  <li key={category.slug}>
                    <a
                      href={requestSupplierHref(category.name)}
                      title={`Ask us to find a ${category.name} supplier`}
                      className="inline-flex items-center gap-1.5 border border-line px-2.5 py-1 text-xs text-ink-muted transition-colors hover:border-ink hover:text-ink"
                    >
                      {category.name}
                      <span className="text-orange-ink">Request a supplier</span>
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      </div>
    </section>
  );
}
