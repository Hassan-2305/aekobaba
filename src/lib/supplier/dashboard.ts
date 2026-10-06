import { db } from "@/lib/db";

// Partner lead dashboard data. Every figure is tagged with where it came
// from: "live" numbers are counted from the database; "sample" numbers are
// illustrative placeholders for metrics Aekobaba does not record yet (search
// and view logging) and are always labelled "Sample data" on screen.

export type FigureSource = "live" | "sample";

export interface DashboardFigure {
  label: string;
  value: string;
  source: FigureSource;
  hint?: string;
}

export interface CategoryDemand {
  slug: string;
  name: string;
  listings: number;
  /** Sample: searches matching this category in the last 30 days. */
  searches: number;
}

export interface PartnerDashboard {
  figures: DashboardFigure[];
  categories: CategoryDemand[];
  /** Sample search terms buyers used in the partner's categories. */
  topSearches: { term: string; count: number }[];
}

const DAY = 24 * 60 * 60 * 1000;

/**
 * Sample demand for a category — deterministic (same slug, same number) so
 * the dashboard doesn't change between reloads, and obviously round enough
 * not to be mistaken for a measurement.
 */
export function sampleSearches(slug: string): number {
  let hash = 0;
  for (const ch of slug) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return 200 + (hash % 9) * 100;
}

const SAMPLE_TERMS: Record<string, string[]> = {
  "plastic-bottles": ["honey bear bottle", "8 oz PET bottle", "squeeze bottle"],
  "plastic-jars": ["spice jar", "PET jar with lid", "clear plastic jar"],
  "metal-cans": ["aluminum bottle", "PCR aluminum"],
};

export async function getPartnerDashboard(
  supplierSlug: string,
  listings: { categorySlug: string; categoryName: string }[],
  now: Date = new Date(),
): Promise<PartnerDashboard> {
  const since = new Date(now.getTime() - 30 * DAY);
  const forSupplier = { product: { supplier: { slug: supplierSlug } } };
  const [inquiries, basketItems, inquiriesAllTime, supplierRow] = await Promise.all([
    db.inquiry.count({ where: { ...forSupplier, createdAt: { gte: since } } }),
    db.quoteRequestItem.count({ where: { ...forSupplier, createdAt: { gte: since } } }),
    db.inquiry.count({ where: forSupplier }),
    db.supplier.findUnique({ where: { slug: supplierSlug }, select: { responseTimeHours: true } }),
  ]);
  const responseTimeHours = supplierRow?.responseTimeHours ?? null;

  const byCategory = new Map<string, CategoryDemand>();
  for (const l of listings) {
    const entry = byCategory.get(l.categorySlug) ?? {
      slug: l.categorySlug,
      name: l.categoryName,
      listings: 0,
      searches: sampleSearches(l.categorySlug),
    };
    entry.listings += 1;
    byCategory.set(l.categorySlug, entry);
  }
  const categories = [...byCategory.values()].sort((a, b) => b.searches - a.searches);
  const totalSearches = categories.reduce((n, c) => n + c.searches, 0);

  const topSearches = categories
    .flatMap((c) =>
      (SAMPLE_TERMS[c.slug] ?? [c.name.toLowerCase()]).map((term, i) => ({
        term,
        count: Math.round(c.searches / (2 + i)),
      })),
    )
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return {
    figures: [
      {
        label: "Quote & sample requests (30 days)",
        value: String(inquiries + basketItems),
        source: "live",
        hint: `${inquiriesAllTime} product-page requests all time`,
      },
      {
        label: "Median first response",
        value: responseTimeHours === null ? "—" : `${responseTimeHours} h`,
        source: "live",
        hint: responseTimeHours === null ? "Shown once you answer your first lead" : undefined,
      },
      {
        label: "Searches in your categories (30 days)",
        value: totalSearches.toLocaleString("en-US"),
        source: "sample",
      },
      {
        label: "Listing views (30 days)",
        value: Math.round(totalSearches * 0.6).toLocaleString("en-US"),
        source: "sample",
      },
    ],
    categories,
    topSearches,
  };
}
