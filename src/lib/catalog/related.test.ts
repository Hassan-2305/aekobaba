import { describe, expect, it } from "vitest";

import { defaultQuantity, priceAtQuantity, similarProducts, variantsOf } from "./related";
import { specSheetCsv, specSheetRows } from "./spec-sheet";
import { makeProduct, specsOf } from "./test-fixtures";
import type { ProductVM } from "./view-models";

const withTitle = (p: ProductVM, title: string, extra: Partial<ProductVM> = {}): ProductVM => {
  const next = { ...p, title, ...extra };
  return { ...next, specs: specsOf(next) };
};
const berlin = { ...makeProduct().supplier, slug: "berlin-packaging", name: "Berlin Packaging", isPartner: true };

const bear8 = withTitle(makeProduct({ categorySlug: "plastic-bottles" }), "8 oz Honey Bear Bottles (Cap Not Included) — 3351B09-B", { subcategory: "Honey bear bottle", supplier: berlin });
const bear8cap = withTitle(makeProduct({ categorySlug: "plastic-bottles" }), "8 oz Honey Bear Bottles (Yellow Flip Top Cap) — 3351B09", { subcategory: "Honey bear bottle", supplier: berlin });
const bear17 = withTitle(makeProduct({ categorySlug: "plastic-bottles" }), "17 oz Honey Bear Bottles (Cap Not Included) — 324050", { subcategory: "Honey bear bottle", supplier: berlin });
const other8 = withTitle(makeProduct({ categorySlug: "plastic-bottles" }), "8 oz PET Bottle", { subcategory: "Honey bear bottle" });
const other32 = withTitle(makeProduct({ categorySlug: "plastic-bottles" }), "32 oz PET Bottle", { subcategory: "Honey bear bottle" });

describe("variantsOf", () => {
  it("groups the same supplier's listings of one product type, small to large", () => {
    const v = variantsOf(bear8cap, [bear17, bear8, bear8cap, other8]);
    expect(v.map((x) => x.id)).toEqual([bear8.id, bear8cap.id, bear17.id]);
    expect(v[1]).toMatchObject({ label: "8 oz · Yellow Flip Top Cap", sku: "3351B09", active: true });
  });

  it("has no variants without a subtype or a sibling", () => {
    expect(variantsOf(other8, [other8])).toEqual([]);
  });
});

describe("similarProducts", () => {
  it("picks other suppliers in the category, nearest size first", () => {
    // other8 shares other32's supplier, so it is not "another supplier".
    expect(similarProducts(other32, [bear8, bear17, other8, other32]).map((p) => p.id)).toEqual([bear17.id, bear8.id]);
    expect(similarProducts(bear8, [bear8, bear17, other8, other32]).map((p) => p.id)).toEqual([other8.id, other32.id]);
  });
});

describe("priceAtQuantity", () => {
  it("uses the published tier for per-item listings", () => {
    const p = { ...makeProduct({ basePrice: 0.65 }), priceBasis: "per bottle (USD)", quantityBreaks: [
      { minQty: 1, maxQty: 127, unitPrice: 0.65 },
      { minQty: 128, maxQty: 999, unitPrice: 0.62 },
      { minQty: 1000, maxQty: null, unitPrice: 0.56 },
    ] };
    expect(priceAtQuantity(p, 500)).toMatchObject({ perUnit: 0.62, total: 310, basis: "tier", tierLabel: "128–999" });
    expect(priceAtQuantity(p, 2000)?.tierLabel).toBe("1000+");
  });

  it("falls back to the per-unit list price, and is null without a price", () => {
    const pack = { ...makeProduct({ basePrice: 9.15 }), priceBasis: "per case of 24 jars (USD)" };
    expect(priceAtQuantity(pack, 48)?.total).toBeCloseTo(18.3);
    expect(priceAtQuantity(makeProduct({ basePrice: null }), 10)).toBeNull();
  });

  it("starts at the published MOQ", () => {
    expect(defaultQuantity(makeProduct({ moq: 500 }))).toBe(500);
    expect(defaultQuantity(makeProduct({ moq: null }))).toBe(1);
  });
});

describe("spec sheet", () => {
  it("lists published values and marks the rest 'Not published'", () => {
    const rows = Object.fromEntries(specSheetRows(bear8));
    expect(rows["Supplier"]).toBe("Berlin Packaging");
    expect(rows["Capacity"]).toBe("8 oz (235 ml)");
    expect(rows["Setup / tooling"]).toBe("Not published");
    expect(specSheetCsv(bear8).startsWith("Field,Value\r\n")).toBe(true);
  });
});
