import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { parseSeedFile } from "../../../data/seed-schema";
import { INGREDIENT_SUPPLIERS, rankIngredients } from "./ingredient-suppliers";
import { makeProduct } from "./test-fixtures";
import type { ProductVM } from "./view-models";
import { ProductCard } from "@/components/catalog/product-card";
import { ProductConfigurator } from "@/components/catalog/product-configurator";
import { ProductDetailView } from "@/components/catalog/product-detail-view";

// The ingredients section: its own categories in the seed, ranked listings,
// and product pages that read as ingredients (applications, key specs, kg)
// rather than packaging (artwork, food contact, tooling).

const seed = parseSeedFile(
  JSON.parse(readFileSync(path.resolve(import.meta.dirname, "../../../data/aekobaba-seed.json"), "utf8")),
);

const ingredient = (over: Partial<ProductVM> = {}): ProductVM => ({
  ...makeProduct({ priceType: "QUOTE_ONLY", basePrice: null }),
  section: "INGREDIENTS",
  categorySlug: "plant-proteins",
  categoryName: "Plant Proteins & Isolates",
  material: "Lemna leaf protein",
  keySpecs: [{ name: "Protein content", value: "85%" }],
  applications: ["Bakery", "Beverages"],
  images: [{ url: "/suppliers/plantible/rubi-protein-powder.webp", alt: "Rubi Protein powder" }],
  primaryImage: { url: "/suppliers/plantible/rubi-protein-powder.webp", alt: "Rubi Protein powder" },
  ...over,
});

describe("ingredients in the seed", () => {
  const ingredientSlugs = new Set(seed.categories.filter((c) => c.section === "INGREDIENTS").map((c) => c.slug));

  it("keeps ingredient categories in their own section", () => {
    expect([...ingredientSlugs].sort()).toEqual(["egg-replacers-binders", "greens-nutrient-powders", "plant-proteins"]);
  });

  it("lists Plantible only in ingredient categories, flagship first, quote-only, with specs and photos", () => {
    const plantible = seed.suppliers.find((s) => s.slug === "plantible")!;
    expect(plantible.products.map((p) => p.title.split(" — ")[0])).toEqual([
      "Rubi Protein™",
      "Rubi Whisk™",
      "Lemna Leaf Greens™",
      "Rubi Prime™",
    ]);
    for (const p of plantible.products) {
      expect(ingredientSlugs.has(p.categorySlug)).toBe(true);
      expect(p.priceType).toBe("QUOTE_ONLY");
      expect(p.keySpecs?.length).toBeGreaterThan(0);
      expect(p.applications?.length).toBeGreaterThan(0);
      expect(p.images?.length).toBeGreaterThan(0);
    }
  });

  it("never puts packaging suppliers' products in ingredient categories", () => {
    for (const s of seed.suppliers.filter((x) => x.slug !== "plantible")) {
      for (const p of s.products) expect(ingredientSlugs.has(p.categorySlug)).toBe(false);
    }
  });
});

describe("rankIngredients", () => {
  it("puts spotlighted suppliers first and keeps catalog order inside each supplier", () => {
    const other = (title: string) => ({ title, supplier: { slug: "someone-else" } });
    const spot = (title: string) => ({ title, supplier: { slug: INGREDIENT_SUPPLIERS[0].slug } });
    const ranked = rankIngredients([other("a"), spot("flagship"), other("b"), spot("second")]);
    expect(ranked.map((p) => p.title)).toEqual(["flagship", "second", "a", "b"]);
  });
});

describe("ingredient rendering", () => {
  it("badges the card as an ingredient and shows the photo full-bleed", () => {
    const html = renderToStaticMarkup(createElement(ProductCard, { product: ingredient() }));
    expect(html).toContain(">Ingredient<");
    expect(html).toContain("object-cover");
    expect(html).not.toContain("Custom printed");
  });

  it("shows key specs and applications, links back to /ingredients, and drops packaging-only rows", () => {
    const html = renderToStaticMarkup(createElement(ProductDetailView, { product: ingredient() }));
    expect(html).toContain('data-testid="product-key-spec"');
    expect(html).toContain("85%");
    expect(html).toContain('data-testid="product-applications"');
    expect(html).toContain('href="/ingredients"');
    expect(html).toContain("/ingredients?category=plant-proteins");
    expect(html).not.toContain("Typical artwork requirements");
    expect(html).not.toContain("Food contact");
    expect(html).not.toContain('data-testid="product-setup"');
  });

  it("asks for quantities in kg with ingredient-specific requests", () => {
    const html = renderToStaticMarkup(createElement(ProductConfigurator, { product: ingredient(), variants: [] }));
    expect(html).toContain("Quantity (kg)");
    expect(html).toContain("Technical data sheet");
    expect(html).not.toContain("Custom printing / my logo");
  });

  it("leaves packaging pages unchanged", () => {
    const html = renderToStaticMarkup(createElement(ProductDetailView, { product: makeProduct() }));
    expect(html).toContain("Typical artwork requirements");
    expect(html).toContain("Food contact");
    expect(html).not.toContain('href="/ingredients"');
  });
});
