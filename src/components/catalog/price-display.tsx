import {
  formatMoney,
  formatPerUnit,
  formatPriceLine,
  formatUnitMoney,
  priceCurrency,
  priceTypeLabel,
  shortBasis,
  unitPrice,
} from "@/lib/catalog/format";
import type { ProductVM } from "@/lib/catalog/view-models";

// Price panel (spec C2): price → basis → per-unit figure. When the supplier
// does not publish a price this renders "Ask the supplier" and NOTHING
// numeric — no $ sign, no estimate, not even in data attributes. A unit test
// asserts exactly that for a null-price fixture.
//
// Prices are shown in the currency the supplier published them in (£, €, ₹…)
// with the currency code beside non-dollar prices — never silently converted.
// The normalized per-unit figure divides a pack price by the pack size the
// supplier states, so $9.15 for a case of 24 compares against $0.60 a bottle.

export function PriceDisplay({
  product,
  size = "md",
}: {
  product: Pick<ProductVM, "basePrice" | "priceBasis" | "priceUnit" | "priceType">;
  size?: "md" | "lg";
}) {
  const priceClass = `font-semiwide font-medium tracking-tight text-ink tabular-nums ${
    size === "lg" ? "text-3xl" : "text-xl"
  }`;

  if (product.basePrice === null) {
    return (
      <div data-testid="ask-supplier-price">
        <p className="tag text-ink-faint">Price on request</p>
        <p data-testid="price-line" className={`mt-2 ${priceClass}`}>
          Ask the supplier
        </p>
        {product.priceBasis ? <p className="mt-1 text-xs text-ink-muted">{product.priceBasis}</p> : null}
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
          This supplier does not publish a price — request a quote to get one.
        </p>
      </div>
    );
  }

  const currency = priceCurrency(product.priceBasis);
  const unit = unitPrice(product);
  const perUnit =
    unit && unit.packSize !== 1 ? formatPerUnit(unit.amount, unit.currency, unit.unit) : null;
  return (
    <div data-testid="published-price">
      <p className="tag text-ink-faint">
        {priceTypeLabel(product.priceType)}
        {currency !== "USD" ? <span className="ml-2 text-ink-muted">Prices in {currency}</span> : null}
      </p>
      <p data-testid="price-line" className={`mt-2 ${priceClass}`}>
        {formatPriceLine(product.basePrice, product.priceBasis)}
      </p>
      {perUnit ? (
        <p data-testid="per-unit" className="mt-1 text-xs text-ink-muted tabular-nums">
          {perUnit}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Compact price for catalog objects. Leads with the comparable per-unit
 * figure ("£0.074 / bag"), then the price as published ("£73.72 per 1000
 * bags"). Without a published price: "Ask the supplier", no numerals.
 */
export function PriceTagInline({ product }: { product: ProductVM }) {
  if (product.basePrice === null) {
    return <span className="text-sm font-medium text-ink">Ask the supplier</span>;
  }
  const currency = priceCurrency(product.priceBasis);
  const unit = unitPrice(product);
  const basis = shortBasis(product.priceBasis);
  const from = product.priceType === "FROM" ? (
    <span className="mr-1 text-xs font-normal text-ink-muted">From</span>
  ) : null;
  const code =
    currency !== "USD" ? (
      <span
        className="ml-1.5 align-middle text-[10px] font-medium tracking-[0.06em] text-ink-muted"
        title={`Published in ${currency} — not converted`}
      >
        {currency}
      </span>
    ) : null;

  if (unit && unit.packSize !== 1) {
    return (
      <span data-testid="price-tag" className="block min-w-0">
        <span className="font-semiwide text-lg font-medium leading-none tracking-tight text-ink tabular-nums">
          {from}
          {formatUnitMoney(unit.amount, unit.currency)}
          <span className="ml-0.5 text-xs font-normal text-ink-muted">/ {unit.unit}</span>
          {code}
        </span>
        <span className="mt-1 block truncate text-xs text-ink-muted tabular-nums">
          {formatMoney(product.basePrice, currency)} {basis ?? ""}
        </span>
      </span>
    );
  }

  return (
    <span data-testid="price-tag" className="block min-w-0">
      <span className="font-semiwide text-lg font-medium leading-none tracking-tight text-ink tabular-nums">
        {from}
        {formatMoney(product.basePrice, currency)}
        {unit ? <span className="ml-0.5 text-xs font-normal text-ink-muted">/ {unit.unit}</span> : null}
        {code}
      </span>
      {!unit && basis ? (
        <span className="mt-1 block truncate text-xs text-ink-muted">{basis}</span>
      ) : null}
    </span>
  );
}
