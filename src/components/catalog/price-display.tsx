import { formatMoney, formatPerUnit, formatPriceLine, priceTypeLabel } from "@/lib/catalog/format";
import type { ProductVM } from "@/lib/catalog/view-models";

// Price panel (spec C2): price → basis → per-unit figure. When the supplier
// does not publish a price this renders "Ask the supplier" and NOTHING
// numeric — no $ sign, no estimate, not even in data attributes. A unit test
// asserts exactly that for a null-price fixture.

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

  const perUnit = formatPerUnit(product.priceUnit);
  return (
    <div data-testid="published-price">
      <p className="tag text-ink-faint">{priceTypeLabel(product.priceType)}</p>
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

/** Compact price for catalog objects: "From $0.39" / "$1.23" / "Ask the supplier". */
export function PriceTagInline({ product }: { product: ProductVM }) {
  if (product.basePrice === null) {
    return <span className="text-sm font-medium text-ink">Ask the supplier</span>;
  }
  return (
    <span className="font-semiwide text-lg font-medium leading-none tracking-tight text-ink tabular-nums">
      {product.priceType === "FROM" ? <span className="mr-1 text-xs font-normal text-ink-muted">From</span> : null}
      {formatMoney(product.basePrice)}
    </span>
  );
}
