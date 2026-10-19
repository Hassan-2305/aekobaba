import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import {
  createCategoryIndexWalker,
  productImageRows,
  writeProductImages,
} from "../data/image-mapping";
import { parseSeedFile, type SeedProduct, type SeedSupplier } from "../data/seed-schema";

// Same env loading as prisma.config.ts — the documented `npm run db:seed`
// reads DATABASE_URL from .env (dotenv is otherwise only wired for the CLI).
import "dotenv/config";

/**
 * Idempotent seed importer: npm run db:seed
 *
 * Reads data/aekobaba-seed.json, validates it against the provenance schema,
 * and applies it to Postgres in small idempotent transactions (a failed run
 * is fixed by running it again):
 *  - categories upserted by slug
 *  - suppliers upserted by slug
 *  - products upserted by (supplierId, title) — the schema's @@unique pair
 *  - quantity breaks / images / reviews replaced per parent (no natural key)
 *  - certifications upserted by (supplierId, name)
 *  - products no longer in the file are deleted, unless a buyer already
 *    referenced them (request, inquiry, sample, saved list)
 *
 * Re-running against a seeded database updates rows in place; row counts do
 * not grow. No row is ever created without the provenance the schema demands.
 */

const prisma = new PrismaClient({
  // Prisma 7 requires a driver adapter; the connection string comes from
  // DATABASE_URL (local dev: direct Postgres; Supabase: the pooler URL).
  // Prefer the session/direct URL (interactive transactions need it; the
  // transaction pooler doesn't support them). Falls back to DATABASE_URL.
  adapter: new PrismaPg({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  }),
});

type Counts = { created: number; updated: number };
const emptyCounts = (): Counts => ({ created: 0, updated: 0 });
const bump = (counts: Counts, existed: boolean): void => {
  counts[existed ? "updated" : "created"] += 1;
};

function loadSeedFile(): ReturnType<typeof parseSeedFile> {
  const dataPath = path.resolve(import.meta.dirname, "../data/aekobaba-seed.json");
  const raw = JSON.parse(readFileSync(dataPath, "utf8"));
  return parseSeedFile(raw);
}

function checkCategoryReferences(seed: ReturnType<typeof parseSeedFile>): void {
  const known = new Set(seed.categories.map((c) => c.slug));
  const unknown = new Set(
    seed.suppliers
      .flatMap((s) => s.products.map((p) => p.categorySlug))
      .filter((slug) => !known.has(slug)),
  );
  if (unknown.size > 0) {
    throw new Error(
      `Products reference categories missing from the seed file: ${[...unknown].join(", ")}`,
    );
  }
}

async function upsertProduct(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  supplierId: string,
  product: SeedProduct,
  categoryId: string,
  counts: { products: Counts; images: number },
  nextImageIndex: (categorySlug: string) => number,
): Promise<number> {
  const values = {
    supplierId,
    title: product.title,
    description: product.description ?? null,
    material: product.material,
    subcategory: product.subcategory ?? null,
    categoryId,
    priceType: product.priceType,
    basePrice: product.basePrice,
    priceBasis: product.priceBasis,
    priceUnit: product.priceUnit,
    moq: product.moq,
    moqUnit: product.moqUnit,
    leadTimeDays: product.leadTimeDays,
    stockOrCustom: product.stockOrCustom,
    samplePolicyVerified: product.samplePolicyVerified,
    sourceUrl: product.sourceUrl,
    sourceCapturedAt: new Date(product.sourceCapturedAt),
  };

  const existing = await tx.product.findUnique({
    where: { supplierId_title: { supplierId, title: product.title } },
  });
  const saved = existing
    ? await tx.product.update({ where: { id: existing.id }, data: values })
    : await tx.product.create({ data: values });
  bump(counts.products, existing !== null);

  // Breaks carry no natural key — replace them so re-runs converge on the
  // dataset's tier table exactly.
  await tx.quantityBreak.deleteMany({ where: { productId: saved.id } });
  if (product.quantityBreaks.length > 0) {
    await tx.quantityBreak.createMany({
      data: product.quantityBreaks.map((b) => ({
        productId: saved.id,
        minQty: b.minQty,
        maxQty: b.maxQty,
        unitPrice: b.unitPrice,
      })),
    });
  }

  // The representative views (studio, detail, dark studio) per product,
  // assigned by the deterministic category mapping (the stable per-category
  // index rotates variants). Replace per product like the breaks — re-runs
  // never duplicate Image rows.
  // Supplier-provided photography wins; otherwise the representative views.
  const imageRows = product.images?.length
    ? product.images.map((image, sortOrder) => ({
        url: image.url,
        alt: `${image.alt} — ${image.credit}`,
        sortOrder,
      }))
    : productImageRows(product, nextImageIndex(product.categorySlug));
  await writeProductImages(tx, saved.id, imageRows);
  counts.images += imageRows.length;
  return product.quantityBreaks.length;
}

async function upsertSupplier(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  supplier: SeedSupplier,
  counts: { suppliers: Counts },
): Promise<string> {
  const values = {
    slug: supplier.slug,
    name: supplier.name,
    website: supplier.website,
    location: supplier.location,
    legalIdentity: supplier.legalIdentity,
    status: supplier.status,
    isPartner: supplier.isPartner,
    reviewScore: supplier.review?.score ?? null,
    reviewCount: supplier.review?.count ?? 0,
    lastVerifiedAt: new Date(supplier.sourceCapturedAt),
  };

  const existing = await tx.supplier.findUnique({ where: { slug: supplier.slug } });
  const saved = existing
    ? await tx.supplier.update({ where: { id: existing.id }, data: values })
    : await tx.supplier.create({ data: values });
  bump(counts.suppliers, existing !== null);

  if (supplier.review) {
    const r = supplier.review;
    await tx.review.deleteMany({ where: { supplierId: saved.id, sourcePlatform: r.platform } });
    await tx.review.create({
      data: {
        supplierId: saved.id,
        score: r.score,
        sourcePlatform: r.platform,
        reviewedAt: new Date(r.sourceCapturedAt),
        sourceUrl: r.sourceUrl,
        sourceCapturedAt: new Date(r.sourceCapturedAt),
      },
    });
  }

  for (const cert of supplier.certifications) {
    await tx.certification.upsert({
      where: { supplierId_name: { supplierId: saved.id, name: cert.name } },
      create: {
        supplierId: saved.id,
        name: cert.name,
        sourceUrl: cert.sourceUrl,
        sourceCapturedAt: new Date(cert.sourceCapturedAt),
      },
      update: { sourceUrl: cert.sourceUrl, sourceCapturedAt: new Date(cert.sourceCapturedAt) },
    });
  }

  return saved.id;
}

/** Run `fn` over `items` with at most `limit` in flight. */
async function inPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      await fn(item);
    }
  });
  await Promise.all(workers);
}

const PRODUCT_BATCH = 20;
const PARALLEL_BATCHES = 4;
const TX_OPTIONS = { timeout: 2 * 60 * 1000, maxWait: 60 * 1000 };

async function main(): Promise<void> {
  const seed = loadSeedFile();
  checkCategoryReferences(seed);

  const counts = {
    categories: emptyCounts(),
    suppliers: emptyCounts(),
    products: emptyCounts(),
    quantityBreaks: 0,
    images: 0,
    removedProducts: 0,
    keptReferencedProducts: [] as string[],
    disabledSuppliers: 0,
  };

  // Small transactions, not one giant one: hundreds of products against a
  // hosted Postgres outlive any sane interactive-transaction timeout. Each
  // step is idempotent, so a failed run is fixed by simply running it again.

  // 1. Categories, parents before children (the file is pre-ordered).
  const categoryIds = new Map<string, string>();
  await prisma.$transaction(async (tx) => {
    for (const category of seed.categories) {
      const values = { slug: category.slug, name: category.name, description: category.description };
      const existing = await tx.category.findUnique({ where: { slug: category.slug } });
      const saved = existing
        ? await tx.category.update({ where: { id: existing.id }, data: values })
        : await tx.category.create({ data: values });
      bump(counts.categories, existing !== null);
      categoryIds.set(saved.slug, saved.id);
    }
    for (const category of seed.categories) {
      if (category.parentSlug) {
        await tx.category.update({
          where: { slug: category.slug },
          data: { parent: { connect: { slug: category.parentSlug } } },
        });
      }
    }
  }, TX_OPTIONS);

  // Representative-image rotation is order-dependent: assign indexes up front,
  // in file order, so parallel batches stay deterministic.
  const nextImageIndex = createCategoryIndexWalker();
  const imageIndex = new Map<SeedProduct, number>();
  for (const supplier of seed.suppliers) {
    for (const product of supplier.products) {
      if (!product.images?.length) imageIndex.set(product, nextImageIndex(product.categorySlug));
    }
  }

  for (const supplier of seed.suppliers) {
    // 2. The supplier row, its review and certifications.
    const supplierId = await prisma.$transaction(
      (tx) => upsertSupplier(tx, supplier, counts),
      TX_OPTIONS,
    );

    // 3. Its products, in parallel batches.
    const batches: SeedProduct[][] = [];
    for (let i = 0; i < supplier.products.length; i += PRODUCT_BATCH) {
      batches.push(supplier.products.slice(i, i + PRODUCT_BATCH));
    }
    await inPool(batches, PARALLEL_BATCHES, async (batch) => {
      await prisma.$transaction(async (tx) => {
        for (const product of batch) {
          const categoryId = categoryIds.get(product.categorySlug);
          if (!categoryId) {
            throw new Error(`Category "${product.categorySlug}" not found for product "${product.title}"`);
          }
          counts.quantityBreaks += await upsertProduct(tx, supplierId, product, categoryId, counts, () =>
            imageIndex.get(product) ?? 0,
          );
        }
      }, TX_OPTIONS);
    });

    // 4. Products dropped from the file come off the site. Ones a buyer has
    //    already referenced (request, inquiry, sample, saved list) are kept so
    //    their history stays intact — they're reported for manual review.
    const keepTitles = supplier.products.map((p) => p.title);
    const stale = await prisma.product.findMany({
      where: { supplierId, title: { notIn: keepTitles } },
      select: {
        id: true,
        title: true,
        _count: { select: { quoteRequestItems: true, inquiries: true, sampleRequests: true, savedListItems: true } },
      },
    });
    const referenced = stale.filter((p) => Object.values(p._count).some((n) => n > 0));
    const removable = stale.filter((p) => !referenced.includes(p)).map((p) => p.id);
    if (removable.length) {
      const removed = await prisma.product.deleteMany({ where: { id: { in: removable } } });
      counts.removedProducts += removed.count;
    }
    counts.keptReferencedProducts.push(...referenced.map((p) => `${supplier.slug}: ${p.title}`));
    console.log(`  ${supplier.slug}: ${supplier.products.length} products${removable.length ? `, ${removable.length} removed` : ""}`);
  }

  // 5. Suppliers dropped from the seed file are disabled, never deleted:
  //    their products may carry buyer inquiries. Catalog queries hide
  //    DISABLED suppliers and their listings.
  const disabled = await prisma.supplier.updateMany({
    where: { slug: { notIn: seed.suppliers.map((s) => s.slug) }, status: { not: "DISABLED" } },
    data: { status: "DISABLED", isPartner: false },
  });
  counts.disabledSuppliers = disabled.count;

  console.log(
    JSON.stringify(
      {
        result: "seeded",
        categories: counts.categories,
        suppliers: counts.suppliers,
        products: counts.products,
        quantityBreakRows: counts.quantityBreaks,
        imageRows: counts.images,
        removedProducts: counts.removedProducts,
        keptReferencedProducts: counts.keptReferencedProducts,
        disabledSuppliers: counts.disabledSuppliers,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
