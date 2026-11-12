import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { findSize, lineSpecNotes, sizeLine, sizeMoq, sizeSpecColumns, sizesOf } from "./sizes";
import { makeProduct } from "./test-fixtures";
import type { ProductSizeVM } from "./view-models";
import { ProductCard } from "@/components/catalog/product-card";
import { ProductConfigurator } from "@/components/catalog/product-configurator";
import { BasketLine } from "@/components/quotes/basket-line";

const size = (label: string, over: Partial<ProductSizeVM> = {}): ProductSizeVM => ({
  label,
  sku: null,
  specs: [],
  moq: null,
  moqUnit: null,
  imageUrl: null,
  sourceUrl: null,
  ...over,
});

const bowl = () => {
  const product = makeProduct({ moq: 300 });
  product.sizes = [
    size("500 ml", { sku: "QY-SB500-K1", moq: 300, moqUnit: "pieces", specs: [{ name: "Dimensions", value: "150x132x50 mm" }] }),
    size("750 ml", { sku: "QY-SB750-K", moq: 50000, moqUnit: "pieces", specs: [{ name: "Dimensions", value: "150x123x60 mm" }, { name: "Packing", value: "300 pcs/carton" }] }),
    size("1000 ml"),
  ];
  return product;
};

describe("size helpers", () => {
  it("treats a listing without sizes as single-size", () => {
    expect(sizesOf(makeProduct())).toEqual([]);
    expect(findSize(makeProduct(), "750 ml")).toBeNull();
    expect(lineSpecNotes(makeProduct(), null, "  ")).toBeUndefined();
  });

  it("uses the chosen size's own MOQ, falling back to the listing's", () => {
    const product = bowl();
    expect(sizeMoq(product, "750 ml")).toEqual({ moq: 50000, moqUnit: "pieces" });
    expect(sizeMoq(product, "1000 ml")).toEqual({ moq: 300, moqUnit: "units" });
    expect(sizeMoq(product, null)).toEqual({ moq: 300, moqUnit: "units" });
  });

  it("puts the size (with item number) first in the spec notes sent to the supplier", () => {
    const product = bowl();
    expect(sizeLine(product, "750 ml")).toBe("Size: 750 ml (QY-SB750-K)");
    expect(lineSpecNotes(product, "750 ml", " kraft, PE coated ")).toBe("Size: 750 ml (QY-SB750-K); kraft, PE coated");
    expect(lineSpecNotes(product, "1000 ml", undefined)).toBe("Size: 1000 ml");
  });

  it("collects table columns across sizes in first-seen order", () => {
    expect(sizeSpecColumns(bowl().sizes!)).toEqual(["Dimensions", "Packing"]);
  });
});

describe("size picker rendering", () => {
  it("shows every size with the first one selected and its details", () => {
    const html = renderToStaticMarkup(createElement(ProductConfigurator, { product: bowl(), variants: [] }));
    expect(html.match(/data-testid="size-option"/g)).toHaveLength(3);
    expect(html).toContain('aria-checked="true"');
    expect(html).toContain("QY-SB500-K1");
    expect(html).toContain("150x132x50 mm");
  });

  it("summarises the size range on the card", () => {
    const html = renderToStaticMarkup(createElement(ProductCard, { product: bowl() }));
    expect(html).toContain("3 sizes · 500 ml–1000 ml");
  });

  it("warns against the chosen size's MOQ in the basket", () => {
    const html = renderToStaticMarkup(
      createElement(BasketLine, {
        item: { product: bowl(), quantity: 1000, size: "750 ml", addedAt: "2026-11-12T00:00:00Z" },
        onQuantityChange: () => {},
        onRemove: () => {},
      }),
    );
    expect(html).toContain("Size: 750 ml");
    expect(html).toContain("Minimum 50,000 pieces");
    expect(html).toContain('data-testid="moq-warning"');
  });
});

describe("sizes and sibling variants", () => {
  it("never mixes a size-picker listing into sibling variants", async () => {
    const { variantsOf } = await import("./related");
    const sized = bowl();
    sized.subcategory = "Paper Salad Bowl";
    const a = makeProduct();
    a.subcategory = "Paper Salad Bowl";
    const b = makeProduct();
    b.subcategory = "Paper Salad Bowl";
    expect(variantsOf(sized, [sized, a, b])).toEqual([]);
    expect(variantsOf(a, [sized, a, b]).map((v) => v.id)).not.toContain(sized.id);
  });
});
