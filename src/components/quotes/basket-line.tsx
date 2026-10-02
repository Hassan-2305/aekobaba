import { formatMoq, formatPerUnit, formatPriceLine } from "@/lib/catalog/format";
import { assessMoq } from "@/lib/quotes/moq";
import type { BasketItem } from "@/lib/basket/store";
import { ProductPicture } from "@/components/catalog/product-picture";

// One basket line — presentational, prop-driven, no store or API access so
// tests can server-render it. The MOQ warning renders from the supplier's
// published minimum only; a null MOQ never warns (nothing published to be
// below — spec submission honesty).

export interface BasketLineProps {
  item: BasketItem;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

export function BasketLine({ item, onQuantityChange, onRemove }: BasketLineProps) {
  const { product, quantity } = item;
  const moq = assessMoq(quantity, product.moq, product.moqUnit);

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
        <p className="mt-2 text-sm text-ink tabular-nums">
          {formatPriceLine(product.basePrice, product.priceBasis)}
        </p>
        <p className="text-xs text-ink-muted tabular-nums">
          {formatPerUnit(product.priceUnit) ?? ""}
          {product.priceUnit !== null && product.moq !== null ? " · " : ""}
          {product.moq !== null ? `Minimum ${formatMoq(product.moq, product.moqUnit)}` : ""}
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
          <input
            id={`basket-qty-${product.id}`}
            data-testid="basket-quantity"
            type="number"
            min={1}
            value={quantity}
            onChange={(event) =>
              onQuantityChange(product.id, Math.max(1, Number(event.target.value) || 1))
            }
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
