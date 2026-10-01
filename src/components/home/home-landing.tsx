import Image from "next/image";
import Link from "next/link";

import { ArrowCorner, ArrowRight } from "@/components/brand/icons";
import { ProductCard } from "@/components/catalog/product-card";
import { SearchForm } from "@/components/catalog/search-form";
import { TierBadge } from "@/components/catalog/tier-badge";
import { categoryImageAsset } from "../../../data/image-mapping";
import { formatCaptureDate, formatMoq, formatPriceLine } from "@/lib/catalog/format";
import { popularCategories } from "@/lib/catalog/popular";
import type { CategoryVM, ProductVM } from "@/lib/catalog/view-models";
import { HeroShelf } from "./hero-shelf";

// Home (spec C4) — the page alternates between two worlds:
//
//   dark   hero: the packaging shelf, the promise, search
//   light  explore packaging: popular material categories
//   dark   how it works: the provenance "receipt" and the tier system
//   light  featured listings + the full category index
//   dark   one request to every supplier (Quote Basket)
//
// Everything browsable signed-out. Popular tiles are material categories only
// (user review: no use-case entries in navigation — PR #9). All imagery is
// generated, representative packshots, labelled as such in alt text.
//
// Presentational only: data arrives as props; src/app/page.tsx owns queries.

interface HomeLandingProps {
  categories: CategoryVM[];
  featured: ProductVM[];
  /** Distinct suppliers with at least one listed product. */
  supplierCount?: number;
}

const plural = (n: number, word: string) => `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`;

export function HomeLanding({ categories, featured, supplierCount }: HomeLandingProps) {
  const popular = popularCategories(categories);
  const totalProducts = categories.reduce((sum, c) => sum + c.productCount, 0);
  const specimen = featured.find((p) => p.basePrice !== null && p.primaryImage) ?? featured[0] ?? null;
  const fanOut = [...new Map(featured.map((p) => [p.supplier.slug, p.supplier])).values()].slice(0, 3);

  return (
    <div>
      {/* ─── Dark: hero ─────────────────────────────────────────────────── */}
      <section className="grain relative overflow-hidden bg-void text-on-dark">
        <div className="relative mx-auto max-w-[1400px] lg:grid lg:grid-cols-[248px_1fr]">
          {/* Rail — continues the header's logo-cell hairline down the hero. */}
          <aside className="relative hidden border-r border-line-dark lg:flex lg:flex-col lg:justify-end lg:px-8 lg:pb-14">
            <span aria-hidden className="absolute -right-[4px] top-0 h-[7px] w-[7px] bg-orange" />
            <p className="tag text-on-dark">Verified catalog</p>
            <p className="mt-3 text-sm leading-relaxed text-on-dark-muted">
              {plural(totalProducts, "product")}
              {supplierCount ? ` from ${plural(supplierCount, "supplier")}` : ""}. Every price links to the
              page it came from.
            </p>
          </aside>

          <div className="relative px-5 pb-12 pt-12 sm:px-8 lg:grid lg:min-h-[760px] lg:grid-cols-12 lg:grid-rows-[auto_1fr_auto] lg:px-12 lg:pb-14 lg:pt-16">
            <h1 className="sr-only">Packaging, sourced properly. What are you packaging?</h1>

            <p
              aria-hidden
              className="hero-rise font-semiwide text-[clamp(3.25rem,8vw,7.5rem)] font-light leading-[0.92] tracking-[-0.035em] lg:col-span-8 lg:col-start-1 lg:row-start-1"
            >
              Packaging,
            </p>

            <div className="relative z-0 mt-6 lg:col-span-5 lg:col-start-1 lg:row-start-2 lg:mt-10 lg:self-start">
              <p className="max-w-md text-base leading-relaxed text-on-dark-muted sm:text-lg">
                Compare real packaging from verified suppliers — prices, minimums and lead times
                captured from their own pages — then send one quote request to all of them.
              </p>
              <div className="mt-8 max-w-xl">
                <SearchForm />
              </div>
              {popular.length > 0 ? (
                <div className="mt-5 flex max-w-xl flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
                  <span className="text-on-dark-muted">Popular</span>
                  {popular.map((category) => (
                    <Link
                      key={category.slug}
                      href={`/results?category=${encodeURIComponent(category.slug)}`}
                      className="text-on-dark/85 underline decoration-on-dark/20 underline-offset-[5px] transition-colors hover:text-on-dark hover:decoration-orange"
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="relative z-10 mx-auto mt-2 max-w-[720px] sm:mt-10 lg:col-span-7 lg:col-start-6 lg:row-span-3 lg:row-start-1 lg:mt-6 lg:w-full lg:max-w-none lg:self-center lg:pl-10">
              <HeroShelf categories={categories} />
            </div>

            <p
              aria-hidden
              className="hero-rise relative z-0 mt-2 font-semiwide text-[clamp(3.25rem,8vw,7.5rem)] font-light leading-[0.92] tracking-[-0.035em] text-on-dark/90 lg:col-span-12 lg:col-start-1 lg:row-start-3 lg:mt-0 lg:text-right"
              style={{ animationDelay: "150ms" }}
            >
              sourced properly.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Light: explore packaging ───────────────────────────────────── */}
      <section className="bg-paper">
        <div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <h2 className="font-semiwide text-4xl font-light leading-[1] tracking-[-0.03em] text-ink sm:text-5xl lg:col-span-6">
              Explore packaging
            </h2>
            <div className="lg:col-span-5 lg:col-start-8">
              <p className="text-base leading-relaxed text-ink-muted">
                Start from the material. Each category opens a filtered catalog you can narrow by
                minimum order, price type, location and certification.
              </p>
              <Link
                href="/results"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-ink underline decoration-ink/20 underline-offset-[5px] hover:decoration-orange"
              >
                Browse all {plural(totalProducts, "product")}
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:grid-rows-2">
            {popular.map((category, index) => {
              const asset = categoryImageAsset(category.slug);
              const lead = index === 0;
              return (
                <Link
                  key={category.slug}
                  href={`/results?category=${encodeURIComponent(category.slug)}`}
                  data-testid="popular-entry"
                  data-entry={category.slug}
                  className={`group relative flex flex-col justify-end overflow-hidden bg-well ${
                    lead ? "col-span-2 aspect-[4/3] lg:row-span-2 lg:aspect-auto" : "aspect-[4/5] sm:aspect-square"
                  }`}
                >
                  {asset ? (
                    <Image
                      src={asset}
                      alt={`${category.name} — representative packaging image`}
                      fill
                      sizes={lead ? "(min-width: 1024px) 640px, 100vw" : "(min-width: 1024px) 320px, 50vw"}
                      className={`object-contain packshot transition-transform duration-500 ease-out group-hover:scale-[1.03] ${
                        lead ? "p-12 pb-24 lg:p-20 lg:pb-28" : "p-6 pb-24 sm:p-8 sm:pb-24"
                      }`}
                    />
                  ) : null}
                  <span
                    aria-hidden
                    className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center border border-ink/10 text-ink transition-colors group-hover:border-orange group-hover:bg-orange group-hover:text-void"
                  >
                    <ArrowCorner size={16} />
                  </span>
                  <div className="relative p-4 sm:p-5">
                    <span
                      className={`font-semiwide font-normal leading-tight tracking-[-0.01em] text-ink ${
                        lead ? "block text-2xl sm:text-3xl" : "line-clamp-2 text-sm sm:text-lg"
                      }`}
                    >
                      {category.name}
                    </span>
                    <p className="mt-1.5 text-xs text-ink-muted tabular-nums">{plural(category.productCount, "product")}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Dark: how it works ─────────────────────────────────────────── */}
      <section id="how-it-works" className="grain scroll-mt-4 bg-navy text-on-dark">
        <div className="mx-auto grid max-w-[1400px] gap-16 px-5 py-20 sm:px-8 lg:grid-cols-12 lg:gap-12 lg:px-12 lg:py-28">
          <div className="lg:col-span-5">
            <h2 className="font-semiwide text-4xl font-light leading-[1.02] tracking-[-0.03em] sm:text-5xl">
              Every price comes with a receipt.
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-on-dark-muted">
              We only list what a supplier publishes. Each price, minimum and lead time is captured
              from their own product page, dated, and linked — so you can check it before you ask
              for a quote.
            </p>

            <ol className="mt-12 border-t border-line-dark">
              {[
                ["Search by material", "Pouches, glass, corrugated, tins — the catalog is organised by what packaging is made of."],
                ["Compare what suppliers publish", "Price, minimum order and lead time side by side, each with its capture date and source."],
                ["Request quotes in one go", "Add products to your Quote Basket and send a single request to every supplier on it."],
              ].map(([title, body], index) => (
                <li key={title} className="grid grid-cols-[3rem_1fr] gap-2 border-b border-line-dark py-5">
                  <span className="font-semiwide text-sm text-orange tabular-nums">0{index + 1}</span>
                  <div>
                    <p className="text-base text-on-dark">{title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-on-dark-muted">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="lg:col-span-6 lg:col-start-7">
            {specimen ? <SpecimenSheet product={specimen} /> : null}

            <dl className="mt-10 grid gap-6 border-t border-line-dark pt-6 sm:grid-cols-3">
              <div>
                <dt>
                  <TierBadge status="RECOMMENDED" tone="dark" />
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-on-dark-muted">
                  Verified, and meets every quality gate we check.
                </dd>
              </div>
              <div>
                <dt>
                  <TierBadge status="LISTED" tone="dark" />
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-on-dark-muted">Verified supplier with published listings.</dd>
              </div>
              <div>
                <dt>
                  <TierBadge status="QUOTE_ONLY" tone="dark" />
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-on-dark-muted">Sells, but doesn&rsquo;t publish prices.</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* ─── Light: featured listings + category index ──────────────────── */}
      <div className="bg-paper">
        {featured.length > 0 ? (
          <section
            className="mx-auto max-w-[1400px] px-5 pt-20 sm:px-8 lg:px-12 lg:pt-28"
            data-testid="featured-rail-section"
          >
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 className="font-semiwide text-4xl font-light leading-[1] tracking-[-0.03em] text-ink sm:text-5xl">
                From verified suppliers
              </h2>
              <Link
                href="/results"
                className="inline-flex items-center gap-2 text-sm font-medium text-ink underline decoration-ink/20 underline-offset-[5px] hover:decoration-orange"
              >
                Browse the catalog
                <ArrowRight size={14} />
              </Link>
            </div>
            <div
              className="-mx-5 mt-10 flex snap-x snap-mandatory scroll-pl-5 gap-4 overflow-x-auto px-5 pb-6 sm:-mx-8 sm:scroll-pl-8 sm:px-8 lg:-mx-12 lg:scroll-pl-12 lg:px-12"
              data-testid="featured-rail"
            >
              {featured.map((product) => (
                <div key={product.id} className="w-[280px] shrink-0 snap-start sm:w-[310px]">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
            <h2 className="font-semiwide text-4xl font-light leading-[1] tracking-[-0.03em] text-ink sm:text-5xl lg:col-span-6">
              Every category
            </h2>
            <p className="text-base leading-relaxed text-ink-muted lg:col-span-5 lg:col-start-8">
              {categories.length} packaging categories, from flexible pouches to shipping cartons.
            </p>
          </div>
          <ul
            className="mt-12 grid grid-cols-1 border-t border-line sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3 lg:gap-x-12"
            data-testid="category-grid"
          >
            {categories.map((category) => {
              const asset = categoryImageAsset(category.slug);
              return (
                <li key={category.slug} className="border-b border-line">
                  <Link
                    href={`/results?category=${encodeURIComponent(category.slug)}`}
                    className="group flex items-center gap-4 py-3"
                  >
                    <span className="relative h-12 w-12 shrink-0 overflow-hidden bg-well">
                      {asset ? (
                        <Image
                          src={asset}
                          alt={`${category.name} — representative packaging image`}
                          fill
                          sizes="48px"
                          className="scale-110 object-cover"
                        />
                      ) : null}
                    </span>
                    <span
                      className={`min-w-0 flex-1 text-sm group-hover:underline group-hover:decoration-orange group-hover:underline-offset-4 ${
                        category.productCount > 0 ? "text-ink" : "text-ink-faint"
                      }`}
                    >
                      {category.name}
                    </span>
                    <span className="text-xs text-ink-faint tabular-nums">{plural(category.productCount, "product")}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* ─── Dark: one request, every supplier ──────────────────────────── */}
      <section className="grain relative overflow-hidden bg-void text-on-dark">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{ background: "radial-gradient(50% 70% at 85% 50%, rgba(255,100,31,.08), transparent 70%)" }}
        />
        <div className="relative mx-auto grid max-w-[1400px] gap-14 px-5 py-20 sm:px-8 lg:grid-cols-12 lg:items-center lg:px-12 lg:py-28">
          <div className="lg:col-span-6">
            <h2 className="font-semiwide text-4xl font-light leading-[1.02] tracking-[-0.03em] sm:text-6xl">
              One request. Every supplier on your list.
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-on-dark-muted">
              Collect products from any number of suppliers in your Quote Basket, set quantities,
              and send it once. Replies arrive in one place.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/basket"
                className="inline-flex h-12 items-center gap-3 bg-orange px-6 text-sm font-medium text-void transition-colors hover:bg-orange-hi"
              >
                Open Quote Basket
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/results"
                className="inline-flex h-12 items-center border border-on-dark/25 px-6 text-sm font-medium text-on-dark transition-colors hover:border-on-dark/60"
              >
                Browse the catalog
              </Link>
            </div>
          </div>

          {fanOut.length > 0 ? <FanOut suppliers={fanOut} /> : null}
        </div>
      </section>
    </div>
  );
}

/** A real listing drawn as an annotated spec sheet — the provenance model, shown. */
function SpecimenSheet({ product }: { product: ProductVM }) {
  const image = product.primaryImage;
  return (
    <figure className="relative">
      <div className="grid grid-cols-[1fr] border border-line-dark bg-surface sm:grid-cols-[1.05fr_1fr]">
        <div className="relative aspect-square bg-well sm:aspect-auto sm:min-h-[360px]">
          {image ? (
            <Image
              src={image.url}
              alt={`${image.alt ?? product.title} — representative image`}
              fill
              sizes="(min-width: 1024px) 360px, 100vw"
              className="object-contain p-10 packshot"
            />
          ) : null}
          <span className="tag absolute left-4 top-4 text-ink-muted">{product.categoryName}</span>
        </div>
        <div className="flex flex-col p-6">
          <TierBadge status={product.supplier.status} tone="dark" />
          <p className="mt-4 line-clamp-3 text-base leading-snug text-on-dark">{product.title}</p>
          <p className="mt-1 text-sm text-on-dark-muted">{product.supplier.name}</p>
          <dl className="mt-auto pt-8 text-sm">
            <div className="flex justify-between gap-4 border-t border-line-dark py-2.5">
              <dt className="tag self-center text-on-dark-muted">Price</dt>
              <dd className="text-right text-on-dark tabular-nums">{formatPriceLine(product.basePrice, product.priceBasis)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-line-dark py-2.5">
              <dt className="tag self-center text-on-dark-muted">MOQ</dt>
              <dd className="text-right text-on-dark tabular-nums">{formatMoq(product.moq, product.moqUnit)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-y border-line-dark py-2.5">
              <dt className="tag self-center text-on-dark-muted">Captured</dt>
              <dd className="text-right tabular-nums">
                <a
                  href={product.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-on-dark underline decoration-orange underline-offset-4"
                >
                  {formatCaptureDate(product.sourceCapturedAt)}
                  <ArrowCorner size={12} />
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </div>
      <figcaption className="mt-3 text-xs text-on-dark-muted">
        A live listing from the catalog. The capture date links to the supplier&rsquo;s own page.
      </figcaption>
    </figure>
  );
}

/** One basket fanning out to several suppliers — the Quote Basket, as a drawing. */
function FanOut({ suppliers }: { suppliers: ProductVM["supplier"][] }) {
  const rows = suppliers.length;
  return (
    <div className="lg:col-span-5 lg:col-start-8">
      <div className="relative grid grid-cols-[auto_minmax(0,1fr)] items-center gap-0">
        <div className="relative z-10 whitespace-nowrap border border-line-dark bg-surface px-5 py-4">
          <p className="tag text-on-dark-muted">Quote request</p>
          <p className="mt-2 text-sm text-on-dark">1 basket</p>
        </div>
        <div className="relative min-w-0">
          <svg aria-hidden className="absolute inset-0 h-full w-16" viewBox="0 0 64 100" preserveAspectRatio="none">
            {suppliers.map((s, i) => {
              const y = ((i + 0.5) / rows) * 100;
              return (
                <path
                  key={s.slug}
                  d={`M0 50 C 32 50, 32 ${y}, 64 ${y}`}
                  fill="none"
                  stroke="rgba(244,244,240,.35)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>
          <ul className="ml-16 space-y-3">
            {suppliers.map((s) => (
              <li key={s.slug} className="flex items-center justify-between gap-4 border border-line-dark px-4 py-3.5">
                <span className="min-w-0 truncate text-sm text-on-dark">{s.name}</span>
                <TierBadge status={s.status} tone="dark" />
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-4 text-xs text-on-dark-muted">Suppliers from this page&rsquo;s featured listings.</p>
    </div>
  );
}
