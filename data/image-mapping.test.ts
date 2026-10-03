import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { parseSeedFile, type SeedFile, type SeedProduct } from "./seed-schema";
import {
  categoryImageAsset,
  createCategoryIndexWalker,
  CATEGORY_VARIANTS,
  PRODUCT_VIEWS,
  productImageRow,
  productImageRows,
  writePrimaryImage,
  writeProductImages,
  type ProductImageRow,
} from "./image-mapping";

// The mapping contract, checked against the real seed dataset: every product
// resolves to exactly one primary representative image, deterministically,
// and writing it twice leaves exactly one Image row per product.

function loadSeed(): SeedFile {
  const raw = JSON.parse(
    readFileSync(path.resolve(import.meta.dirname, "aekobaba-seed.json"), "utf8"),
  );
  return parseSeedFile(raw);
}

/** All products in seed-file order — the same walk the importer performs. */
function seededProducts(seed: SeedFile): { supplierSlug: string; product: SeedProduct }[] {
  return seed.suppliers.flatMap((s) =>
    s.products.map((product) => ({ supplierSlug: s.slug, product })),
  );
}

/** Map every seeded product to its image row, exactly as the importer does. */
function mapAllProducts(seed: SeedFile): { key: string; row: ProductImageRow }[] {
  const nextIndex = createCategoryIndexWalker();
  return seededProducts(seed).map(({ supplierSlug, product }) => ({
    key: `${supplierSlug}/${product.title}`,
    row: productImageRow(product, nextIndex(product.categorySlug)),
  }));
}

describe("seed image mapping", () => {
  const seed = loadSeed();

  it("maps every seeded product to exactly one primary image", () => {
    const products = seededProducts(seed);
    expect(products).toHaveLength(79);

    const rows = mapAllProducts(seed);
    expect(rows).toHaveLength(products.length);
    for (const { row } of rows) {
      expect(row.url).toMatch(/^\/products\/[a-z0-9-]+\.png$/);
      expect(row.sortOrder).toBe(0);
    }
  });

  it("has a mapping entry for every category in the taxonomy, including empty ones", () => {
    for (const category of seed.categories) {
      expect(
        CATEGORY_VARIANTS[category.slug],
        `missing mapping for ${category.slug}`,
      ).toBeDefined();
      expect(CATEGORY_VARIANTS[category.slug].length).toBeGreaterThan(0);
    }
  });

  it("resolves to the same image across two mapping runs (deterministic)", () => {
    const first = mapAllProducts(seed);
    const second = mapAllProducts(seed);
    expect(second).toEqual(first);
  });

  it("labels every image as representative in the alt text", () => {
    for (const { row } of mapAllProducts(seed)) {
      expect(row.alt).toContain("representative");
      expect(row.alt.endsWith(" — representative packaging image")).toBe(true);
    }
  });

  it("gives the deepest category (mailers) variety across both of its variants", () => {
    // Rotation's job is variety across a category's grid run.
    const urls = mapAllProducts(seed).map((r) => r.row.url);
    const mailerUrls = new Set(urls.filter((url) => url.startsWith("/products/mailer")));
    expect(mailerUrls.size).toBe(2);
  });

  it("only references packshot files that exist under public/products/", () => {
    const publicDir = path.resolve(import.meta.dirname, "../public/products");
    const referenced = new Set(mapAllProducts(seed).map(({ row }) => row.url));
    for (const url of referenced) {
      expect(existsSync(path.join(publicDir, path.basename(url))), `missing asset ${url}`).toBe(
        true,
      );
    }
  });

  it("seeding twice yields exactly one Image row per product (idempotent)", async () => {
    // In-memory stand-in for the Image table: a missing delete-before-create
    // shows up as row growth on the second pass.
    const rowsByProduct = new Map<string, number>();
    let total = 0;
    const fakeTx = {
      image: {
        deleteMany: async ({ where }: { where: { productId: string } }) => {
          total -= rowsByProduct.get(where.productId) ?? 0;
          rowsByProduct.delete(where.productId);
        },
        createMany: async ({
          data,
        }: {
          data: { productId: string; url: string; alt: string; sortOrder: number }[];
        }) => {
          for (const row of data) {
            rowsByProduct.set(row.productId, (rowsByProduct.get(row.productId) ?? 0) + 1);
            total += 1;
          }
        },
      },
    };

    for (let run = 0; run < 2; run++) {
      for (const { key, row } of mapAllProducts(seed)) {
        await writePrimaryImage(fakeTx, key, row);
      }
    }

    expect(total).toBe(79);
  });
});

describe("categoryImageAsset", () => {
  it("returns the category's archetypal (first-variant) packshot", () => {
    expect(categoryImageAsset("pouches-bags")).toBe("/products/stand-up-pouch.png");
    expect(categoryImageAsset("mailers")).toBe("/products/mailer-bag.png");
  });

  it("resolves an asset for every category slug in the seed dataset", () => {
    for (const category of loadSeed().categories) {
      expect(categoryImageAsset(category.slug), `no tile asset for "${category.slug}"`).toMatch(
        /^\/products\/[a-z0-9-]+\.png$/,
      );
    }
  });

  it("returns null for slugs outside the mapping table", () => {
    expect(categoryImageAsset("not-a-category")).toBeNull();
  });
});

describe("productImageRows — the per-product gallery", () => {
  const sample = {
    categorySlug: "glass-bottles",
    title: "8 oz Amber Boston Round",
    material: "Glass (amber)",
    subcategory: null,
  };

  it("writes studio, detail and dark views, primary first, all labelled representative", () => {
    const rows = productImageRows(sample, 0);
    expect(rows.map((r) => r.sortOrder)).toEqual([0, 1, 2]);
    expect(rows[0].url).toBe("/products/glass-bottle-amber.png");
    expect(rows[1].url).toBe("/products/views/glass-bottle-amber-detail.webp");
    expect(rows[2].url).toBe("/products/views/glass-bottle-amber-dark.webp");
    for (const row of rows) expect(row.alt).toContain("representative");
  });

  it("has a view file on disk for every asset in the mapping", () => {
    for (const variants of Object.values(CATEGORY_VARIANTS)) {
      for (const asset of variants) {
        for (const view of PRODUCT_VIEWS) {
          const file = view.suffix
            ? `public/products/views/${asset}-${view.suffix}.webp`
            : `public/products/${asset}.png`;
          expect(existsSync(file), file).toBe(true);
        }
      }
    }
  });

  it("re-writing views leaves exactly the view rows (idempotent)", async () => {
    const store: { productId: string; url: string }[] = [];
    const fakeTx = {
      image: {
        deleteMany: async ({ where }: { where: { productId: string } }) => {
          for (let i = store.length - 1; i >= 0; i--)
            if (store[i].productId === where.productId) store.splice(i, 1);
        },
        createMany: async ({ data }: { data: { productId: string; url: string }[] }) => {
          store.push(...data);
        },
      },
    };
    const rows = productImageRows(sample, 0);
    await writeProductImages(fakeTx, "p1", rows);
    await writeProductImages(fakeTx, "p1", rows);
    expect(store).toHaveLength(PRODUCT_VIEWS.length);
  });
});

describe("dark-theme cut-outs", () => {
  it("has a transparent cut-out for every packshot in the mapping", () => {
    for (const variants of Object.values(CATEGORY_VARIANTS)) {
      for (const asset of variants) {
        expect(existsSync(`public/products/cutouts/${asset}.webp`), asset).toBe(true);
      }
    }
  });
});
