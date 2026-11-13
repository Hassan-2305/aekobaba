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

describe("sizes priced separately", () => {
  const chips = () => {
    const product = makeProduct({ priceType: "FROM", basePrice: 1.22, moq: 200 });
    product.priceBasis = "per bag (USD); price varies by size and quantity";
    product.sizes = [
      size("4.5×6 in", { moq: 200, moqUnit: "units", basePrice: 1.22, quantityBreaks: [{ minQty: 200, maxQty: 999, unitPrice: 1.22 }, { minQty: 1000, maxQty: null, unitPrice: 0.49 }] }),
      size("8.5×13 in", { moq: 200, moqUnit: "units", basePrice: 1.99, quantityBreaks: [{ minQty: 200, maxQty: 999, unitPrice: 1.99 }, { minQty: 1000, maxQty: null, unitPrice: 0.75 }] }),
    ];
    return product;
  };

  it("prices the listing as the chosen size, tiers included", async () => {
    const { pricedAsSize, hasSizePrices } = await import("./sizes");
    const { priceAtQuantity } = await import("./related");
    const product = chips();
    expect(hasSizePrices(product)).toBe(true);
    expect(priceAtQuantity(pricedAsSize(product, "8.5×13 in"), 1000)?.perUnit).toBe(0.75);
    expect(priceAtQuantity(pricedAsSize(product, "4.5×6 in"), 200)?.perUnit).toBe(1.22);
    // Unpriced or unknown sizes leave the listing as published.
    expect(pricedAsSize(product, "nope")).toBe(product);
  });

  it("shows the chosen size's price in the picker and in the basket", () => {
    const html = renderToStaticMarkup(createElement(ProductConfigurator, { product: chips(), variants: [] }));
    expect(html).toContain('data-testid="size-price"');
    expect(html).toContain("$1.22 at 200+");
    const line = renderToStaticMarkup(
      createElement(BasketLine, {
        item: { product: chips(), quantity: 200, size: "8.5×13 in", addedAt: "2026-11-13T00:00:00Z" },
        onQuantityChange: () => {},
        onRemove: () => {},
      }),
    );
    expect(line).toContain("$1.99");
  });
});
