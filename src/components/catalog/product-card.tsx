import Image from "next/image";
import Link from "next/link";

import { CardActions } from "./card-actions";
import { SponsoredTag, TierPill } from "./tier-badge";
import { cutoutFor, isRepresentativeImage } from "./product-picture";
import {
  captureAgeDays,
  formatCaptureDate,
  formatMoney,
  formatMoq,
  formatMoqShort,
  formatUnitMoney,
  priceCurrency,
  shortBasis,
  unitPrice,
} from "@/lib/catalog/format";
import { isVerifiedSupplier } from "@/lib/catalog/tags";
import type { ProductVM } from "@/lib/catalog/view-models";

// Product card (v12 marketplace design). Top to bottom: the packshot on a
// grey plate (stock / custom chip, SPONSORED for partners), supplier + tier,
// title, the published price per unit with its currency and the pack it was
// quoted at, minimum order, when the price was checked (freshness dot +
// source link), and the two actions — Quote Basket and Compare.
//
// Truth rules hold: no price → "Ask the supplier", nothing numeric; an
// unpublished MOQ reads "Not published", never zero.

/** Freshness of the published price: ≤30 days, ≤60 days, older. */
export function freshness(days: number): "fresh" | "stale" | "old" {
  return days <= 30 ? "fresh" : days <= 60 ? "stale" : "old";
}
const FRESH_DOT = { fresh: "bg-fresh", stale: "bg-stale", old: "bg-old" } as const;

export function ProductCard({ product, now }: { product: ProductVM; now?: Date }) {
  const image = product.primaryImage;
  const cutout = image ? cutoutFor(image.url) : null;
  const unit = unitPrice(product);
  const currency = priceCurrency(product.priceBasis);
  const basis = shortBasis(product.priceBasis);
  const days = captureAgeDays(product.sourceCapturedAt, now);
  const partner = product.supplier.isPartner;
  const unitLabel = unit?.unit ?? "unit";
  const imageAlt = image
    ? isRepresentativeImage(image.url)
      ? `${image.alt ?? product.title} — representative image`
      : (image.alt ?? product.title)
    : `Representative image of ${product.title}`;

  return (
    <article
      data-testid="product-card"
      data-product-id={product.id}
      data-partner={partner ? "true" : undefined}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-line-strong bg-card transition-shadow hover:shadow-[0_18px_40px_-24px_rgba(24,26,33,.35)]"
    >
      <Link
        href={`/products/${product.id}`}
        aria-label={`View ${product.title}`}
        tabIndex={-1}
        className="relative flex aspect-[4/3] items-center justify-center border-b border-line bg-well"
      >
        {image ? (
          <span className="relative block h-[78%] w-[64%]">
            <Image
              src={cutout ?? image.url}
              alt={imageAlt}
              fill
              sizes="(min-width: 1280px) 220px, (min-width: 640px) 30vw, 60vw"
              className={`object-contain ${cutout ? "drop-shadow-[0_10px_10px_rgba(24,26,33,.14)]" : "mix-blend-multiply"}`}
            />
          </span>
        ) : (
          <span className="flex flex-col items-center gap-2.5">
            <span className="tag flex h-24 w-[72px] items-center justify-center rounded-[10px] border-[1.5px] border-dashed border-[#9CA3AF] bg-paper text-ink-muted">
              {product.categoryName.split(" ")[0]}
            </span>
            <span className="text-[13px] text-ink-muted">Supplier photo pending</span>
          </span>
        )}
        <span className="absolute left-2.5 top-2.5 rounded-[5px] bg-paper px-2 py-0.5 text-xs font-semibold text-ink">
          {product.stockOrCustom === "STOCK" ? "Stock item" : "Custom printed"}
        </span>
        {partner ? (
          <span className="absolute right-2.5 top-2.5">
            <SponsoredTag />
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-1.5 text-[13px] text-ink-muted">
          <Link href={`/suppliers/${product.supplier.slug}`} className="relative z-20 min-w-0 truncate hover:text-ink hover:underline">
            {product.supplier.name}
          </Link>
          <TierPill status={product.supplier.status} />
        </div>
        <h3 className="mt-1.5 line-clamp-2 min-h-[2.6em] text-base font-semibold leading-[1.3] text-ink">
          <Link href={`/products/${product.id}`} className="after:absolute after:inset-0 after:z-10 hover:underline">
            {product.title}
          </Link>
        </h3>

        {product.basePrice === null ? (
          <div data-testid="price-tag" className="mt-3.5">
            <p className="tag text-ink-muted">Price on request</p>
            <p className="mt-1 text-[22px] font-semibold leading-tight tracking-[-0.03em]">Ask the supplier</p>
            <p className="mt-1.5 text-[13px] text-ink-muted">Quote-only listing · the supplier prices your quantity</p>
          </div>
        ) : (
          <div data-testid="price-tag" className="mt-3.5">
            <p className="tag text-ink-muted">
              {product.priceType === "FROM"
                ? "From-price"
                : product.priceType === "CALCULATOR"
                  ? "Configurator price"
                  : "Published price"}{" "}
              · {currency}
            </p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[30px] font-semibold leading-none tracking-[-0.035em] tabular-nums">
                {unit ? formatUnitMoney(unit.amount, unit.currency) : formatMoney(product.basePrice, currency)}
              </span>
              {unit ? (
                <span className="text-sm text-ink-muted">/ {unitLabel}</span>
              ) : (
                <span className="min-w-0 truncate text-sm text-ink-muted">{basis ?? "per pack"}</span>
              )}
            </p>
            <p className="mt-1.5 truncate text-[13px] text-ink-muted tabular-nums">
              {unit && unit.packSize > 1
                ? `${formatMoney(product.basePrice, currency)} ${basis ?? ""}`
                : unit
                  ? `Price ${basis ?? `per ${unitLabel}`}`
                  : "Pack size not published — ask for the per-item price"}
            </p>
            <p className="mt-0.5 text-[13px] text-ink-muted">Excludes shipping, tax and setup</p>
          </div>
        )}

        <div className="mt-3.5 flex justify-between gap-3 border-t border-line pt-3 text-sm">
          <span className="text-ink-muted">Minimum order</span>
          <span
            title={formatMoq(product.moq, product.moqUnit)}
            className={`truncate text-right font-semibold ${product.moq === null ? "text-ink-faint" : "text-ink"}`}
          >
            {formatMoqShort(product.moq, product.moqUnit)}
          </span>
        </div>
        {product.partnerFacts?.moq ? (
          <p data-testid="partner-supplied" className="mt-0.5 text-right text-[11px] text-ink-faint">
            MOQ supplied by {product.partnerFacts.supplierName}, {formatCaptureDate(product.partnerFacts.suppliedAt)}
          </p>
        ) : null}
        <div data-testid="price-checked" className="mt-2.5 flex items-center gap-[7px] text-[13px]">
          <span aria-hidden className={`h-2 w-2 flex-none rounded-full ${FRESH_DOT[freshness(days)]}`} />
          <span className="min-w-0 truncate">
            Checked {formatCaptureDate(product.sourceCapturedAt).replace(/ \d{4}$/, "")} · {days} days ago
          </span>
          <a
            href={product.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-20 ml-auto flex-none font-medium text-orange-ink hover:text-orange"
          >
            Source ↗
          </a>
        </div>
        {isVerifiedSupplier(product.supplier.status) ? (
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-ink-muted">
            <span className="font-semibold text-success-ink">✓</span>Verified supplier
          </p>
        ) : null}

        <CardActions product={product} unitLabel={unitLabel} />
      </div>
    </article>
  );
}
