import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HomeLanding } from "./home-landing";
import { makeProduct, specsOf } from "@/lib/catalog/test-fixtures";
import type { CategoryVM, ProductVM } from "@/lib/catalog/view-models";

// v12 home: one headline + pill search, a category box by group, the
// supplier strip, how-it-works with real listings, popular products, our
// suppliers, the sponsored partner spotlight, FAQ and CTA — all live data.

const render = (node: React.ReactElement): string => renderToStaticMarkup(node).replace(/<!-- -->/g, "");
const cat = (slug: string, name: string, productCount: number): CategoryVM => ({ slug, name, description: null, productCount });

const categories: CategoryVM[] = [
  cat("glass-bottles", "Glass Bottles", 2),
  cat("pouches-bags", "Flexible Pouches & Bags", 1),
  cat("aerosols", "Aerosol Cans", 0),
];

const withTitle = (p: ProductVM, title: string, extra: Partial<ProductVM> = {}): ProductVM => {
  const next = { ...p, title, ...extra };
  return { ...next, specs: specsOf(next) };
};
const bottleA = withTitle(makeProduct({ categorySlug: "glass-bottles", categoryName: "Glass Bottles", basePrice: 0.65, moq: 128 }), "4 oz Amber Boston Round", { priceBasis: "per bottle (USD)" });
const otherSupplier = { ...makeProduct().supplier, slug: "burch", name: "Burch Bottle" };
const bottleB = withTitle(makeProduct({ categorySlug: "glass-bottles", categoryName: "Glass Bottles", basePrice: 0.78, moq: 12 }), "4 oz Flint Boston Round", { priceBasis: "per bottle (USD)", supplier: otherSupplier });
const pouch = withTitle(makeProduct({ categorySlug: "pouches-bags", categoryName: "Flexible Pouches & Bags", basePrice: null, priceType: "QUOTE_ONLY" }), "Custom Stand-Up Pouch");
const products = [bottleA, bottleB, pouch];

describe("HomeLanding (v12)", () => {
  it("has one headline, the pill search and live totals", () => {
    const html = render(createElement(HomeLanding, { categories, products }));
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain("All your packaging.");
    expect(html).toContain('role="search"');
    expect(html).toContain('id="hero-search"');
    expect(html).toContain("Browse all 3 products");
    expect(html).toContain("2 verified suppliers");
  });

  it("shows category tiles per group with live counts and Coming soon", () => {
    const html = render(createElement(HomeLanding, { categories, products }));
    expect(html).toContain('data-testid="category-box"');
    expect(html).toContain('href="/results?category=glass-bottles"');
    expect(html).toContain("2 products");
    expect(html).toContain("Coming soon");
  });

  it("renders popular products as v12 cards and the how-it-works examples from real listings", () => {
    const html = render(createElement(HomeLanding, { categories, products }));
    expect(html).toContain('data-testid="featured-rail"');
    expect(html).toContain('data-testid="product-card"');
    expect(html).toContain("Real prices, before you ask.");
    expect(html).toContain("Per 100 ml");
    expect(html).toContain("One basket. Every supplier.");
  });

  it("lists suppliers with tiers, the FAQ and the CTA", () => {
    const html = render(createElement(HomeLanding, { categories, products }));
    expect(html).toContain("Our suppliers");
    expect(html).toContain('data-testid="tier-badge"');
    expect(html).toContain("Frequently asked questions");
    expect(html).toContain("How do sponsored listings work?");
    expect(html).toContain("Let’s get you sourcing.");
  });

  it("shows the partner spotlight only when a partner is given, labelled sponsored", () => {
    const without = render(createElement(HomeLanding, { categories, products }));
    expect(without).not.toContain('data-testid="partner-spotlight"');
    const partnerProduct = { ...bottleA, supplier: { ...bottleA.supplier, isPartner: true, slug: "berlin-packaging", name: "Berlin Packaging" } };
    const html = render(
      createElement(HomeLanding, {
        categories,
        products,
        partner: {
          profile: { slug: "berlin-packaging", name: "Berlin Packaging", tagline: "", summary: "", facts: [], services: [], perks: [], capturedAt: "2026-10-02", logoUrl: "/partners/berlin-packaging/logo.svg", brandColor: "#E21A22" },
          products: [partnerProduct],
        },
      }),
    );
    expect(html).toContain('data-testid="partner-spotlight"');
    expect(html).toContain("Partner spotlight · paid placement");
    expect(html).toContain("Sponsored");
  });
});
