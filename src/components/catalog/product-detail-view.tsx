import Link from "next/link";

import { PriceDisplay } from "./price-display";
import { ProductActions } from "./product-actions";
import { ProductGallery } from "./product-gallery";
import { QuantityBreakTable } from "./quantity-break-table";
import { ReviewScore } from "./review-score";
import { PartnerRibbon, TierBadge } from "./tier-badge";
import { formatCaptureDate, formatLeadTime, formatMoq } from "@/lib/catalog/format";
import type { PartnerFactsVM } from "@/lib/catalog/partner-facts";

/** Label for a value the partner sent us directly, not captured from their page. */
function SuppliedBy({ facts }: { facts: PartnerFactsVM }) {
  return (
    <span className="ml-2 text-xs text-ink-faint">
      supplied by {facts.supplierName}, {formatCaptureDate(facts.suppliedAt)}
    </span>
  );
}
import { productTags } from "@/lib/catalog/tags";
import type { ProductVM } from "@/lib/catalog/view-models";

// Product detail — the "Judge" step: full price panel with quantity breaks,
// MOQ, lead time, certifications, supplier score, and the provenance line
// linking the exact supplier page and capture date (spec C2/C6/C7).
//
// Layout: the packshot as a large catalog plate on the left; on the right a
// spec sheet — identity, price, actions, provenance — then the technical
// table. Imagery is representative and captioned as such (spec art_AjaTUf9x).

export function ProductDetailView({ product }: { product: ProductVM }) {
  const tags = productTags(product, 4);

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

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
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
            <div className="mt-6">
              <ProductActions product={product} />
            </div>
            <div className="mt-5 border-t border-line pt-4">
              <a
                href={product.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="supplier-source-link"
                className="text-sm text-ink underline decoration-ink/25 underline-offset-[3px] hover:decoration-orange"
              >
                {product.sourceUrl.startsWith("/partners/")
                  ? `View ${product.supplier.name}'s catalog (PDF)`
                  : `View on ${product.supplier.name}'s site`}{" "}
                &#8599;
              </a>
            </div>
          </div>

          {product.description ? (
            <p className="mt-8 max-w-prose text-sm leading-relaxed text-ink-muted">{product.description}</p>
          ) : null}

          <h2 className="mt-10 text-sm font-medium text-ink">Specification</h2>
          <dl className="mt-3 border-t border-line text-sm" data-testid="product-specs">
            <div className="grid grid-cols-[9rem_1fr] gap-4 border-b border-line py-3">
              <dt className="tag self-center text-ink-faint">Material:</dt>
              <dd className="text-ink">{product.material}</dd>
            </div>
            <div className="grid grid-cols-[9rem_1fr] gap-4 border-b border-line py-3">
              <dt className="tag self-center text-ink-faint">Min order:</dt>
              <dd
                data-testid="product-moq"
                className={`tabular-nums ${product.moq === null ? "text-ink-faint" : "text-ink"}`}
              >
                {formatMoq(product.moq, product.moqUnit)}
                {product.partnerFacts?.moq ? <SuppliedBy facts={product.partnerFacts} /> : null}
              </dd>
            </div>
            <div className="grid grid-cols-[9rem_1fr] gap-4 border-b border-line py-3">
              <dt className="tag self-center text-ink-faint">Lead time:</dt>
              <dd
                data-testid="product-lead-time"
                className={`tabular-nums ${product.leadTimeDays === null ? "text-ink-faint" : "text-ink"}`}
              >
                {formatLeadTime(product.leadTimeDays)}
                {product.partnerFacts?.leadTime ? <SuppliedBy facts={product.partnerFacts} /> : null}
              </dd>
            </div>
            {product.partnerFacts?.casePack != null ? (
              <div className="grid grid-cols-[9rem_1fr] gap-4 border-b border-line py-3">
                <dt className="tag self-center text-ink-faint">Case pack:</dt>
                <dd data-testid="product-case-pack" className="text-ink tabular-nums">
                  {product.partnerFacts.casePack.toLocaleString("en-US")} units
                  <SuppliedBy facts={product.partnerFacts} />
                </dd>
              </div>
            ) : null}
            <div className="grid grid-cols-[9rem_1fr] gap-4 border-b border-line py-3">
              <dt className="tag self-center text-ink-faint">Type:</dt>
              <dd className="text-ink">{product.stockOrCustom === "STOCK" ? "Stock" : "Custom"}</dd>
            </div>
            {product.certificationNames.length > 0 ? (
              <div className="grid grid-cols-[9rem_1fr] gap-4 border-b border-line py-3">
                <dt className="tag self-center text-ink-faint">Certifications:</dt>
                <dd data-testid="product-certifications" className="text-ink">
                  {product.certificationNames.join(", ")}
                  <span className="ml-1 text-ink-faint">(supplier)</span>
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-10">
            <QuantityBreakTable breaks={product.quantityBreaks} />
          </div>
        </div>
      </div>
    </div>
  );
}
