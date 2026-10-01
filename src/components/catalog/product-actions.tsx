"use client";

// Product action buttons — prop-driven so pages and tests inject handlers.
// Click handlers resolve through src/lib/integrations/product-actions.ts
// (the named integration point); the Quote Basket PR wires real store calls
// there without touching this component.

import { defaultProductActionHandlers } from "@/lib/integrations/product-actions";
import type { ProductVM } from "@/lib/catalog/view-models";

export interface ProductActionsProps {
  product: ProductVM;
  onAddToQuoteBasket?: (product: ProductVM) => void;
  onAddToShortlist?: (product: ProductVM) => void;
  onCompare?: (product: ProductVM) => void;
  onRequestSample?: (product: ProductVM) => void;
}

export function ProductActions({
  product,
  onAddToQuoteBasket = defaultProductActionHandlers.onAddToQuoteBasket,
  onAddToShortlist = defaultProductActionHandlers.onAddToShortlist,
  onCompare = defaultProductActionHandlers.onCompare,
  onRequestSample = defaultProductActionHandlers.onRequestSample,
}: ProductActionsProps) {
  const secondary =
    "h-10 border border-line px-4 text-sm text-ink transition-colors hover:border-ink";

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        data-testid="add-to-quote-basket"
        onClick={() => onAddToQuoteBasket(product)}
        className="h-12 w-full bg-orange px-5 text-sm font-medium text-void transition-colors hover:bg-orange-hi"
      >
        Add to Quote Basket
      </button>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="add-to-shortlist"
          onClick={() => onAddToShortlist(product)}
          className={`${secondary} flex-1`}
        >
          Add to Shortlist
        </button>
        <button type="button" data-testid="compare" onClick={() => onCompare(product)} className={`${secondary} flex-1`}>
          Compare
        </button>
        {/* The sample button never lies (spec C7): rendered only when the
            supplier's sample policy is verified. */}
        {product.samplePolicyVerified ? (
          <button
            type="button"
            data-testid="request-sample"
            onClick={() => onRequestSample(product)}
            className={`${secondary} flex-1 border-orange/50 hover:border-orange`}
          >
            Request Sample
          </button>
        ) : null}
      </div>
    </div>
  );
}
