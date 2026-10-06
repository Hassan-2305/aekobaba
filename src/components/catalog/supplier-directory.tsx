import Link from "next/link";

import { ProductPicture } from "./product-picture";
import { ReviewScore } from "./review-score";
import { PartnerBadge, PartnerRibbon, SponsoredTag, TierBadge } from "./tier-badge";
import { STATUS_RANK } from "@/lib/catalog/featured";
import type { PartnerProfile } from "@/lib/catalog/partners";
import type { ProductVM, SupplierSummaryVM } from "@/lib/catalog/view-models";

// Supplier directory — every supplier with at least one listing, ranked by
// tier then by catalog size. Built from the same catalog pass as the results
// page: no extra query, and no supplier appears without something to show.
// Partners with a storefront open the page as a large, labelled premium card;
// any other partner sorts to the head of the grid.

export interface DirectoryEntry {
  supplier: SupplierSummaryVM;
  productCount: number;
  categories: string[];
}

export function buildDirectory(products: ProductVM[]): DirectoryEntry[] {
  const bySlug = new Map<string, DirectoryEntry>();
  for (const product of products) {
    const entry = bySlug.get(product.supplier.slug) ?? {
      supplier: product.supplier,
      productCount: 0,
      categories: [],
    };
    entry.productCount += 1;
    if (!entry.categories.includes(product.categoryName))
      entry.categories.push(product.categoryName);
    bySlug.set(product.supplier.slug, entry);
  }
  return [...bySlug.values()].sort(
    (a, b) =>
      Number(b.supplier.isPartner) - Number(a.supplier.isPartner) ||
      STATUS_RANK[a.supplier.status] - STATUS_RANK[b.supplier.status] ||
      b.productCount - a.productCount ||
      a.supplier.name.localeCompare(b.supplier.name),
  );
}

export interface PremiumPartner {
  entry: DirectoryEntry;
  profile: PartnerProfile;
  /** Up to four listings with photos, for the card's product strip. */
  products: ProductVM[];
}

/** Short product name for the photo strip: no SKU, no bracketed variant. */
const stripName = (title: string) => title.split(" — ")[0].replace(/\s*\(.*\)$/, "");

/** The big horizontal card that opens the directory for a storefront partner. */
function PremiumPartnerCard({ partner }: { partner: PremiumPartner }) {
  const { entry, profile, products } = partner;
  const { supplier } = entry;
  return (
    <Link
      href={`/suppliers/${supplier.slug}`}
      data-testid="premium-partner-card"
      className="group relative grid overflow-hidden border border-partner-accent/40 bg-card shadow-[0_30px_60px_-40px_rgba(16,19,24,.45)] transition-shadow hover:shadow-[0_36px_70px_-34px_rgba(16,19,24,.5)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
      style={{ borderTop: `4px solid ${profile.brandColor}` }}
    >
      <PartnerRibbon className="absolute left-0 top-5 z-10" />
      <div className="flex flex-col p-6 pt-14 lg:p-8 lg:pt-16">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={profile.logoUrl} alt={`${supplier.name} logo`} className="h-14 w-auto shrink-0" />
          <div className="min-w-0">
            <p className="text-2xl font-extrabold leading-tight tracking-[-0.03em] text-ink group-hover:underline group-hover:decoration-orange group-hover:underline-offset-4">
              {supplier.name}
            </p>
            <p className="mt-1 text-sm text-ink-muted">{profile.tagline}</p>
          </div>
        </div>
        <p className="mt-4 flex flex-wrap items-center gap-2">
          <PartnerBadge />
          <TierBadge status={supplier.status} />
          <SponsoredTag />
        </p>
        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-ink-muted">{profile.summary}</p>
        <dl className="mt-6 grid grid-cols-3 border-y border-line">
          {profile.facts.map((fact, i) => (
            <div key={fact.label} className={`py-3 ${i > 0 ? "border-l border-line pl-3" : "pr-3"}`}>
              <dd className="text-xl font-semibold leading-none tracking-tight text-ink tabular-nums">
                {fact.value}
              </dd>
              <dt className="mt-1.5 text-[11px] leading-snug text-ink-muted">{fact.label}</dt>
            </div>
          ))}
        </dl>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6 text-sm">
          <span className="text-ink-muted tabular-nums">
            {entry.productCount} listing{entry.productCount === 1 ? "" : "s"} ·{" "}
            {entry.categories.join(", ")}
          </span>
          <span className="inline-flex h-11 items-center gap-2 bg-orange px-5 font-medium text-white transition-colors group-hover:bg-orange-hi">
            View full storefront
            <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 12h15M13 6l6 6-6 6" />
            </svg>
          </span>
        </div>
      </div>
      <ul className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4 lg:grid-cols-2">
        {products.map((product) => (
          <li key={product.id} className="relative aspect-square bg-white lg:aspect-auto lg:min-h-[180px]">
            {product.primaryImage ? (
              <ProductPicture
                src={product.primaryImage.url}
                alt={product.primaryImage.alt ?? product.title}
                sizes="(min-width: 1024px) 18vw, (min-width: 640px) 24vw, 48vw"
                className="p-5 transition-transform duration-500 group-hover:scale-[1.04]"
              />
            ) : null}
            <span className="tag absolute bottom-2 left-2 max-w-[90%] truncate bg-card/85 px-1.5 py-0.5 text-[10px] text-ink-muted">
              {stripName(product.title)}
            </span>
          </li>
        ))}
      </ul>
    </Link>
  );
}

export function SupplierDirectory({
  entries,
  premium = [],
}: {
  entries: DirectoryEntry[];
  /** Storefront partners shown as large cards above the grid. */
  premium?: PremiumPartner[];
}) {
  const premiumSlugs = new Set(premium.map((p) => p.entry.supplier.slug));
  const grid = entries.filter((e) => !premiumSlugs.has(e.supplier.slug));
  return (
    <div>
      <section className="grain border-b border-line-dark bg-void text-on-dark">
        <div className="mx-auto max-w-[1400px] px-5 pb-10 pt-12 sm:px-8 lg:px-12 lg:pb-12 lg:pt-16">
          <h1 className="font-semiwide text-4xl font-light leading-[1.02] tracking-[-0.03em] sm:text-5xl">
            Suppliers
            <span className="ml-4 align-middle font-sans text-sm font-normal tracking-normal text-on-dark-muted tabular-nums">
              {entries.length}
            </span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-on-dark-muted">
            Every company here sells packaging we could verify on its own website. Recommended
            suppliers pass every quality gate we check.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-5 pb-24 pt-10 sm:px-8 lg:px-12">
        {premium.length > 0 ? (
          <section aria-label="Premium partners" className="mb-12 space-y-6">
            <p className="tag flex items-center gap-2 text-partner-accent-ink">
              <span aria-hidden className="h-[9px] w-[9px] bg-partner-accent" />
              Premium partner
            </p>
            {premium.map((partner) => (
              <PremiumPartnerCard key={partner.entry.supplier.slug} partner={partner} />
            ))}
          </section>
        ) : null}
        <h2 className="mb-4 text-sm font-medium text-ink">All suppliers</h2>
        <ul data-testid="supplier-directory" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {grid.map(({ supplier, productCount, categories }) => (
            <li key={supplier.slug}>
              <Link
                href={`/suppliers/${supplier.slug}`}
                className={`group flex h-full flex-col border bg-card p-5 transition-shadow hover:shadow-[0_18px_40px_-24px_rgba(16,19,24,.35)] ${
                  supplier.isPartner ? "border-partner-accent/50" : "border-line"
                }`}
              >
                {supplier.isPartner ? (
                  <span className="mb-3">
                    <PartnerBadge tone="outline" />
                  </span>
                ) : null}
                <div className="flex items-start justify-between gap-4">
                  <p className="text-base font-medium leading-snug text-ink group-hover:underline group-hover:decoration-orange group-hover:underline-offset-4">
                    {supplier.name}
                  </p>
                  <TierBadge status={supplier.status} />
                </div>
                <p className="mt-1 text-xs text-ink-faint">{supplier.location}</p>
                <p className="mt-4 line-clamp-2 text-sm text-ink-muted">{categories.join(", ")}</p>
                <div className="mt-auto flex items-center justify-between gap-4 border-t border-line pt-4 text-sm">
                  <span className="text-ink tabular-nums">
                    {productCount} listing{productCount === 1 ? "" : "s"}
                  </span>
                  <ReviewScore
                    reviewScore={supplier.reviewScore}
                    reviewCount={supplier.reviewCount}
                    reviewPlatform={supplier.reviewPlatform}
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
