import { describe, expect, it } from "vitest";

import { isVerifiedSupplier, productTags } from "./tags";
import { makeProduct } from "./test-fixtures";

describe("productTags", () => {
  it("leads with certifications and ends with stock/custom", () => {
    expect(productTags(makeProduct({ cert: "FSC" }))).toEqual(["FSC", "Stock"]);
  });

  it("adds Food grade only when the supplier's own wording says so", () => {
    const plain = makeProduct({ cert: null, material: "Glass" });
    expect(productTags(plain)).not.toContain("Food grade");
    const food = makeProduct({ cert: null, material: "Plastic (BPA-free, food-grade)" });
    expect(productTags(food)).toContain("Food grade");
  });

  it("shows Samples only for a verified sample policy", () => {
    expect(productTags(makeProduct({ samplePolicyVerified: true }))).toContain("Samples");
    expect(productTags(makeProduct({ samplePolicyVerified: false }))).not.toContain("Samples");
  });

  it("caps the list", () => {
    const p = makeProduct({ cert: "FSC", samplePolicyVerified: true, material: "food grade kraft" });
    expect(productTags(p, 2)).toHaveLength(2);
  });
});

describe("isVerifiedSupplier", () => {
  it("treats Recommended and Listed as verified", () => {
    expect(isVerifiedSupplier("RECOMMENDED")).toBe(true);
    expect(isVerifiedSupplier("LISTED")).toBe(true);
    expect(isVerifiedSupplier("QUOTE_ONLY")).toBe(false);
    expect(isVerifiedSupplier("PENDING")).toBe(false);
  });
});
