import Link from "next/link";

import { PriceDisplay } from "./price-display";
import { ProductCard } from "./product-card";
import { ProductConfigurator } from "./product-configurator";
import { ProductGallery } from "./product-gallery";
import { QuantityBreakTable } from "./quantity-break-table";
import { ReviewScore } from "./review-score";
import { PartnerBadge, PartnerRibbon, TierBadge } from "./tier-badge";
import {
  formatCaptureDate,
  formatLeadTime,
  formatMoq,
  NOT_PUBLISHED,
  priceCurrency,
} from "@/lib/catalog/format";
import type { PartnerFactsVM } from "@/lib/catalog/partner-facts";
import type { VariantVM } from "@/lib/catalog/related";
import { isFoodGrade, productTags } from "@/lib/catalog/tags";
import type { ProductVM } from "@/lib/catalog/view-models";

// Product page — everything a buyer needs to decide and ask, on one URL:
//
//   gallery (thumbnails + zoom) | identity, price, configurator (variant,
//                               | quantity, options → quote / sample / basket)
//   specification · order terms (MOQ, tiers, setup, lead time, samples)
//   customization & artwork (+ downloadable spec sheet) · supplier
//   similar products from other suppliers
//
// Truth rule: every value is what the supplier published (or supplied, and
// labelled so); anything unstated reads "Not published" — nothing is filled in.

/** Label for a value the partner sent us directly, not captured from their page. */
function SuppliedBy({ facts }: { facts: PartnerFactsVM }) {
  return (
    <span className="ml-2 text-xs text-ink-faint">
      supplied by {facts.supplierName}, {formatCaptureDate(facts.suppliedAt)}
    </span>
  );
}

function Row({
  label,
  children,
  muted = false,
  testId,
}: {
  label: string;
  children: React.ReactNode;
  muted?: boolean;
  testId?: string;
}) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-4 border-b border-line py-3">
      <dt className="tag self-start pt-0.5 text-ink-faint">{label}</dt>
      <dd data-testid={testId} className={`tabular-nums ${muted ? "text-ink-faint" : "text-ink"}`}>
        {children}
      </dd>
    </div>
  );
}

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="font-semiwide text-xl font-light tracking-[-0.01em] text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** General guidance, not a supplier claim — labelled as such on the page. */
const ARTWORK_GUIDE = [
  "Vector artwork (AI, EPS or PDF) with fonts outlined",
  "Images at 300 dpi at print size, CMYK (Pantone references for spot colours)",
  "The supplier's die line / template, with 3 mm (⅛ in) bleed",
  "Barcodes, regulatory text and food-contact statements checked before proofing",
];

export function ProductDetailView({
  product,
  variants = [],
  similar = [],
}: {
  product: ProductVM;
  variants?: VariantVM[];
  similar?: ProductVM[];
}) {
  const tags = productTags(product, 4);
  const s = product.specs;
  const currency = priceCurrency(product.priceBasis);
  const customization = [...new Set([...s.customization, ...s.printing])];
  const partnerPdf = /^\/partners\/.+\.pdf$/.test(product.sourceUrl) ? product.sourceUrl : null;
  const leadValue =
    product.leadTimeDays !== null ? formatLeadTime(product.leadTimeDays) : (s.leadNote ?? NOT_PUBLISHED);
  const foodGrade = isFoodGrade(product);

  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-24 pt-8 sm:px-8 lg:px-12">
      <nav className="text-xs text-ink-faint" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>
        <span className="mx-2 text-ink/20">/</span>
        <Link href={`/results?category=${encodeURIComponent(product.categorySlug)}`} className="hover:text-ink">
          {product.categoryName}
        </Link>
        <span className="mx-2 text-ink/20">/</span>
        <span className="text-ink-muted">{product.title}</span>
      </nav>

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <ProductGallery images={product.images} title={product.title} />
        </div>

        <div>
          {product.supplier.isPartner ? <PartnerRibbon className="mb-4" /> : null}
          <p className="tag text-ink-faint">
            {product.categoryName}
            {product.subcategory ? ` / ${product.subcategory}` : ""}
          </p>
          <h1
            data-testid="product-title"
            className="mt-4 font-semiwide text-3xl font-light leading-[1.08] tracking-[-0.025em] text-ink sm:text-4xl"
          >
            {product.title}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              href={`/suppliers/${product.supplier.slug}`}
              data-testid="product-supplier-link"
              className="text-sm font-medium text-ink underline decoration-ink/20 underline-offset-4 hover:decoration-orange"
            >
              {product.supplier.name}
            </Link>
            <TierBadge status={product.supplier.status} />
            <ReviewScore
              size="md"
              reviewScore={product.supplier.reviewScore}
              reviewCount={product.supplier.reviewCount}
              reviewPlatform={product.supplier.reviewPlatform}
              reviewUrl={product.supplier.reviewUrl}
            />
          </div>

          {tags.length > 0 ? (
            <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Product attributes">
              {tags.map((tag) => (
                <li key={tag} className="tag border border-line px-2 py-1.5 text-ink-muted">
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-8 bg-card p-6 shadow-[0_1px_0_rgba(11,14,18,.06)]">
            <PriceDisplay product={product} size="lg" />
            <div className="mt-6 border-t border-line pt-6">
              <ProductConfigurator product={product} variants={variants} />
            </div>
            <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-4 text-xs text-ink-muted">
              <span data-testid="price-updated">
                Price last updated {formatCaptureDate(product.sourceCapturedAt)}
              </span>
              <span aria-hidden>·</span>
              <a
                href={product.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="supplier-source-link"
                className="text-ink underline decoration-ink/25 underline-offset-[3px] hover:decoration-orange"
              >
                {partnerPdf
                  ? `View ${product.supplier.name}'s catalog (PDF)`
                  : `View on ${product.supplier.name}'s site`}{" "}
                &#8599;
              </a>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-1 gap-14 lg:grid-cols-2 lg:gap-16">
        <Section title="Specification" id="specification">
          <dl className="border-t border-line text-sm" data-testid="product-specs">
            <Row label="Material">{product.material}</Row>
            {s.capacity ? <Row label="Capacity">{s.capacity.label}</Row> : null}
            {s.dimensions ? <Row label="Dimensions">{s.dimensions.label}</Row> : null}
            {s.thickness ? <Row label="Thickness">{s.thickness.label}</Row> : null}
            {s.neckFinish ? <Row label="Neck finish">{s.neckFinish}</Row> : null}
            {s.closures.length ? <Row label="Closure">{s.closures.join(", ")}</Row> : null}
            {s.finishes.length ? <Row label="Colour & finish">{s.finishes.join(", ")}</Row> : null}
            {s.wall ? <Row label="Wall / flute">{s.wall}</Row> : null}
            {s.strength ? <Row label="Board strength">{s.strength}</Row> : null}
            <Row label="Type">
              {product.stockOrCustom === "STOCK" ? "Stock item" : "Custom manufacture"}
            </Row>
            <Row label="Food contact" muted={!foodGrade}>
              {foodGrade ? "Food grade / food contact (supplier's wording)" : NOT_PUBLISHED}
            </Row>
            {product.certificationNames.length > 0 ? (
              <Row label="Certifications" testId="product-certifications">
                {product.certificationNames.join(", ")}
                <span className="ml-1 text-ink-faint">(supplier)</span>
              </Row>
            ) : null}
          </dl>
          <p className="mt-2 text-xs text-ink-faint">
            Specs are taken from the supplier&rsquo;s own listing; anything not listed wasn&rsquo;t
            published — ask in your quote.
          </p>
        </Section>

        <Section title="Order terms" id="order-terms">
          <dl className="border-t border-line text-sm">
            <Row label="Minimum order" muted={product.moq === null} testId="product-moq">
              {formatMoq(product.moq, product.moqUnit)}
              {product.partnerFacts?.moq ? <SuppliedBy facts={product.partnerFacts} /> : null}
            </Row>
            {product.partnerFacts?.casePack != null ? (
              <Row label="Case pack" testId="product-case-pack">
                {product.partnerFacts.casePack.toLocaleString("en-US")} units
                <SuppliedBy facts={product.partnerFacts} />
              </Row>
            ) : null}
            <Row label="Setup / tooling" muted={!s.setupNote} testId="product-setup">
              {s.setupNote ?? NOT_PUBLISHED}
            </Row>
            <Row
              label="Production lead time"
              muted={leadValue === NOT_PUBLISHED}
              testId="product-lead-time"
            >
              {leadValue}
              {product.partnerFacts?.leadTime ? <SuppliedBy facts={product.partnerFacts} /> : null}
            </Row>
            <Row label="Samples" muted={!product.samplePolicyVerified} testId="product-samples">
              {product.samplePolicyVerified
                ? "Available — the supplier publishes a sample policy"
                : "Not published — request one and we'll ask"}
            </Row>
            <Row label="Sample cost" muted={!s.sampleNote}>
              {s.sampleNote ?? NOT_PUBLISHED}
            </Row>
          </dl>
          <div className="mt-6">
            {product.quantityBreaks.length > 0 ? (
              <QuantityBreakTable breaks={product.quantityBreaks} currency={currency} />
            ) : (
              <p className="text-sm text-ink-faint">
                Price tiers: not published — the supplier quotes per quantity.
              </p>
            )}
          </div>
        </Section>

        <Section title="Customization & artwork" id="customization">
          {customization.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5" data-testid="product-customization">
              {customization.map((c) => (
                <li key={c} className="tag border border-line px-2 py-1.5 text-ink">
                  {c}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-faint">
              No customization options published — pick &ldquo;Custom printing / my logo&rdquo;
              above to ask.
            </p>
          )}
          <h3 className="mt-6 text-sm font-medium text-ink">Typical artwork requirements</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-muted">
            {ARTWORK_GUIDE.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-faint">
            General guidance from Aekobaba — {product.supplier.name} confirms its own requirements
            and die lines with your quote.
          </p>
          <h3 className="mt-6 text-sm font-medium text-ink">Downloads</h3>
          <ul className="mt-2 space-y-1.5 text-sm" data-testid="product-downloads">
            <li>
              <Link
                href={`/products/${product.id}/spec`}
                className="text-ink underline decoration-ink/25 underline-offset-[3px] hover:decoration-orange"
              >
                Specification sheet (print or save as PDF)
              </Link>
            </li>
            <li>
              <a
                href={`/products/${product.id}/spec.csv`}
                download
                className="text-ink underline decoration-ink/25 underline-offset-[3px] hover:decoration-orange"
              >
                Specification data (CSV)
              </a>
            </li>
            {partnerPdf ? (
              <li>
                <a
                  href={partnerPdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink underline decoration-ink/25 underline-offset-[3px] hover:decoration-orange"
                >
                  {product.supplier.name} catalog (PDF)
                </a>
              </li>
            ) : null}
          </ul>
        </Section>

        <Section title="Supplier" id="supplier">
          <div className="border border-line bg-card p-5" data-testid="product-supplier">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/suppliers/${product.supplier.slug}`}
                className="text-lg font-semibold text-ink hover:underline hover:decoration-orange"
              >
                {product.supplier.name}
              </Link>
              {product.supplier.isPartner ? <PartnerBadge tone="outline" /> : null}
              <TierBadge status={product.supplier.status} />
            </div>
            <dl className="mt-4 text-sm">
              <Row label="Location">{product.supplier.location}</Row>
              <Row label="Website" muted={!product.supplier.website}>
                {product.supplier.website ? (
                  <a
                    href={product.supplier.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-ink/25 underline-offset-[3px] hover:decoration-orange"
                  >
                    {new URL(product.supplier.website).host}
                  </a>
                ) : (
                  "No website published"
                )}
              </Row>
              <Row label="Rating">
                <ReviewScore
                  size="md"
                  reviewScore={product.supplier.reviewScore}
                  reviewCount={product.supplier.reviewCount}
                  reviewPlatform={product.supplier.reviewPlatform}
                  reviewUrl={product.supplier.reviewUrl}
                />
              </Row>
              {product.supplier.legalIdentity ? (
                <Row label="Registered as">{product.supplier.legalIdentity}</Row>
              ) : null}
            </dl>
            <Link
              href={`/suppliers/${product.supplier.slug}`}
              className="mt-4 inline-block text-sm text-ink underline decoration-orange underline-offset-4"
            >
              All {product.supplier.name} products →
            </Link>
          </div>
          {product.description ? (
            <>
              <h3 className="mt-6 text-sm font-medium text-ink">From the listing</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{product.description}</p>
            </>
          ) : null}
        </Section>
      </div>

      {similar.length > 0 ? (
        <section className="mt-20" data-testid="similar-products">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-semiwide text-3xl font-light tracking-[-0.02em] text-ink">
              Similar products from other suppliers
            </h2>
            <Link
              href={`/results?category=${encodeURIComponent(product.categorySlug)}`}
              className="text-sm text-ink underline decoration-ink/20 underline-offset-4 hover:decoration-orange"
            >
              Compare all {product.categoryName}
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
