import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PartnerBadge, TierBadge } from "@/components/catalog/tier-badge";
import { getSupplier } from "@/lib/catalog/queries";
import { getPartnerDashboard, type FigureSource } from "@/lib/supplier/dashboard";

// Partner lead dashboard (demo) — what a partner is buying: demand in their
// categories, the requests it turns into, and how fast they answer. Live
// figures are counted from the database; metrics Aekobaba does not log yet
// are clearly marked "Sample data". Partner-only, kept out of search.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Partner dashboard",
  robots: { index: false, follow: false },
};

function SourceTag({ source }: { source: FigureSource }) {
  return source === "live" ? (
    <span className="tag inline-flex items-center gap-1 bg-success-tint px-1.5 py-0.5 text-[10px] text-success-ink">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      Live
    </span>
  ) : (
    <span className="tag inline-flex border border-dashed border-ink/30 px-1.5 py-0.5 text-[10px] text-ink-muted">
      Sample data
    </span>
  );
}

export default async function PartnerDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supplier = await getSupplier(slug);
  if (!supplier || !supplier.isPartner) notFound();

  const dashboard = await getPartnerDashboard(supplier.slug, supplier.products);
  const maxSearches = Math.max(1, ...dashboard.categories.map((c) => c.searches));
  const missing = {
    moq: supplier.products.filter((p) => p.moq === null).length,
    lead: supplier.products.filter((p) => p.leadTimeDays === null).length,
  };

  return (
    <div className="bg-paper">
      <div
        role="note"
        data-testid="dashboard-banner"
        className="border-b border-orange/40 bg-orange-tint px-5 py-3 text-sm text-ink sm:px-8 lg:px-12"
      >
        <strong className="font-semibold">Partner dashboard preview.</strong> Figures tagged{" "}
        <em>Live</em> are counted from Aekobaba&rsquo;s records; figures tagged <em>Sample data</em>{" "}
        are illustrative, for metrics we don&rsquo;t track yet.
      </div>

      <div className="mx-auto max-w-[1400px] px-5 py-12 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="flex flex-wrap items-center gap-2">
              <PartnerBadge />
              <TierBadge status={supplier.status} />
            </p>
            <h1 className="mt-4 font-semiwide text-4xl font-light tracking-[-0.03em] text-ink sm:text-5xl">
              {supplier.name} — leads
            </h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/suppliers/${supplier.slug}/inbox-preview`}
              className="inline-flex h-11 items-center bg-orange px-5 text-sm font-medium text-white transition-colors hover:bg-orange-hi"
            >
              Open lead inbox
            </Link>
            <Link
              href={`/suppliers/${supplier.slug}`}
              className="inline-flex h-11 items-center border border-line px-5 text-sm font-medium text-ink transition-colors hover:border-ink"
            >
              View storefront
            </Link>
          </div>
        </div>

        <dl data-testid="dashboard-figures" className="mt-10 grid grid-cols-1 border border-line bg-card sm:grid-cols-2 lg:grid-cols-4">
          {dashboard.figures.map((figure, i) => (
            <div
              key={figure.label}
              className={`p-5 ${i > 0 ? "border-t border-line sm:border-t-0" : ""} ${i % 2 === 1 ? "sm:border-l" : ""} ${i >= 2 ? "sm:border-t lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""} border-line`}
            >
              <dt className="flex items-start justify-between gap-3">
                <span className="tag text-ink-faint">{figure.label}</span>
                <SourceTag source={figure.source} />
              </dt>
              <dd className="mt-3 font-semiwide text-3xl font-light tracking-tight text-ink tabular-nums">
                {figure.value}
              </dd>
              {figure.hint ? <p className="mt-1 text-xs text-ink-faint">{figure.hint}</p> : null}
            </div>
          ))}
        </dl>

        <div className="mt-12 grid gap-12 lg:grid-cols-2">
          <section>
            <h2 className="flex items-center justify-between gap-3 text-sm font-medium text-ink">
              Buyer demand in your categories
              <SourceTag source="sample" />
            </h2>
            <ul className="mt-4 border-t border-line">
              {dashboard.categories.map((c) => (
                <li key={c.slug} className="border-b border-line py-3">
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="text-ink">{c.name}</span>
                    <span className="text-ink-muted tabular-nums">
                      {c.searches.toLocaleString("en-US")} searches · {c.listings} of your listings
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 bg-well">
                    <div className="h-full bg-orange" style={{ width: `${(c.searches / maxSearches) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="flex items-center justify-between gap-3 text-sm font-medium text-ink">
              What buyers searched for
              <SourceTag source="sample" />
            </h2>
            <ol className="mt-4 border-t border-line">
              {dashboard.topSearches.map((s, i) => (
                <li key={s.term} className="grid grid-cols-[2rem_1fr_auto] gap-3 border-b border-line py-3 text-sm">
                  <span className="text-ink-faint tabular-nums">{i + 1}</span>
                  <span className="text-ink">&ldquo;{s.term}&rdquo;</span>
                  <span className="text-ink-muted tabular-nums">{s.count.toLocaleString("en-US")}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {missing.moq > 0 || missing.lead > 0 ? (
          <section data-testid="data-gaps" className="mt-12 border border-line bg-card p-6">
            <h2 className="text-sm font-medium text-ink">Complete your listings to win more quotes</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              {missing.moq} of {supplier.products.length} listings show no minimum order and{" "}
              {missing.lead} show no lead time, so buyers filtering by MOQ don&rsquo;t see them.
              Send us MOQ, lead time and case pack per SKU and we&rsquo;ll show them labelled
              &ldquo;Supplied by {supplier.name}&rdquo;.
            </p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
