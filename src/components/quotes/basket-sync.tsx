"use client";

import { useEffect, useRef } from "react";

import { useQuoteBasketStore, type BasketItem } from "@/lib/basket/store";
import { useBasketHydrated } from "@/lib/basket/use-basket";

// Keeps a signed-in buyer's basket in the database. The browser remembers
// which account its basket belongs to ("owner"):
//   - guest basket (no owner) + sign-in → merged into the account basket;
//   - same account → the saved basket wins (removals on other devices stick);
//   - another account's leftovers → dropped, never merged;
//   - sign-out → the browser copy is cleared.
// After that, every change is mirrored to the server (debounced). userKey
// comes from the layout, so this re-runs on sign-in/out soft navigations.

const OWNER_KEY = "aekobaba-basket-owner";

function readOwner(): string | null {
  try {
    return globalThis.localStorage?.getItem(OWNER_KEY) ?? null;
  } catch {
    return null;
  }
}

function writeOwner(owner: string | null): void {
  try {
    if (owner) globalThis.localStorage?.setItem(OWNER_KEY, owner);
    else globalThis.localStorage?.removeItem(OWNER_KEY);
  } catch {
    // Storage blocked: the basket simply isn't remembered across loads.
  }
}

/** Union of two baskets; the local line wins when both have a product. */
export function mergeBaskets(local: BasketItem[], server: BasketItem[]): BasketItem[] {
  const out = [...local];
  const seen = new Set(local.map((i) => i.product.id));
  for (const item of server) if (!seen.has(item.product.id)) out.push(item);
  return out;
}

/** Which basket to keep when an account's saved basket arrives. */
export function reconcileBasket(
  owner: string | null,
  userKey: string,
  local: BasketItem[],
  server: BasketItem[],
): BasketItem[] {
  if (owner === null) return mergeBaskets(local, server); // guest basket joins the account
  return server; // same account: saved copy wins; other account: leftovers dropped
}

function payload(items: BasketItem[]) {
  return JSON.stringify({ items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })) });
}

async function put(body: string): Promise<boolean> {
  try {
    const response = await fetch("/api/basket", { method: "PUT", headers: { "Content-Type": "application/json" }, body });
    return response.ok;
  } catch {
    return false;
  }
}

export function BasketSync({ userKey }: { userKey: string | null }) {
  const hydrated = useBasketHydrated();
  const enabled = useRef(false);
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    enabled.current = false;
    const owner = readOwner();

    if (!userKey) {
      // Signed out: a basket that belonged to an account leaves with it.
      if (owner) {
        useQuoteBasketStore.setState({ items: [] });
        writeOwner(null);
      }
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/basket", { cache: "no-store" });
        if (!response.ok || cancelled) return; // not a buyer account: local only
        const body = (await response.json()) as { items: BasketItem[] };
        const next = reconcileBasket(owner, userKey, useQuoteBasketStore.getState().items, body.items);
        useQuoteBasketStore.setState({ items: next });
        writeOwner(userKey);
        const nextPayload = payload(next);
        lastSent.current = payload(body.items);
        enabled.current = true;
        if (nextPayload !== lastSent.current && (await put(nextPayload))) lastSent.current = nextPayload;
      } catch {
        // Offline: the browser copy remains; the next page load retries.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, userKey]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = useQuoteBasketStore.subscribe((state) => {
      if (!enabled.current) return;
      const next = payload(state.items);
      if (next === lastSent.current) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void put(next).then((ok) => {
          if (ok) lastSent.current = next;
        });
      }, 600);
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return null;
}
