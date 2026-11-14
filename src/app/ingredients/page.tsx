import type { Metadata } from "next";
import Link from "next/link";

import { IngredientSpotlight } from "@/components/catalog/ingredient-spotlight";
import { ProductCard } from "@/components/catalog/product-card";
import { INGREDIENT_SUPPLIERS, rankIngredients } from "@/lib/catalog/ingredient-suppliers";
import { getIngredientCategories, getIngredientProducts } from "@/lib/catalog/queries";

// Ingredients section: food & beverage ingredient suppliers, kept apart from
// the packaging marketplace. Spotlighted suppliers open the page; the grid
// below lists every ingredient, strongest products first, filterable by
// ingredient category (?category=<slug>).

export const metadata: Metadata = {
  title: "Ingredient suppliers",
  description:
    "Food and beverage ingredients — functional plant proteins, egg replacers and greens — from suppliers verified on their own websites.",
};

// Catalog pages render at request time — the build must never need a database.
export const dynamic = "force-dynamic";

interface IngredientsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function IngredientsPage({ searchParams }: IngredientsPageProps) {
  const params = await searchParams;
  const rawCategory = Array.isArray(params.category) ? params.category[0] : params.category;
  const [all, categories] = await Promise.all([getIngredientProducts(), getIngredientCategories()]);
  const withProducts = categories.filter((c) => c.productCount > 0);
  const active = withProducts.find((c) => c.slug === rawCategory) ?? null;
  const ranked = rankIngredients(all);
  const shown = active ? ranked.filter((p) => p.categorySlug === active.slug) : ranked;
  const supplierCount = new Set(all.map((p) => p.supplier.slug)).size;

  const spotlights = INGREDIENT_SUPPLIERS.flatMap((profile) => {
    const products = ranked.filter((p) => p.supplier.slug === profile.slug);
    return products.length > 0 ? [{ profile, products, name: products[0].supplier.name }] : [];
  });

  const chip = (selected: boolean) =>
    `inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm transition-colors ${
      selected ? "border-ink bg-ink text-paper" : "border-line-strong text-ink hover:border-ink"
    }`;

  return (
    <div>
      <section className="grain border-b border-line-dark bg-void text-on-dark">
        <div className="mx-auto max-w-[1400px] px-5 pb-10 pt-12 sm:px-8 lg:px-12 lg:pb-12 lg:pt-16">
          <p className="tag text-on-dark-muted">Aekobaba · Ingredients</p>
          <h1 className="mt-3 font-semiwide text-4xl font-light leading-[1.02] tracking-[-0.03em] sm:text-5xl">
            Ingredient suppliers
            <span className="ml-4 align-middle font-sans text-sm font-normal tracking-normal text-on-dark-muted tabular-nums">
              {all.length} ingredient{all.length === 1 ? "" : "s"} · {supplierCount} supplier
              {supplierCount === 1 ? "" : "s"}
            </span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-on-dark-muted">
            What goes inside the pack: functional proteins, egg replacers and nutrient powders for food and
            beverage brands. Every listing comes from the supplier&rsquo;s own website, with sources and dates —
            request a quote, technical data sheet or R&amp;D sample in one step.
          </p>
          <p className="mt-5 text-sm">
            <Link href="/results" className="text-on-dark underline decoration-on-dark/30 underline-offset-4 hover:decoration-orange">
              Looking for packaging? Browse packaging suppliers →
            </Link>
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-5 pb-24 pt-10 sm:px-8 lg:px-12">
        {!active && spotlights.length > 0 ? (
          <section aria-label="Supplier spotlight" className="mb-14 space-y-6">
            {spotlights.map(({ profile, products, name }) => (
              <IngredientSpotlight key={profile.slug} profile={profile} name={name} products={products} />
            ))}
          </section>
        ) : null}

        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-semiwide text-2xl font-light tracking-[-0.02em] text-ink sm:text-3xl">
            {active ? active.name : "All ingredients"}
          </h2>
          <p className="text-sm text-ink-muted tabular-nums">{shown.length} listed</p>
        </div>
        {active?.description ? <p className="mt-2 max-w-2xl text-sm text-ink-muted">{active.description}</p> : null}

        <nav aria-label="Ingredient categories" className="-mx-5 mt-5 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0">
          <ul className="flex gap-2">
            <li>
              <Link href="/ingredients" className={chip(!active)} aria-current={!active ? "page" : undefined}>
                All <span className="tabular-nums opacity-70">{all.length}</span>
              </Link>
            </li>
            {withProducts.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/ingredients?category=${encodeURIComponent(c.slug)}`}
                  className={chip(active?.slug === c.slug)}
                  aria-current={active?.slug === c.slug ? "page" : undefined}
                >
                  {c.name} <span className="tabular-nums opacity-70">{c.productCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {shown.length > 0 ? (
          <ul data-testid="ingredient-grid" className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {shown.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-8 text-sm text-ink-muted">No ingredients listed in this category yet.</p>
        )}

        <section className="mt-16 grid gap-6 rounded-xl border border-line bg-well p-6 sm:p-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-center">
          <div>
            <h2 className="text-lg font-medium text-ink">Sell food or beverage ingredients?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
              Aekobaba connects packaged-goods brands with the suppliers behind their products — packaging and now
              ingredients. List your ingredients with your own specs, applications and sample policy.
            </p>
          </div>
          <div className="lg:text-right">
            <Link
              href="/list-your-company"
              className="inline-flex h-11 items-center border border-ink/80 px-5 text-sm font-medium text-ink transition-colors hover:border-orange hover:text-orange-ink"
            >
              List your company
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

