import Image from "next/image";
import Link from "next/link";

import { SearchForm } from "@/components/catalog/search-form";
import type { CategoryVM } from "@/lib/catalog/view-models";

// Light-theme hero — the "studio" composition. A warm stone set (one
// composed photograph of the representative packshots on travertine plinths,
// window light from the left) fills the right of the hero; the left carries
// the promise, search and popular searches; the rail holds the catalog's
// real numbers and the three things Aekobaba guarantees.
//
// Every product in the set is an entry point into its category, and the
// annotations carry live counts. Imagery is representative (generated).

// Object boxes inside public/hero/studio-scene.webp, in percent of the image
// (written out by the scene composer — keep in sync if the scene changes).
const SCENE_ASPECT = 1320 / 1100;

const SCENE_OBJECTS = [
  {
    slug: "pouches-bags",
    label: "Black flat-bottom pouch",
    left: 28.2,
    top: 28.2,
    width: 27.7,
    height: 58.2,
  },
  {
    slug: "pouches-bags",
    label: "Kraft stand-up pouch",
    left: 13.8,
    top: 45.6,
    width: 22.4,
    height: 42.7,
  },
  {
    slug: "glass-bottles",
    label: "Amber Boston round bottle",
    left: 50.2,
    top: 34.9,
    width: 19.4,
    height: 53.6,
  },
  {
    slug: "glass-jars",
    label: "Glass mason jar",
    left: 69.3,
    top: 30.0,
    width: 14.6,
    height: 31.8,
  },
  { slug: "labels", label: "Roll of labels", left: 77.6, top: 63.4, width: 21.5, height: 24.1 },
] as const;

const SCENE_ANNOTATIONS = [
  { slug: "pouches-bags", ax: 33, ay: 34, lx: 15, ly: 13 },
  { slug: "glass-bottles", ax: 59.5, ay: 37.5, lx: 63, ly: 17 },
] as const;

const POPULAR_SEARCHES = ["Pouches", "Bottles", "Labels", "Boxes", "Jars"];

const TRUST = [
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

const href = (slug: string) => `/results?category=${encodeURIComponent(slug)}`;

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
  const live = new Map(categories.filter((c) => c.productCount > 0).map((c) => [c.slug, c]));

  return (
    <section
      data-testid="hero-studio"
      className={`relative overflow-hidden border-b border-line-dark bg-void text-on-dark ${className}`}
    >
      <div className="lg:grid lg:min-h-[600px] lg:grid-cols-[max(248px,calc((100vw_-_1400px)/2_+_248px))_minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* Rail — the catalog's real numbers and the three guarantees. */}
        <aside className="hidden border-r border-line-dark bg-rail lg:block">
          <div className="ml-auto flex h-full w-[248px] flex-col px-8 py-12">
            <span aria-hidden className="mb-10 block h-10 w-px bg-line-dark" />
            <p className="tag max-w-[9rem] leading-[1.5] text-on-dark">Global packaging catalog</p>
            <span aria-hidden className="my-7 block h-px w-8 bg-line-dark" />
            <p className="font-sans text-5xl font-normal leading-none tracking-[-0.03em] text-orange tabular-nums">
              {totalProducts.toLocaleString("en-US")}
            </p>
            <p className="tag mt-3 leading-[1.5] text-on-dark">
              Products
              {supplierCount ? (
                <>
                  <br />
                  from {supplierCount} suppliers
                </>
              ) : null}
            </p>
            <span aria-hidden className="my-7 block h-px w-8 bg-line-dark" />
            <ul className="space-y-5">
              {TRUST.map((item) => (
                <li
                  key={item.title}
                  className="flex items-start gap-3 text-xs leading-snug text-on-dark-muted"
                >
                  <svg
                    aria-hidden
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    className="mt-0.5 shrink-0 text-on-dark"
                  >
                    {item.icon}
                  </svg>
                  <span className="max-w-[8.5rem]">{item.title}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Promise, search, popular searches. */}
        <div className="flex flex-col justify-center px-5 pb-10 pt-12 sm:px-8 lg:py-14 lg:pl-12 lg:pr-8">
          <p className="tag flex items-center gap-3 text-on-dark-muted">
            <span aria-hidden className="h-px w-6 bg-orange" />
            Real suppliers · Verified prices · Global packaging
          </p>
          <p
            aria-hidden
            className="mt-6 font-sans text-[clamp(3.25rem,6vw,6.75rem)] font-semibold leading-[0.92] tracking-[-0.045em] text-on-dark"
          >
            Packaging,
          </p>
          <p
            aria-hidden
            className="mt-1 font-sans text-[clamp(2.4rem,4.1vw,4.75rem)] font-normal whitespace-nowrap leading-[1.02] tracking-[-0.04em] text-on-dark"
          >
            sourced properly.
          </p>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-on-dark-muted sm:text-lg">
            Compare real packaging from verified suppliers — prices, minimums and lead times
            captured from their own pages — then send one quote request to all of them.
          </p>
          <div className="mt-8 max-w-[640px]">
            <SearchForm tone="light" inputId="hero-search-studio" arrow />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
            <span className="mr-2 text-on-dark-muted">Popular searches:</span>
            {POPULAR_SEARCHES.map((term) => (
              <Link
                key={term}
                href={`/results?q=${encodeURIComponent(term.toLowerCase())}`}
                className="rounded-full border border-line-dark bg-surface px-4 py-1.5 text-on-dark transition-colors hover:border-orange hover:text-orange-ink"
              >
                {term}
              </Link>
            ))}
          </div>
        </div>

        {/* The stone set. Bottom-anchored at the photo's aspect; the column
            background continues the wall so taller columns blend. */}
        <div className="relative h-[380px] overflow-hidden bg-[#e6ded1] [container-type:size] sm:h-[460px] lg:h-auto">
          {/* Cover-fit stage at the photo's exact aspect (container units), so
              the product hotspots and annotations stay on their objects at
              every column shape. Anchored bottom-centre: crops wall, not
              products. */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2"
            style={{
              width: `max(100cqw, calc(100cqh * ${SCENE_ASPECT}))`,
              height: `max(100cqh, calc(100cqw / ${SCENE_ASPECT}))`,
            }}
          >
            <Image
              src="/hero/studio-scene.webp"
              alt="Representative packaging on stone plinths: kraft and black pouches, an amber glass bottle, a glass jar and a label roll"
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
            {SCENE_OBJECTS.map((object) => {
              const category = live.get(object.slug);
              if (!category) return null;
              return (
                <Link
                  key={object.label}
                  href={href(object.slug)}
                  aria-label={`${category.name} — ${category.productCount} products`}
                  title={object.label}
                  className="absolute z-10 outline-offset-4"
                  style={{
                    left: `${object.left}%`,
                    top: `${object.top}%`,
                    width: `${object.width}%`,
                    height: `${object.height}%`,
                  }}
                />
              );
            })}
            <svg
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full text-[#101318]/45 sm:block"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {SCENE_ANNOTATIONS.filter((a) => live.has(a.slug)).map((a) => (
                <polyline
                  key={a.slug}
                  points={`${a.ax},${a.ay} ${a.lx - 1.5},${a.ly + 2} ${a.lx},${a.ly + 2}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
            {SCENE_ANNOTATIONS.map((a) => {
              const category = live.get(a.slug);
              if (!category) return null;
              return (
                <div key={a.slug} className="hidden sm:block">
                  <span
                    aria-hidden
                    className="absolute z-10 h-[6px] w-[6px] -translate-x-1/2 -translate-y-1/2 bg-orange"
                    style={{ left: `${a.ax}%`, top: `${a.ay}%` }}
                  />
                  <Link
                    href={href(a.slug)}
                    tabIndex={-1}
                    aria-hidden
                    className="absolute z-20 block whitespace-nowrap pl-2 text-[#101318] transition-colors hover:text-orange-ink"
                    style={{ left: `${a.lx}%`, top: `${a.ly}%` }}
                  >
                    <span className="tag block">{category.name}</span>
                    <span className="mt-1.5 block text-xs text-[#4a525b] tabular-nums">
                      {category.productCount} product{category.productCount === 1 ? "" : "s"}
                    </span>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
