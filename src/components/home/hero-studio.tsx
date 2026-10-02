import Link from "next/link";

import { SearchForm } from "@/components/catalog/search-form";
import type { CategoryVM } from "@/lib/catalog/view-models";
import { StudioStill } from "./studio-still";

// Light-theme hero, built to the reference composition (geometry measured
// from the 1761px reference and expressed in vw so the proportions hold):
//
//   | rail 15.8vw | editorial column 38.6vw        | stone set, full bleed |
//   | catalog     | eyebrow                         |  products on plinths  |
//   | numbers,    | Packaging,        (6.9vw, 800)  |  2 thin annotations   |
//   | 3 benefits  | sourced properly. (4.45vw, 400) |                       |
//   |             | paragraph · search · pills      |                       |
//
// Hero height 33.8vw. Rail and header logo cell share --rail-w and --edge,
// so the grid reads as one architectural system. Every product in the set
// links into its category; annotation counts are live. Imagery is
// representative (generated cut-outs on a generated backdrop).

const POPULAR_SEARCHES = ["Pouches", "Bottles", "Labels", "Boxes", "Jars"];

const BENEFITS = [
  {
    title: "Verified suppliers",
    icon: (
      <path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6L12 3Zm-3.5 9 2.5 2.5 4.5-5" />
    ),
  },
  {
    title: "Real prices from supplier pages",
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12h17M12 3.5c2.5 2.6 3.7 5.4 3.7 8.5s-1.2 5.9-3.7 8.5c-2.5-2.6-3.7-5.4-3.7-8.5S9.5 6.1 12 3.5Z" />
      </>
    ),
  },
  {
    title: "One request, many suppliers",
    icon: (
      <>
        <path d="M3.5 8.5 12 4l8.5 4.5v8L12 21l-8.5-4.5z" />
        <path d="M3.5 8.5 12 13l8.5-4.5M12 13v8" />
      </>
    ),
  },
];

export function HeroStudio({
  categories,
  totalProducts,
  supplierCount,
  className = "",
}: {
  categories: CategoryVM[];
  totalProducts: number;
  supplierCount?: number;
  className?: string;
}) {
  return (
    <section
      data-testid="hero-studio"
      className={`relative overflow-hidden border-b border-line-dark bg-void text-on-dark lg:grid lg:min-h-[clamp(560px,33.8vw,720px)] lg:grid-cols-[var(--rail-w)_minmax(0,max(38.6vw,500px))_minmax(0,1fr)] ${className}`}
    >
      {/* Rail — part of the grid, not a menu. Signal square marks where the
          rail meets the header rule. */}
      <aside className="relative hidden border-r border-line-dark bg-rail lg:block">
        <span
          aria-hidden
          className="absolute -right-[5px] -top-[5px] z-10 h-[9px] w-[9px] bg-orange"
        />
        <div className="flex flex-col pl-[var(--edge)] pr-3 pt-[30px]">
          <span aria-hidden className="block h-10 w-px bg-on-dark/50" />
          <p className="tag mt-[31px] max-w-[9rem] text-[12.5px] leading-[1.5] tracking-[0.12em] text-on-dark">
            Global packaging catalog
          </p>
          <span aria-hidden className="mt-[33px] block h-px w-[45px] bg-line-dark" />
          <p className="mt-[33px] font-sans text-[clamp(2.75rem,3.5vw,3.9rem)] font-semibold leading-none tracking-[-0.04em] text-orange tabular-nums">
            {totalProducts.toLocaleString("en-US")}
          </p>
          <p className="tag mt-[14px] text-[12.5px] leading-[1.5] tracking-[0.12em] text-on-dark">
            Products
            {supplierCount ? (
              <>
                <br />
                from {supplierCount} suppliers
              </>
            ) : null}
          </p>
          <span aria-hidden className="mt-[35px] block h-px w-[45px] bg-line-dark" />
          <ul className="mt-[34px] space-y-[24px]">
            {BENEFITS.map((item) => (
              <li
                key={item.title}
                className="flex items-start gap-[clamp(12px,1.2vw,21px)] text-[clamp(13.5px,0.82vw,14.5px)] leading-[1.3] text-on-dark-muted"
              >
                <svg
                  aria-hidden
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  className="shrink-0 text-on-dark"
                >
                  {item.icon}
                </svg>
                <span>{item.title}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Editorial column. */}
      <div className="flex flex-col justify-center px-5 pb-12 pt-12 sm:px-8 lg:pb-[3.1vw] lg:pl-[max(32px,3.4vw)] lg:pr-[2vw] lg:pt-[3.2vw]">
        <p className="tag flex items-center gap-[18px] text-[12.5px] tracking-[0.12em] text-on-dark-muted">
          <span aria-hidden className="h-[1.5px] w-[30px] bg-orange" />
          Real suppliers · Verified prices · Global packaging
        </p>
        <p
          aria-hidden
          className="mt-[clamp(18px,1.7vw,32px)] font-sans text-[clamp(3.2rem,6.5vw,8rem)] font-extrabold leading-[0.92] tracking-[-0.05em] text-on-dark"
        >
          Packaging,
        </p>
        <p
          aria-hidden
          className="whitespace-nowrap font-sans text-[clamp(2.4rem,4.55vw,5.6rem)] font-normal leading-[1.05] tracking-[-0.035em] text-on-dark"
        >
          sourced properly.
        </p>
        <p className="mt-[clamp(12px,1.05vw,22px)] max-w-[min(560px,100%)] text-[clamp(1rem,1.1vw,1.25rem)] leading-[1.48] text-on-dark-muted">
          Compare real packaging from verified suppliers — prices, minimums and lead times captured
          from their own pages — then send one quote request to all of them.
        </p>
        <div className="mt-[clamp(20px,1.9vw,36px)] w-full max-w-[600px]">
          <SearchForm tone="light" inputId="hero-search-studio" arrow variant="studio" />
        </div>
        <div className="mt-[clamp(18px,1.5vw,28px)] flex flex-wrap items-center gap-2 text-[15px] min-[1600px]:gap-3">
          <span className="mr-1 text-on-dark">
            <span className="hidden min-[1600px]:inline">Popular searches:</span>
            <span className="min-[1600px]:hidden">Popular:</span>
          </span>
          {POPULAR_SEARCHES.map((term) => (
            <Link
              key={term}
              href={`/results?q=${encodeURIComponent(term.toLowerCase())}`}
              className="inline-flex h-9 items-center rounded-full border border-line-dark px-3.5 text-[14px] min-[1600px]:px-4 min-[1600px]:text-[14.5px] text-on-dark transition-colors hover:border-orange hover:text-orange-ink"
            >
              {term}
            </Link>
          ))}
        </div>
      </div>

      {/* The still life — separate objects, composed in place. */}
      <StudioStill categories={categories} />
    </section>
  );
}
