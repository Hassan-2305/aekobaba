import Link from "next/link";

import { categoryImageAsset } from "../../../data/image-mapping";
import { POPULAR_CATEGORY_SLUGS } from "@/lib/catalog/popular";
import type { CategoryVM } from "@/lib/catalog/view-models";
import { ProductPicture } from "@/components/catalog/product-picture";

// Light-theme "Explore packaging" — the restrained continuation below the
// hero, built to the reference: a heading column on the edge grid, a quiet
// "View all categories" link, and one row of five catalog cards. Card labels
// are short shelf names; counts are live. Categories without listings are
// skipped and the row is topped up from the next-largest categories.

const SHELF: { slug: string; label: string }[] = [
  { slug: "pouches-bags", label: "Pouches" },
  { slug: "glass-bottles", label: "Bottles" },
  { slug: "glass-jars", label: "Jars" },
  { slug: "corrugated", label: "Boxes" },
  { slug: "labels", label: "Labels" },
];

export function ExploreStrip({
  categories,
  className = "",
}: {
  categories: CategoryVM[];
  className?: string;
}) {
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const usable = (c: CategoryVM | undefined): c is CategoryVM =>
    !!c && c.productCount > 0 && !!categoryImageAsset(c.slug);
  const picked = SHELF.map((s) => ({ category: bySlug.get(s.slug), label: s.label })).filter((s) =>
    usable(s.category),
  ) as {
    category: CategoryVM;
    label: string;
  }[];
  // Top up only from the curated material categories — never a use-case
  // category (user review, PR #9: navigation entries are materials only).
  if (picked.length < 5) {
    const taken = new Set(picked.map((p) => p.category.slug));
    for (const slug of POPULAR_CATEGORY_SLUGS) {
      if (picked.length >= 5) break;
      const c = bySlug.get(slug);
      if (c && !taken.has(slug) && usable(c)) picked.push({ category: c, label: c.name });
    }
  }

  return (
    <section data-testid="explore-strip" className={`bg-paper ${className}`}>
      <div className="grid gap-8 px-5 pb-6 pt-8 sm:px-8 lg:grid-cols-[calc(19vw)_minmax(0,1fr)] lg:gap-0 lg:px-[var(--edge)] lg:pb-[24px] lg:pt-[33px]">
        <div>
          <span aria-hidden className="block h-[2px] w-10 bg-orange" />
          <h2 className="mt-[19px] font-sans text-[clamp(2rem,2.35vw,2.6rem)] font-bold leading-[1.02] tracking-[-0.035em] text-ink">
            Explore
            <br />
            packaging
          </h2>
          <p className="mt-5 max-w-[290px] text-[clamp(0.95rem,0.95vw,1.05rem)] leading-[1.4] text-ink-muted">
            Browse popular categories or search for exactly what you need.
          </p>
        </div>

        <div>
          <div className="flex justify-end pb-[6px]">
            <Link
              href="/results"
              className="inline-flex items-center gap-3 text-[14.5px] text-ink transition-colors hover:text-orange-ink"
            >
              View all categories
              <svg
                aria-hidden
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-[18px] sm:grid-cols-3 lg:grid-cols-5 lg:gap-[1vw]">
            {picked.map(({ category, label }) => (
              <li key={category.slug}>
                <Link
                  href={`/results?category=${encodeURIComponent(category.slug)}`}
                  data-testid="explore-card"
                  data-entry={category.slug}
                  title={category.name}
                  className="group relative flex h-[clamp(150px,9.1vw,175px)] flex-col border border-line-dark bg-paper transition-colors hover:border-on-dark/40"
                >
                  <span className="relative block flex-1 overflow-hidden">
                    <ProductPicture
                      src={categoryImageAsset(category.slug)!}
                      alt={`${category.name} — representative packaging image`}
                      sizes="(min-width: 1024px) 15vw, 45vw"
                      className="origin-[50%_55%] scale-[1.3] transition-transform duration-500 group-hover:scale-[1.36]"
                    />
                  </span>
                  <span className="flex items-end justify-between gap-3 px-[15px] pb-[13px]">
                    <span className="min-w-0">
                      <span className="block truncate text-[16px] font-semibold leading-tight text-ink">
                        {label}
                      </span>
                      <span className="mt-[3px] block text-[13px] text-ink-muted tabular-nums">
                        {category.productCount} product{category.productCount === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-ink/70 text-ink transition-colors group-hover:border-orange group-hover:bg-orange group-hover:text-white"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M4 12h15M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
