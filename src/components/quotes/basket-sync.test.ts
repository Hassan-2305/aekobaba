import { describe, expect, it } from "vitest";

import { makeProduct } from "@/lib/catalog/test-fixtures";

import { mergeBaskets } from "./basket-sync";

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
