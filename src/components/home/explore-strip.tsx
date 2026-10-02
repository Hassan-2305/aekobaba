import Image from "next/image";
import Link from "next/link";

import { categoryImageAsset } from "../../../data/image-mapping";
import type { CategoryVM } from "@/lib/catalog/view-models";

// Light-theme "Explore packaging" strip: an intro column and a row of
// catalog cards — the six categories with the most live listings, each with
// its real product count.

export function ExploreStrip({
  categories,
  className = "",
}: {
  categories: CategoryVM[];
  className?: string;
}) {
  const top = [...categories]
    .filter((c) => c.productCount > 0 && categoryImageAsset(c.slug))
    .sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name))
    .slice(0, 6);

  return (
    <section data-testid="explore-strip" className={`bg-paper ${className}`}>
      <div className="mx-auto grid max-w-[1400px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12 lg:px-12 lg:py-20">
        <div className="flex flex-col">
          <span aria-hidden className="mb-5 block h-0.5 w-6 bg-orange" />
          <h2 className="font-sans text-4xl font-medium leading-[1.05] tracking-[-0.03em] text-ink">
            Explore packaging
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            Browse popular categories or search for exactly what you need.
          </p>
          <Link
            href="/results"
            className="mt-8 inline-flex h-11 w-fit items-center gap-2 bg-ink px-5 text-sm font-medium text-paper transition-colors hover:bg-ink/85"
          >
            View all categories
            <svg
              aria-hidden
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M4 12h15M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {top.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/results?category=${encodeURIComponent(category.slug)}`}
                data-testid="explore-card"
                className="group flex h-full flex-col border border-line bg-card transition-shadow hover:shadow-[0_18px_40px_-24px_rgba(16,19,24,.35)]"
              >
                <span className="relative block aspect-square overflow-hidden bg-well">
                  <Image
                    src={categoryImageAsset(category.slug)!}
                    alt={`${category.name} — representative packaging image`}
                    fill
                    sizes="(min-width: 1280px) 190px, (min-width: 640px) 30vw, 50vw"
                    className="packshot object-contain p-1 transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </span>
                <span className="flex flex-1 items-end justify-between gap-3 p-4">
                  <span className="min-w-0">
                    <span className="line-clamp-2 block text-sm font-medium leading-snug text-ink">
                      {category.name}
                    </span>
                    <span className="mt-1 block text-xs text-ink-muted tabular-nums">
                      {category.productCount} product{category.productCount === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-ink transition-colors group-hover:border-orange group-hover:bg-orange group-hover:text-on-orange"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
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
    </section>
  );
}
