import Image from "next/image";
import Link from "next/link";

import { SearchForm } from "@/components/catalog/search-form";
import type { CategoryVM } from "@/lib/catalog/view-models";

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

// The stone set is a backdrop (wall, leaf shadows, plinths — no products)
// with each product placed on it as its own cut-out layer, so every product
// is a showcased object: it lifts on hover, names its category, and links
// into it. Positions are percent of the 1350×1000 stage, matched to the
// reference composition and to where the plinth tops sit in the backdrop.
const SCENE_ASPECT = 1350 / 1000;

interface StageProduct {
  slug: string;
  src: string;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
  z: number;
  delay: number;
  /** Shown as a hover chip when the product has no standing annotation. */
  chip: boolean;
}

const STAGE_PRODUCTS: StageProduct[] = [
  {
    slug: "pouches-bags",
    src: "/hero/coffee-valve-pouch.webp",
    label: "Black stand-up pouch",
    left: 20.4,
    top: 24.2,
    width: 27.1,
    height: 64.0,
    z: 1,
    delay: 80,
    chip: false,
  },
  {
    slug: "labels",
    src: "/hero/label-roll.webp",
    label: "Roll of labels",
    left: 77.0,
    top: 65.4,
    width: 17.9,
    height: 21.2,
    z: 1,
    delay: 140,
    chip: true,
  },
  {
    slug: "pouches-bags",
    src: "/hero/kraft-pouch.webp",
    label: "Kraft stand-up pouch",
    left: 7.6,
    top: 45.2,
    width: 21.3,
    height: 45.5,
    z: 3,
    delay: 200,
    chip: true,
  },
  {
    slug: "glass-bottles",
    src: "/hero/glass-bottle-amber.webp",
    label: "Amber Boston round bottle",
    left: 43.2,
    top: 40.9,
    width: 16.2,
    height: 50.5,
    z: 3,
    delay: 260,
    chip: false,
  },
  {
    slug: "glass-jars",
    src: "/hero/glass-jar.webp",
    label: "Glass jar",
    left: 61.6,
    top: 55.4,
    width: 14.7,
    height: 36.0,
    z: 2,
    delay: 320,
    chip: true,
  },
];

// Anchor on the product → label position, as measured from the reference.
const SCENE_ANNOTATIONS = [
  { slug: "pouches-bags", ax: 21.4, ay: 27.8, lx: 15.8, ly: 11.2 },
  { slug: "glass-bottles", ax: 52.4, ay: 43.3, lx: 64.5, ly: 25.6 },
] as const;

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
      className={`relative border-b border-line-dark bg-void text-on-dark lg:grid lg:min-h-[clamp(560px,33.8vw,720px)] lg:grid-cols-[var(--rail-w)_minmax(0,max(38.6vw,500px))_minmax(0,1fr)] ${className}`}
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

      {/* The stone set — full bleed to the right edge, cover-fit at the
          photograph's exact aspect so hotspots stay on their products. */}
      <div className="relative h-[380px] overflow-hidden bg-[#e3d7c7] [container-type:size] sm:h-[480px] lg:h-auto">
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2"
          style={{
            width: `max(100cqw, calc(100cqh * ${SCENE_ASPECT}))`,
            height: `max(100cqh, calc(100cqw / ${SCENE_ASPECT}))`,
          }}
        >
          <Image
            src="/hero/studio-backdrop.webp"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 46vw, 100vw"
            className="object-cover"
          />
          {STAGE_PRODUCTS.map((product) => {
            const category = live.get(product.slug);
            const box = {
              left: `${product.left}%`,
              top: `${product.top}%`,
              width: `${product.width}%`,
              height: `${product.height}%`,
              zIndex: product.z,
              animationDelay: `${product.delay}ms`,
            };
            const object = (
              <>
                {/* Contact shadow on the plinth. */}
                <span
                  aria-hidden
                  className="absolute -bottom-[3%] left-[-4%] h-[8%] w-[108%] transition-opacity duration-300 group-hover:opacity-60"
                  style={{
                    background: "radial-gradient(closest-side, rgba(60,46,32,.55), transparent)",
                  }}
                />
                <Image
                  src={product.src}
                  alt={`${product.label} — representative image`}
                  fill
                  sizes="(min-width: 1024px) 16vw, 30vw"
                  className="object-contain object-bottom drop-shadow-[18px_10px_16px_rgba(90,70,50,.28)] transition-[transform,filter] duration-300 ease-out group-hover:-translate-y-[2.5%] group-hover:drop-shadow-[22px_22px_22px_rgba(90,70,50,.32)] group-focus-visible:-translate-y-[2.5%]"
                />
                {category && product.chip ? (
                  <span className="pointer-events-none absolute -top-9 left-1/2 hidden -translate-x-1/2 translate-y-1 whitespace-nowrap bg-[#111419] px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-white opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:opacity-100 sm:block">
                    {category.name} · {category.productCount}
                  </span>
                ) : null}
              </>
            );
            return category ? (
              <Link
                key={product.label}
                href={href(product.slug)}
                aria-label={`${category.name} — ${category.productCount} products`}
                className="hero-rise group absolute block outline-offset-4"
                style={box}
              >
                {object}
              </Link>
            ) : (
              <div key={product.label} className="hero-rise absolute" style={box}>
                {object}
              </div>
            );
          })}
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full text-[#111419]/55 sm:block"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {SCENE_ANNOTATIONS.filter((a) => live.has(a.slug)).map((a) => (
              <polyline
                key={a.slug}
                points={`${a.ax},${a.ay} ${a.lx - 2.2},${a.ly + 1.6} ${a.lx - 0.6},${a.ly + 1.6}`}
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
                  className="absolute z-10 h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 bg-orange"
                  style={{ left: `${a.ax}%`, top: `${a.ay}%` }}
                />
                <Link
                  href={href(a.slug)}
                  tabIndex={-1}
                  aria-hidden
                  className="absolute z-20 block whitespace-nowrap text-[#111419] transition-colors hover:text-orange-ink"
                  style={{ left: `${a.lx}%`, top: `${a.ly}%` }}
                >
                  <span className="block text-[13px] font-semibold uppercase leading-none tracking-[0.02em]">
                    {category.name}
                  </span>
                  <span className="mt-[7px] block text-[13px] leading-none text-[#3d434a] tabular-nums">
                    {category.productCount} product{category.productCount === 1 ? "" : "s"}
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
