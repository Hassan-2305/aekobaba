import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard } from "@/components/catalog/product-card";
import { PartnerBadge, PARTNER_DISCLOSURE, TierBadge } from "@/components/catalog/tier-badge";
import { partnerProfile, varietyOrder } from "@/lib/catalog/partners";
import { getAllProducts } from "@/lib/catalog/queries";
import type { ProductVM } from "@/lib/catalog/view-models";

// The partner collection — an invite-only, curated catalog of suppliers who
// joined Aekobaba. Curation, not comparison: a supplier that hasn't joined
// simply isn't in this collection, and nothing here says anything about
// them. The open catalog (/results) still lists every verified supplier.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Partner collection",
  description: "An invite-only collection of packaging suppliers who partner with Aekobaba.",
};

export default async function PartnersPage() {
  const products = await getAllProducts();
  const bySupplier = new Map<string, ProductVM[]>();
  for (const product of products) {
    if (!product.supplier.isPartner) continue;
    bySupplier.set(product.supplier.slug, [...(bySupplier.get(product.supplier.slug) ?? []), product]);
  }
  // Partners with a full profile (storefront) lead; then by listing count.
  const partners = [...bySupplier.entries()]
    .map(([slug, list]) => ({ slug, list, profile: partnerProfile(slug) }))
    .sort((a, b) => Number(!!b.profile) - Number(!!a.profile) || b.list.length - a.list.length);

  return (
    <div>
      <section className="grain border-b border-line-dark bg-void text-on-dark">
        <div className="mx-auto max-w-[1400px] px-5 pb-12 pt-12 sm:px-8 lg:px-12 lg:pb-14 lg:pt-16">
          <p className="tag flex items-center gap-2 text-on-dark-muted">
            <span aria-hidden className="h-[9px] w-[9px] bg-partner-accent" />
            Invite-only
          </p>
          <h1 className="mt-5 font-semiwide text-4xl font-light leading-[1.02] tracking-[-0.03em] sm:text-6xl">
            The partner collection
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-on-dark-muted">
            A curated set of packaging suppliers who partner with Aekobaba: branded storefronts,
            supplier photography and data they&rsquo;ve confirmed with us. Membership is by
            invitation. {PARTNER_DISCLOSURE}
          </p>
          <p className="mt-4 text-sm text-on-dark-muted">
            Looking for everyone?{" "}
            <Link href="/results" className="text-on-dark underline decoration-orange underline-offset-4">
              The open catalog lists every verified supplier.
            </Link>
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] space-y-16 px-5 py-14 sm:px-8 lg:px-12">
        {partners.length === 0 ? (
          <p className="text-sm text-ink-muted">The first partners are being onboarded.</p>
        ) : null}
        {partners.map(({ slug, list, profile }) => {
          const supplier = list[0].supplier;
          return (
            <section
              key={slug}
              data-testid="partner-collection-entry"
              className="border-t-4 pt-6"
              style={{ borderColor: profile?.brandColor ?? "var(--line)" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {profile ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={profile.logoUrl} alt={`${supplier.name} logo`} className="h-12 w-auto" />
                  ) : null}
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-ink">{supplier.name}</h2>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                      <PartnerBadge tone="outline" />
                      <TierBadge status={supplier.status} />
                      <span>{supplier.location}</span>
                    </p>
                  </div>
                </div>
                <Link
                  href={`/suppliers/${slug}`}
                  className="inline-flex h-11 items-center border border-ink px-5 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-paper"
                >
                  Visit storefront
                </Link>
              </div>
              {profile ? (
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-muted">{profile.summary}</p>
              ) : null}
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {varietyOrder(list)
                  .slice(0, 4)
                  .map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
