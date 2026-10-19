import { describe, expect, it } from "vitest";

import { makeProduct } from "@/lib/catalog/test-fixtures";

import { mergeBaskets, reconcileBasket } from "./basket-sync";

describe("mergeBaskets", () => {
  it("keeps browser lines (their quantity wins) and adds server-only lines", () => {
    const a = { ...makeProduct(), id: "a" };
    const b = { ...makeProduct(), id: "b" };
    const local = [{ product: a, quantity: 50, addedAt: "2026-10-19T00:00:00Z" }];
    const server = [
      { product: a, quantity: 10, addedAt: "2026-10-01T00:00:00Z" },
      { product: b, quantity: 7, addedAt: "2026-10-02T00:00:00Z" },
    ];
    const merged = mergeBaskets(local, server);
    expect(merged.map((i) => [i.product.id, i.quantity])).toEqual([
      ["a", 50],
      ["b", 7],
    ]);
  });
});

describe("reconcileBasket", () => {
  const a = { product: { ...makeProduct(), id: "a" }, quantity: 5, addedAt: "2026-10-19T00:00:00Z" };
  const b = { product: { ...makeProduct(), id: "b" }, quantity: 7, addedAt: "2026-10-19T00:00:00Z" };
  it("merges a guest basket into the account on sign-in", () => {
    expect(reconcileBasket(null, "u1", [a], [b]).map((i) => i.product.id)).toEqual(["a", "b"]);
  });
  it("trusts the saved basket for the same account (removals elsewhere stick)", () => {
    expect(reconcileBasket("u1", "u1", [a, b], [b]).map((i) => i.product.id)).toEqual(["b"]);
  });
  it("never inherits another account's leftovers", () => {
    expect(reconcileBasket("u2", "u1", [a], []).map((i) => i.product.id)).toEqual([]);
  });
});
