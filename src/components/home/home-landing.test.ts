import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HomeLanding } from "./home-landing";
import { POPULAR_CATEGORY_SLUGS } from "@/lib/catalog/popular";
import { makeProduct } from "@/lib/catalog/test-fixtures";
import type { CategoryVM } from "@/lib/catalog/view-models";

// Rendered-DOM verification for the redesigned home: featured rail renders
// product cards, popular tiles render image + name and keep their test ids,
// and the PR #9 material-only rule holds (no use-case entries in navigation).

const render = (node: React.ReactElement): string => renderToStaticMarkup(node);

function makeCategory(slug: string, name: string, productCount = 3): CategoryVM {
  return { slug, name, description: null, productCount };
}

// The five popular slugs plus a couple of non-popular material categories and
// a use-case-looking row that must never surface as a navigation entry.
const categories: CategoryVM[] = [
  makeCategory("mailers", "Mailers", 16),
  makeCategory("pouches-bags", "Pouches & Bags", 13),
  makeCategory("corrugated", "Corrugated Boxes", 9),
  makeCategory("glass-bottles", "Glass Bottles", 8),
  makeCategory("labels", "Labels", 5),
  makeCategory("glass-jars", "Glass Jars", 4),
  makeCategory("coffee-gift-sets", "Coffee Gift Sets", 2),
];

const featured = [
  makeProduct({ categorySlug: "mailers", categoryName: "Mailers" }),
  makeProduct({ categorySlug: "glass-bottles", categoryName: "Glass Bottles" }),
];

describe("HomeLanding — hero", () => {
  it("has one visible headline, the search form, quick filters, and the still life", () => {
    const html = render(createElement(HomeLanding, { categories, featured }));

    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain("sourced properly.");
    // The old question is not repeated as a second headline.
    expect(html).not.toContain("What are you packaging?");
    expect(html).toContain('role="search"');
    expect(html).toContain('data-testid="quick-filters"');
    expect(html).toContain('href="/results?maxMoq=100"');
    expect(html).toContain('href="/results?food=1"');
    expect(html).toContain('data-testid="studio-still"');
    expect(html).toContain("glass-bottle-amber.webp");
  });

  it("renders one hero for both themes (no theme-specific layouts)", () => {
    const html = render(createElement(HomeLanding, { categories, featured }));

    expect(html.match(/data-testid="hero-studio"/g)).toHaveLength(1);
    expect(html.match(/id="hero-search"/g)).toHaveLength(1);
    expect(html).not.toContain('dark:hidden" data-testid="hero-studio');
  });

  it("links and annotates shelf objects only for categories with listings", () => {
    const html = render(createElement(HomeLanding, { categories, featured })).replace(
      /<!-- -->/g,
      "",
    );

    // Glass Bottles has products → linked with its live count.
    expect(html).toContain('aria-label="Glass Bottles — 8 products"');
    // A category with no listings is never advertised from the shelf.
    const empty = categories.map((c) =>
      c.slug === "glass-bottles" ? { ...c, productCount: 0 } : c,
    );
    const emptyHtml = render(createElement(HomeLanding, { categories: empty, featured }));
    expect(emptyHtml).not.toContain('aria-label="Glass Bottles — 0 products"');
  });

  it("shows the supplier count in the hero rail when provided", () => {
    const html = render(
      createElement(HomeLanding, { categories, featured, supplierCount: 26 }),
    ).replace(/<!-- -->/g, "");

    expect(html).toContain("from 26 suppliers");
  });
});

describe("HomeLanding — featured rail", () => {
  it("renders the featured products as product cards", () => {
    const html = render(createElement(HomeLanding, { categories, featured }));

    expect(html).toContain('data-testid="featured-rail"');
    expect(html.match(/data-testid="product-card"/g)).toHaveLength(featured.length);
    expect(html).toContain(featured[0].title);
  });

  it("renders the rail after the category index, with no second category list", () => {
    const html = render(createElement(HomeLanding, { categories, featured }));

    const exploreAt = html.indexOf('data-testid="explore-card"');
    const railAt = html.indexOf('data-testid="featured-rail-section"');

    expect(exploreAt).toBeGreaterThan(-1);
    expect(railAt).toBeGreaterThan(exploreAt);
    expect(html).not.toContain('data-testid="category-grid"');
    expect(html).not.toContain("Every category");
  });

  it("renders no rail section when there are no featured products", () => {
    const html = render(createElement(HomeLanding, { categories, featured: [] }));

    expect(html).not.toContain('data-testid="featured-rail"');
  });
});

describe("HomeLanding — grouped category index", () => {
  it("groups live categories under buyer-facing groups with pre-filtered links", () => {
    const html = render(createElement(HomeLanding, { categories, featured }));

    const groups = [...html.matchAll(/data-group="([^"]+)"/g)].map((m) => m[1]);
    expect(groups).toEqual(["containers", "flexible", "labels", "shipping"]);
    // Every live grouped category is listed once.
    expect(html.match(/data-testid="explore-card"/g)).toHaveLength(6);
    expect(html).toContain('href="/results?category=pouches-bags"');
    expect(html).toContain('data-entry="glass-jars"');
  });

  it("shows each group with a packshot (light) and a cut-out (dark)", () => {
    const html = render(createElement(HomeLanding, { categories, featured }));

    expect(html).toContain("glass-bottle.png");
    expect(html).toContain("cutouts%2Fglass-bottle.webp");
  });

  it("hides empty categories behind 'Coming soon' with a supplier request", () => {
    const withEmpty = [...categories, makeCategory("aerosols", "Aerosol Cans", 0)];
    const html = render(createElement(HomeLanding, { categories: withEmpty, featured })).replace(
      /<!-- -->/g,
      "",
    );

    expect(html).not.toContain('data-entry="aerosols"');
    expect(html).toContain('data-testid="coming-soon"');
    expect(html).toContain("Aerosol Cans");
    expect(html).toContain("Request a supplier");
    expect(html).not.toContain("0 products");
  });
});

describe("HomeLanding — material-only navigation (PR #9 guard)", () => {
  it("never surfaces use-case rows as explore entries", () => {
    const html = render(createElement(HomeLanding, { categories, featured }));

    // Every explore entry is a grouped material category; the use-case-looking
    // row (in no group) never appears.
    const allowed = new Set<string>([...POPULAR_CATEGORY_SLUGS, "glass-jars"]);
    const entries = [...html.matchAll(/data-entry="([^"]+)"/g)].map((match) => match[1]);
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(allowed.has(entry)).toBe(true);
    }
    expect(entries).not.toContain("coffee-gift-sets");
  });
});

describe("HomeLanding — studio hero", () => {
  it("shows the explore strip with live counts only", () => {
    const html = render(createElement(HomeLanding, { categories, featured }));
    expect(html).toContain('data-testid="explore-strip"');
    const empty = categories.map((c) => ({ ...c, productCount: 0 }));
    const emptyHtml = render(createElement(HomeLanding, { categories: empty, featured }));
    expect(emptyHtml).not.toContain('data-testid="explore-card"');
  });
});
