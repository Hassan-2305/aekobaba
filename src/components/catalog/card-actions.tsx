"use client";

import Link from "next/link";

import { useBasketHydrated } from "@/lib/basket/use-basket";
import { useQuoteBasketStore } from "@/lib/basket/store";
import { COMPARE_MAX, useCompareHydrated, useCompareStore } from "@/lib/compare/store";
import type { ProductVM } from "@/lib/catalog/view-models";

// The card's two actions (v12): Add to Quote Basket (turns green once added,
// showing the quantity) and Compare (up to four; comparing never adds to the
// basket), plus the Details link.

export function CardActions({ product, unitLabel }: { product: ProductVM; unitLabel: string }) {
  const basketReady = useBasketHydrated();
  const compareReady = useCompareHydrated();
  const line = useQuoteBasketStore((s) => s.items.find((i) => i.product.id === product.id));
  const addProduct = useQuoteBasketStore((s) => s.addProduct);
  const selected = useCompareStore((s) => s.items);
  const toggle = useCompareStore((s) => s.toggle);
  const setOpen = useCompareStore((s) => s.setOpen);

  const inBasket = basketReady && line !== undefined;
  const on = compareReady && selected.some((p) => p.id === product.id);
  const full = compareReady && !on && selected.length >= COMPARE_MAX;

  return (
    <div className="relative z-20 mt-auto flex flex-col gap-2 pt-4">
      <button
        type="button"
        data-testid="card-add-basket"
        onClick={() => addProduct(product)}
        className={`h-11 rounded-md border-[1.5px] text-sm font-semibold transition-colors ${
          inBasket
            ? "border-[#9ED3B5] bg-success-tint text-success-deep"
            : "border-ink bg-ink text-paper hover:bg-ink/85"
        }`}
      >
        {inBasket
          ? `✓ In Quote Basket · ${line!.quantity.toLocaleString("en-US")} ${unitLabel}${line!.quantity === 1 ? "" : "s"}`
          : "Add to Quote Basket"}
      </button>
      <div className="flex items-center gap-2">
        <button
          type="button"
          data-testid="card-compare"
          aria-pressed={on}
          disabled={full}
          onClick={() => {
            toggle(product);
            if (!on && selected.length + 1 >= 2) setOpen(false);
          }}
          className={`flex h-10 flex-1 items-center gap-2.5 rounded-md border px-2.5 text-left text-sm font-medium transition-colors disabled:opacity-45 ${
            on ? "border-orange bg-orange-tint" : "border-line-strong bg-paper hover:border-ink"
          }`}
        >
          <span
            aria-hidden
            className={`flex h-[18px] w-[18px] flex-none items-center justify-center rounded-[4px] border-[1.5px] border-ink text-[11px] text-paper ${on ? "bg-ink" : "bg-paper"}`}
          >
            {on ? "✓" : ""}
          </span>
          {on ? "Comparing" : full ? `Compare full (${COMPARE_MAX}/${COMPARE_MAX})` : "Compare"}
        </button>
        <Link href={`/products/${product.id}`} className="flex h-10 flex-none items-center px-1.5 text-sm font-medium text-orange-ink hover:text-orange">
          Details →
        </Link>
      </div>
    </div>
  );
}
