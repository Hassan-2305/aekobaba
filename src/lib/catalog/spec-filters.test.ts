import { describe, expect, it } from "vitest";

import { applyFilters, computeFacets } from "./filters";
import { specBlockFor } from "./spec-filters";
import { baseFilters, makeProduct, specsOf } from "./test-fixtures";
import type { ProductVM } from "./view-models";

const withText = (title: string, categorySlug: string, categoryName: string, extra: Partial<ProductVM> = {}): ProductVM => {
  const p = { ...makeProduct({ categorySlug, categoryName }), title, ...extra };
  return { ...p, specs: specsOf(p) };
};

const bottle8 = withText("8 oz Amber Boston Round — 28-400 Neck", "glass-bottles", "Glass Bottles");
const bottle2 = withText("2oz (60ml) Flint Boston Round — 20-400 Neck", "glass-bottles", "Glass Bottles");
const box = withText("10 x 8 x 6 Corrugated Boxes (25/Bundle)", "corrugated", "Corrugated", {
  description: "Double wall, 32 ECT",
});
const boxSpecs = { ...box, specs: specsOf(box) };
const all = [bottle8, bottle2, boxSpecs];

describe("category-dependent spec filters", () => {
  it("shows capacity and neck finish for bottles, dimensions/wall/strength for boxes", () => {
    expect(specBlockFor(["glass-bottles"]).keys).toEqual(["cap", "neck", "closure", "finish"]);
    expect(specBlockFor(["corrugated"]).keys).toEqual(["dim", "wall", "strength", "thick"]);
    const bottleFacets = computeFacets(all, { ...baseFilters(), category: "glass-bottles" }, null);
    expect(bottleFacets.specBlock.title).toBe("Container details");
    expect(bottleFacets.specBlock.facets.map((f) => f.key)).toEqual(["cap", "neck", "finish"]);
    const boxFacets = computeFacets(all, { ...baseFilters(), category: "corrugated" }, null);
    expect(boxFacets.specBlock.facets.map((f) => f.key)).toEqual(["dim", "wall", "strength"]);
  });

  it("filters by capacity bucket, neck finish and board specs", () => {
    const f = baseFilters();
    expect(applyFilters(all, { ...f, spec: { ...f.spec, cap: "xs" } }, null)).toEqual([bottle2]);
    expect(applyFilters(all, { ...f, spec: { ...f.spec, neck: "28-400" } }, null)).toEqual([bottle8]);
    expect(applyFilters(all, { ...f, spec: { ...f.spec, wall: "Double wall" } }, null)).toEqual([boxSpecs]);
  });

  it("filters by budget per unit, dropping unpriced listings", () => {
    const cheap = makeProduct({ basePrice: 0.3 });
    const dear = makeProduct({ basePrice: 3 });
    const quote = makeProduct({ basePrice: null, priceType: "QUOTE_ONLY" });
    expect(applyFilters([cheap, dear, quote], { ...baseFilters(), budget: 0.5 }, null)).toEqual([cheap]);
  });
});
