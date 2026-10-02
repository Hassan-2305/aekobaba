import { describe, expect, it } from "vitest";

import { buildDirectory } from "./supplier-directory";
import { makeProduct } from "@/lib/catalog/test-fixtures";

describe("buildDirectory", () => {
  it("groups listings per supplier and ranks by tier, then catalog size", () => {
    const base = makeProduct();
    const listed = {
      ...base.supplier,
      slug: "listed-co",
      name: "Listed Co",
      status: "LISTED" as const,
    };
    const recommended = {
      ...base.supplier,
      slug: "rec-co",
      name: "Rec Co",
      status: "RECOMMENDED" as const,
    };
    const products = [
      { ...makeProduct(), supplier: listed },
      { ...makeProduct(), supplier: listed },
      { ...makeProduct(), supplier: recommended },
    ];
    const directory = buildDirectory(products);
    expect(directory.map((d) => d.supplier.slug)).toEqual(["rec-co", "listed-co"]);
    expect(directory[1].productCount).toBe(2);
  });
});
