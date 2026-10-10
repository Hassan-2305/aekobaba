import Link from "next/link";

import { ArrowCorner } from "@/components/brand/icons";
import { formatCaptureDate, formatLeadTime, formatMoq } from "@/lib/catalog/format";
import { productTags } from "@/lib/catalog/tags";
import type { ProductVM } from "@/lib/catalog/view-models";
import { PriceTagInline } from "./price-display";
import { ReviewScore } from "./review-score";
import { PartnerRibbon, TierBadge } from "./tier-badge";
import { isRepresentativeImage, ProductPicture } from "@/components/catalog/product-picture";

// Catalog object — the results-grid card. The packshot sits in a warm image
// well (multiplied so the studio backdrop dissolves into it), labelled with
// the category and real metadata tags; below it, a spec sheet: title,
// supplier + tier, price, MOQ / lead time / material, and the provenance line.
//
// The whole card links to the product page via the title link's stretched
// :after overlay; the supplier and provenance links keep their own z-layer so
// they stay clickable on top of it. Orange appears only on interaction.

export function ProductCard({ product }: { product: ProductVM }) {
  const image = product.primaryImage;
  // The "representative" label is a hard requirement: generated packshots are
  // illustrative, never supplier photography (spec honesty rule).
  const imageAlt = image
    ? isRepresentativeImage(image.url)
      ? `${image.alt ?? product.title} — representative image`
      : (image.alt ?? product.title)
    : `Representative image of ${product.title}`;
  const tags = productTags(product, 2);
  const partner = product.supplier.isPartner;
  const facts = product.partnerFacts ?? null;
  const partnerNote = facts
    ? `${[
        facts.moq ? "MOQ" : null,
        facts.leadTime ? "lead time" : null,
        facts.casePack !== null ? `case of ${facts.casePack.toLocaleString("en-US")}` : null,
      ]
        .filter(Boolean)
        .join(", ")
        .replace(/^./, (c) => c.toUpperCase())} supplied by ${facts.supplierName}, ${formatCaptureDate(facts.suppliedAt)}`
    : null;
  const unpublished = [
    product.moq === null ? "MOQ" : null,
    product.leadTimeDays === null ? (product.moq === null ? "lead time" : "Lead time") : null,
  ].filter((fact): fact is string => fact !== null);

  return (
    <article
      data-testid="product-card"
      data-product-id={product.id}
      data-partner={partner ? "true" : undefined}
      className={`group relative flex h-full flex-col bg-card shadow-[0_1px_0_rgba(11,14,18,.06)] transition-shadow duration-300 hover:shadow-[0_24px_48px_-28px_rgba(11,14,18,.35)] ${
        partner ? "ring-1 ring-partner-accent/35 hover:ring-partner-accent/70" : ""
      }`}
    >
      <Link
        href={`/products/${product.id}`}
        aria-label={`View ${product.title}`}
        tabIndex={-1}
        className="block"
      >
        <div className="relative aspect-square overflow-hidden bg-well">
          {image ? (
            <ProductPicture
              src={image.url}
              alt={imageAlt}
              sizes="(min-width: 1280px) 340px, (min-width: 640px) 45vw, 100vw"
              className="p-8"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-ink-faint">
              No image available
            </div>
          )}
          {partner ? <PartnerRibbon className="absolute left-0 top-3 z-10" /> : null}
          <span
            aria-hidden
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center bg-ink text-paper opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          >
            <ArrowCorner size={15} />
          </span>
          {image && isRepresentativeImage(image.url) ? (
            <span
              data-testid="image-source"
              title="Generated illustration of this packaging type, not the supplier's own photo"
              className="absolute bottom-3 right-3 z-10 text-[10px] text-ink-faint"
            >
              Illustrative image
            </span>
          ) : null}
          {tags.length > 0 ? (
            <ul
              className="absolute bottom-3 left-4 flex flex-wrap gap-1.5"
              aria-label="Product attributes"
            >
              {tags.map((tag) => (
                <li key={tag} className="tag bg-card/85 px-1.5 py-1 text-ink">
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-4">
        <p className="tag mb-1.5 truncate text-[10.5px] text-ink-faint">{product.categoryName}</p>
        <h3 className="line-clamp-2 min-h-[2.5rem] text-[15px] font-medium leading-snug text-ink">
          <Link
            href={`/products/${product.id}`}
            className="decoration-orange decoration-2 underline-offset-4 after:absolute after:inset-0 after:z-10 group-hover:underline"
          >
            {product.title}
          </Link>
        </h3>

        <div className="mt-2 flex items-center justify-between gap-3">
          <Link
            href={`/suppliers/${product.supplier.slug}`}
            className="relative z-20 min-w-0 truncate text-xs text-ink-muted hover:text-ink hover:underline"
          >
            {product.supplier.name}
          </Link>
          <TierBadge status={product.supplier.status} />
        </div>
        <div className="mt-1.5">
          <ReviewScore
            reviewScore={product.supplier.reviewScore}
            reviewCount={product.supplier.reviewCount}
            reviewPlatform={product.supplier.reviewPlatform}
            reviewUrl={product.supplier.reviewUrl}
          />
        </div>

        <div className="mt-4">
          <PriceTagInline product={product} />
        </div>

        {/* Only published facts get a cell; unknowns collapse into one muted
            line instead of repeating "not published" down every card. */}
        <dl className="mt-4 grid grid-cols-2 border-t border-line text-xs">
          {product.moq !== null ? (
            <div
              className={`py-2.5 pr-3 ${product.leadTimeDays !== null ? "border-r border-line" : "col-span-2"}`}
            >
              <dt className="tag text-ink-faint">Min order:</dt>
              <dd className="mt-1.5 truncate text-ink tabular-nums">
                {formatMoq(product.moq, product.moqUnit)}
              </dd>
            </div>
          ) : null}
          {product.leadTimeDays !== null ? (
            <div className={`py-2.5 ${product.moq !== null ? "pl-3" : "col-span-2"}`}>
              <dt className="tag text-ink-faint">Lead time:</dt>
              <dd className="mt-1.5 text-ink tabular-nums">
                {formatLeadTime(product.leadTimeDays)}
              </dd>
            </div>
          ) : null}
          <div
            className={`col-span-2 py-2.5 ${product.moq !== null || product.leadTimeDays !== null ? "border-t border-line" : ""}`}
          >
            <dt className="tag text-ink-faint">Material:</dt>
            <dd className="mt-1.5 truncate text-ink">{product.material}</dd>
          </div>
        </dl>
        {unpublished.length > 0 ? (
          <p data-testid="unpublished-facts" className="pb-2.5 text-[11px] text-ink-faint">
            {unpublished.join(" and ")} not published — ask in your quote.
          </p>
        ) : null}
        {partnerNote ? (
          <p data-testid="partner-supplied" className="pb-2.5 text-[11px] text-ink-muted">
            {partnerNote}
          </p>
        ) : null}

      </div>
    </article>
  );
}
