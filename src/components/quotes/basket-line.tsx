import { formatMoq, formatPerUnit, formatPriceLine, formatPriceRange, shortBasis } from "@/lib/catalog/format";
import { moqPackSize } from "@/lib/catalog/format";
import { assessMoq } from "@/lib/quotes/moq";
import { sizeMoq, sizesOf } from "@/lib/catalog/sizes";
import type { BasketItem } from "@/lib/basket/store";
import { ProductPicture } from "@/components/catalog/product-picture";
import { QuantityInput } from "@/components/catalog/quantity-input";

// One basket line — presentational, prop-driven, no store or API access so
// tests can server-render it. The MOQ warning renders from the supplier's
// published minimum only; a null MOQ never warns (nothing published to be
// below — spec submission honesty).

export interface BasketLineProps {
  item: BasketItem;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  /** Change the chosen size; the picker only renders when this is passed and the listing has sizes. */
  onSizeChange?: (productId: string, size: string) => void;
}

export function BasketLine({ item, onQuantityChange, onRemove, onSizeChange }: BasketLineProps) {
  const { product, quantity } = item;
  const sizes = sizesOf(product);
  const minimum = sizeMoq(product, item.size);
  const moq = assessMoq(quantity, minimum.moq, minimum.moqUnit, moqPackSize(product));

  const image = product.primaryImage;

  return (
    <div
      data-testid="basket-line"
      className="grid grid-cols-[64px_minmax(0,1fr)] gap-4 border-b border-line py-5 sm:grid-cols-[80px_minmax(0,1fr)_auto]"
    >
      <div className="relative aspect-square bg-well">
        {image ? (
          <ProductPicture
            src={image.url}
            alt={`${image.alt ?? product.title} — representative image`}
            sizes="80px"
            className="p-2"
          />
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-snug text-ink">{product.title}</p>
        <p className="mt-1 text-xs text-ink-faint">
          {product.supplier.name} · {product.material} · {product.categoryName}
        </p>
        {sizes.length > 0 ? (
          onSizeChange ? (
            <label className="mt-2 flex items-center gap-2 text-xs text-ink-muted">
              Size
              <select
                data-testid="basket-size"
                value={item.size ?? ""}
                onChange={(event) => onSizeChange(product.id, event.target.value)}
                className="h-8 border border-line bg-paper px-2 text-xs text-ink focus:border-ink focus:outline-none"
              >
                <option value="" disabled>
                  Choose a size
                </option>
                {sizes.map((size) => (
                  <option key={size.label} value={size.label}>
                    {size.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p data-testid="basket-size" className="mt-2 text-xs text-ink-muted">
              Size: {item.size ?? "not chosen"}
            </p>
          )
        ) : null}
        <p className="mt-2 text-sm text-ink tabular-nums">
          {formatPriceRange(product)
            ? `${formatPriceRange(product)} ${shortBasis(product.priceBasis) ?? ""}${product.priceType === "ESTIMATE" ? " · Aekobaba estimate" : ""}`.trim()
            : formatPriceLine(product.basePrice, product.priceBasis)}
        </p>
        <p className="text-xs text-ink-muted tabular-nums">
          {formatPerUnit(product.priceUnit) ?? ""}
          {product.priceUnit !== null && minimum.moq !== null ? " · " : ""}
          {minimum.moq !== null ? `Minimum ${formatMoq(minimum.moq, minimum.moqUnit)}` : ""}
        </p>
        {moq.message ? (
          <p
            data-testid="moq-warning"
            role="note"
            className="mt-3 border-l-2 border-amber-500 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900"
          >
            {moq.message}
          </p>
        ) : null}
      </div>
      <div className="col-start-2 flex items-center gap-4 sm:col-start-auto sm:flex-col sm:items-end sm:justify-between">
        <div className="flex items-center gap-2">
          <label className="tag text-ink-faint" htmlFor={`basket-qty-${product.id}`}>
            Qty
          </label>
          <QuantityInput
            value={quantity}
            onCommit={(n) => onQuantityChange(product.id, n)}
            ariaLabel={`Quantity for ${product.title}`}
            testId="basket-quantity"
            className="h-9 w-24 border border-line bg-card px-2 text-right text-sm text-ink tabular-nums focus:border-ink focus:outline-none"
          />
        </div>
        <button
          type="button"
          data-testid="basket-remove"
          onClick={() => onRemove(product.id)}
          className="text-xs text-ink-faint underline-offset-4 hover:text-red-700 hover:underline"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
