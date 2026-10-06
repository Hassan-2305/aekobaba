import Link from "next/link";

import { ArrowCorner, ArrowRight } from "@/components/brand/icons";
import { ProductCard } from "@/components/catalog/product-card";
import { ProductPicture } from "@/components/catalog/product-picture";
import { PartnerBadge, TierBadge } from "@/components/catalog/tier-badge";
import {
  formatCaptureDate,
  formatMoq,
  formatPerUnit,
  formatPriceLine,
  isStaleCapture,
  unitPrice,
} from "@/lib/catalog/format";
import type { CategoryVM, ProductVM } from "@/lib/catalog/view-models";
import { ExploreStrip } from "./explore-strip";
import { PartnerShowcase } from "./partner-showcase";
import type { PartnerProfile } from "@/lib/catalog/partners";
import { HeroStudio } from "./hero-studio";

// Home (spec C4) — the page alternates between two worlds:
//
//   dark   hero: the one headline, search, quick filters
//   dark   partner spotlight (labelled placement)
//   light  explore packaging: the grouped category index (live ones only)
//   light  featured packaging: partner listings first (ribboned), then others
//   dark   how it works: the provenance "receipt" and the tier system
//   dark   one request to every supplier (Quote Basket)
//
// Categories live in the header menu and the grouped index only. The lead
// partner is showcased on purpose (spotlight, then the head of the rail);
// the example listing stays a neutral, non-partner record.
//
// Everything browsable signed-out. Popular tiles are material categories only
// (user review: no use-case entries in navigation — PR #9). All imagery is
// generated, representative packshots, labelled as such in alt text.
//
// Presentational only: data arrives as props; src/app/page.tsx owns queries.

interface HomeLandingProps {
  categories: CategoryVM[];
  /** Lead featured partner: its profile and its listings, shown right after the hero. */
  partner?: { profile: PartnerProfile; products: ProductVM[] } | null;
  featured: ProductVM[];
  /** Distinct suppliers with at least one listed product. */
  supplierCount?: number;
  /** The "live listing" shown in How it works — a complete record (price + MOQ). */
  specimen?: ProductVM | null;
}

export function HomeLanding({
  categories,
  featured,
  supplierCount,
  partner,
  specimen: specimenProp,
}: HomeLandingProps) {
  const totalProducts = categories.reduce((sum, c) => sum + c.productCount, 0);
  const specimen =
    specimenProp ??
    featured.find((p) => p.basePrice !== null && p.moq !== null && p.primaryImage) ??
    featured.find((p) => p.basePrice !== null && p.primaryImage) ??
    featured[0] ??
    null;
  const fanOut = [...new Map(featured.map((p) => [p.supplier.slug, p.supplier])).values()].slice(
    0,
    3,
  );

  return (
    <div>
      {/* One composition for both themes: the studio hero and the explore
          strip. The dark theme re-lights them; it does not re-lay them out. */}
      <HeroStudio
        categories={categories}
        totalProducts={totalProducts}
        supplierCount={supplierCount}
      />
      {partner && partner.products.length > 0 ? (
        <PartnerShowcase profile={partner.profile} products={partner.products} />
      ) : null}
      <ExploreStrip categories={categories} />

      {/* ─── Light: featured listings (partner first) ───────────────────── */}
      <div className="bg-paper">
        {featured.length > 0 ? (
          <section
            className="mx-auto max-w-[1400px] px-5 pb-20 pt-4 sm:px-8 lg:px-12 lg:pb-24"
            data-testid="featured-rail-section"
          >
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 className="font-semiwide text-4xl font-light leading-[1] tracking-[-0.03em] text-ink sm:text-5xl">
                Featured packaging
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

      </div>


      {/* ─── Dark: how it works ─────────────────────────────────────────── */}
      <section id="how-it-works" className="tone-dark grain scroll-mt-4 bg-navy text-on-dark">
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
                [
                  "Search by material",
                  "Pouches, glass, corrugated, tins — the catalog is organised by what packaging is made of.",
                ],
                [
                  "Compare what suppliers publish",
                  "Price, minimum order and lead time side by side, each with its capture date and source.",
                ],
                [
                  "Request quotes in one go",
                  "Add products to your Quote Basket and send a single request to every supplier on it.",
                ],
              ].map(([title, body], index) => (
                <li
                  key={title}
                  className="grid grid-cols-[3rem_1fr] gap-2 border-b border-line-dark py-5"
                >
                  <span className="font-semiwide text-sm text-orange tabular-nums">
                    0{index + 1}
                  </span>
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

            <dl className="mt-10 grid gap-6 border-t border-line-dark pt-6 sm:grid-cols-2">
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
                <dd className="mt-2 text-sm leading-relaxed text-on-dark-muted">
                  Verified supplier with published listings.
                </dd>
              </div>
              <div>
                <dt>
                  <TierBadge status="QUOTE_ONLY" tone="dark" />
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-on-dark-muted">
                  Sells, but doesn&rsquo;t publish prices.
                </dd>
              </div>
              <div>
                <dt>
                  <PartnerBadge />
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-on-dark-muted">
                  Paid partner. Gets sponsored, labelled placement and a branded storefront — never
                  a better tier or a hidden ranking boost.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* ─── Dark: one request, every supplier ──────────────────────────── */}
      <section className="grain relative overflow-hidden bg-void text-on-dark">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(50% 70% at 85% 50%, rgba(255,100,31,.08), transparent 70%)",
          }}
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
                className="inline-flex h-12 items-center gap-3 bg-orange px-6 text-sm font-medium text-on-orange transition-colors hover:bg-orange-hi"
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
  const unit = unitPrice(product);
  const perUnit =
    unit && unit.packSize !== 1 ? formatPerUnit(unit.amount, unit.currency, unit.unit) : null;
  const stale = isStaleCapture(product.sourceCapturedAt);
  return (
    <figure className="relative">
      <div className="grid grid-cols-[1fr] border border-line-dark bg-surface sm:grid-cols-[1.05fr_1fr]">
        <div className="relative aspect-square bg-well sm:aspect-auto sm:min-h-[360px]">
          {image ? (
            <ProductPicture
              src={image.url}
              alt={`${image.alt ?? product.title} — representative image`}
              sizes="(min-width: 1024px) 360px, 100vw"
              className="p-10"
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
              <dd className="text-right text-on-dark tabular-nums">
                {formatPriceLine(product.basePrice, product.priceBasis)}
                {perUnit ? (
                  <span className="mt-0.5 block text-xs text-on-dark-muted">{perUnit}</span>
                ) : null}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-line-dark py-2.5">
              <dt className="tag self-center text-on-dark-muted">MOQ</dt>
              <dd className="text-right text-on-dark tabular-nums">
                {formatMoq(product.moq, product.moqUnit)}
              </dd>
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
                {stale ? (
                  <span className="mt-0.5 block text-xs text-on-dark-muted">
                    Older capture — check the source
                  </span>
                ) : null}
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
          <svg
            aria-hidden
            className="absolute inset-0 h-full w-16 text-on-dark/35"
            viewBox="0 0 64 100"
            preserveAspectRatio="none"
          >
            {suppliers.map((s, i) => {
              const y = ((i + 0.5) / rows) * 100;
              return (
                <path
                  key={s.slug}
                  d={`M0 50 C 32 50, 32 ${y}, 64 ${y}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>
          <ul className="ml-16 space-y-3">
            {suppliers.map((s) => (
              <li
                key={s.slug}
                className="flex items-center justify-between gap-4 border border-line-dark px-4 py-3.5"
              >
                <span className="min-w-0 truncate text-sm text-on-dark">{s.name}</span>
                <TierBadge status={s.status} tone="dark" />
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-4 text-xs text-on-dark-muted">
        Suppliers from this page&rsquo;s featured listings.
      </p>
    </div>
  );
}
