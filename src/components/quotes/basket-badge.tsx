"use client";

import Link from "next/link";

import { useQuoteBasketStore } from "@/lib/basket/store";
import { useBasketHydrated } from "@/lib/basket/use-basket";

// Header basket island — the one piece of client JS the server-rendered
// header carries. The count appears only after the persisted basket is
// restored (never during hydration), and only when there is something in it.

export function BasketBadge() {
  const hydrated = useBasketHydrated();
  const count = useQuoteBasketStore((state) => state.items.length);

  return (
    <Link
      href="/basket"
      data-testid="basket-link"
      className="relative flex h-9 items-center gap-2 whitespace-nowrap border border-line-dark px-3 text-on-dark/90 transition-colors hover:border-on-dark/40 hover:text-on-dark"
    >
      <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3.5 8.5 12 4l8.5 4.5v8L12 21l-8.5-4.5z" />
        <path d="M3.5 8.5 12 13l8.5-4.5M12 13v8" />
      </svg>
      <span className="text-sm">Quote Basket</span>
      {hydrated && count > 0 ? (
        <span
          data-testid="basket-count"
          className="inline-flex h-5 min-w-5 items-center justify-center bg-orange px-1 text-xs font-semibold tabular-nums text-void"
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}
