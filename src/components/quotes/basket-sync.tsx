"use client";

import { useEffect, useRef } from "react";

import { useQuoteBasketStore, type BasketItem } from "@/lib/basket/store";
import { useBasketHydrated } from "@/lib/basket/use-basket";

// Keeps a signed-in buyer's basket in the database. After the browser basket
// hydrates, ask the server for the saved basket: 401/403 means a guest (or a
// non-buyer account) — the browser basket stays the only copy. Otherwise merge
// (browser lines win on quantity, server-only lines are added), then mirror
// every later change back to the server, debounced.

/** Union of two baskets; the local line wins when both have a product. */
export function mergeBaskets(local: BasketItem[], server: BasketItem[]): BasketItem[] {
  const out = [...local];
  const seen = new Set(local.map((i) => i.product.id));
  for (const item of server) if (!seen.has(item.product.id)) out.push(item);
  return out;
}

function payload(items: BasketItem[]) {
  return JSON.stringify({ items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })) });
}

export function BasketSync() {
  const hydrated = useBasketHydrated();
  const enabled = useRef(false);
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/basket", { cache: "no-store" });
        if (!response.ok || cancelled) return; // guest or non-buyer: local only
        const body = (await response.json()) as { items: BasketItem[] };
        const merged = mergeBaskets(useQuoteBasketStore.getState().items, body.items);
        useQuoteBasketStore.setState({ items: merged });
        enabled.current = true;
        const next = payload(merged);
        if (next !== payload(body.items)) {
          lastSent.current = next;
          await fetch("/api/basket", { method: "PUT", headers: { "Content-Type": "application/json" }, body: next });
        } else {
          lastSent.current = next;
        }
      } catch {
        // Offline: the browser copy remains; the next page load retries.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = useQuoteBasketStore.subscribe((state) => {
      if (!enabled.current) return;
      const next = payload(state.items);
      if (next === lastSent.current) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        lastSent.current = next;
        void fetch("/api/basket", { method: "PUT", headers: { "Content-Type": "application/json" }, body: next }).catch(
          () => undefined,
        );
      }, 600);
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return null;
}
