import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductCard } from "@/components/catalog/product-card";
import { TierBadge } from "@/components/catalog/tier-badge";
import { formatCaptureDate } from "@/lib/catalog/format";
import { partnerProfile } from "@/lib/catalog/partners";
import { getSupplier } from "@/lib/catalog/queries";

// Supplier profile (spec): legal identity, review evidence with source
// platform + capture date, full catalog, tier badge, and a Claim This
// Listing entry point linking the existing claim flow from PR #3's
// successor — the flow is not rebuilt here.

// Catalog pages render at request time — the build must never need a database.
export const dynamic = "force-dynamic";

interface SupplierPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: SupplierPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supplier = await getSupplier(slug);
  return { title: supplier ? supplier.name : "Supplier" };
}

export default async function SupplierPage({ params }: SupplierPageProps) {
  const { slug } = await params;
  const supplier = await getSupplier(slug);
  if (!supplier) notFound();
  const profile = supplier.isPartner ? partnerProfile(supplier.slug) : null;

  return (
    <div>
      <section className="grain border-b border-line-dark bg-void text-on-dark">
        <div className="mx-auto grid max-w-[1400px] gap-8 px-5 pb-12 pt-12 sm:px-8 lg:grid-cols-12 lg:items-end lg:px-12 lg:pb-14 lg:pt-16">
          <div className="lg:col-span-8">
            <div className="flex flex-wrap items-center gap-3">
              {supplier.isPartner ? (
                <span className="tag flex items-center gap-1.5 bg-orange px-2 py-1.5 text-white">
                  <span aria-hidden className="h-1.5 w-1.5 bg-white" />
                  Featured partner
                </span>
              ) : null}
              <TierBadge status={supplier.status} tone="dark" />
            </div>
            <h1
              data-testid="supplier-name"
              className="mt-5 font-semiwide text-4xl font-light leading-[1.02] tracking-[-0.03em] sm:text-6xl"
            >
              {supplier.name}
            </h1>
            <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 text-sm">
              <div>
                <dt className="tag text-on-dark-muted">Location</dt>
                <dd className="mt-2 text-on-dark">{supplier.location}</dd>
              </div>
              <div>
                <dt className="tag text-on-dark-muted">Website</dt>
                <dd className="mt-2">
                  {supplier.website ? (
                    <a
                      href={supplier.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-on-dark underline decoration-on-dark/30 underline-offset-4 hover:decoration-orange"
                    >
                      {new URL(supplier.website).host}
                    </a>
                  ) : (
                    <span className="text-on-dark-muted">No website published</span>
                  )}
                </dd>
              </div>
              {supplier.lastVerifiedAt ? (
                <div>
                  <dt className="tag text-on-dark-muted">Last verified</dt>
                  <dd className="mt-2 text-on-dark tabular-nums">
                    {formatCaptureDate(supplier.lastVerifiedAt)}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="tag text-on-dark-muted">Listings</dt>
                <dd className="mt-2 text-on-dark tabular-nums">{supplier.products.length}</dd>
              </div>
            </dl>
            {supplier.legalIdentity ? (
              <p data-testid="supplier-legal-identity" className="mt-6 text-xs text-on-dark-muted">
                Registered as {supplier.legalIdentity}
              </p>
            ) : null}
          </div>
          {profile ? (
            <p className="text-sm leading-relaxed text-on-dark-muted lg:col-span-4 lg:text-right">
              {profile.tagline}
            </p>
          ) : (
            <div className="lg:col-span-4 lg:text-right">
              {/* No seeded supplier has an owning user yet, so the claim CTA
                shows on every profile. The supplier-admin work replaces this
                with an ownership check (claimed listings hide the CTA). */}
              <p className="text-sm text-on-dark-muted">Is this your company?</p>
              <a
                href={`/suppliers/${supplier.slug}/claim`}
                data-testid="claim-listing"
                className="mt-3 inline-flex h-11 items-center border border-on-dark/25 px-5 text-sm font-medium text-on-dark transition-colors hover:border-orange"
              >
                Claim This Listing
              </a>
            </div>
          )}
        </div>
      </section>

      {profile ? (
        <section
          data-testid="partner-profile"
          className="tone-dark border-b border-line-dark bg-navy text-on-dark"
        >
          <div className="mx-auto grid max-w-[1400px] gap-10 px-5 py-12 sm:px-8 lg:grid-cols-12 lg:px-12">
            <div className="lg:col-span-5">
              <p className="text-base leading-relaxed text-on-dark-muted">{profile.summary}</p>
              <dl className="mt-8 grid grid-cols-3 border-y border-line-dark">
                {profile.facts.map((fact, i) => (
                  <div
                    key={fact.label}
                    className={`py-4 ${i > 0 ? "border-l border-line-dark pl-4" : "pr-4"}`}
                  >
                    <dt className="sr-only">{fact.label}</dt>
                    <dd>
                      <span className="block text-3xl font-semibold leading-none tracking-tight tabular-nums">
                        {fact.value}
                      </span>
                      <span className="mt-2 block text-xs text-on-dark-muted">{fact.label}</span>
                      <a
                        href={fact.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-[11px] text-on-dark-muted/70 underline decoration-on-dark/20 underline-offset-2 hover:text-on-dark"
                      >
                        {fact.sourceName}
                      </a>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <ul className="grid gap-5 sm:grid-cols-2 lg:col-span-6 lg:col-start-7">
              {profile.services.map((service) => (
                <li key={service.title} className="border-l-2 border-orange pl-4">
                  <p className="font-semibold">{service.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-on-dark-muted">
                    {service.body}
                  </p>
                  <a
                    href={service.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-[11px] text-on-dark-muted/70 underline decoration-on-dark/20 underline-offset-2 hover:text-on-dark"
                  >
                    Source
                  </a>
                </li>
              ))}
              {profile.perks.map((perk) => (
                <li
                  key={perk.text}
                  className="border-l-2 border-on-dark/30 pl-4 text-sm text-on-dark-muted sm:col-span-2"
                >
                  {perk.text} ·{" "}
                  <a
                    href={perk.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-on-dark/20 underline-offset-2 hover:text-on-dark"
                  >
                    source
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <div className="mx-auto max-w-[1400px] px-5 pb-24 sm:px-8 lg:px-12">
        <div className="grid gap-12 py-12 lg:grid-cols-2">
          <section>
            <h2 className="text-sm font-medium text-ink">Review evidence</h2>
            {supplier.reviews.length > 0 ? (
              <ul data-testid="review-evidence" className="mt-3 border-t border-line">
                {supplier.reviews.map((review, index) => (
                  <li
                    key={index}
                    className="grid grid-cols-[5rem_1fr] gap-4 border-b border-line py-4 text-sm"
                  >
                    <p className="font-semiwide text-2xl font-light text-ink tabular-nums">
                      {review.score.toFixed(1)}
                      <span aria-hidden className="ml-1 align-top text-sm text-orange">
                        ★
                      </span>
                    </p>
                    <div>
                      <p className="text-ink">{review.sourcePlatform}</p>
                      {review.summary ? (
                        <p className="mt-1 text-xs text-ink-muted">{review.summary}</p>
                      ) : null}
                      <p className="mt-2 text-xs text-ink-faint">
                        Captured {formatCaptureDate(review.sourceCapturedAt)} ·{" "}
                        <a
                          href={review.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ink underline decoration-ink/20 underline-offset-4 hover:decoration-orange"
                        >
                          source
                        </a>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 border-t border-line pt-4 text-sm text-ink-faint">
                No third-party reviews captured yet.
              </p>
            )}
          </section>

          <section>
            <h2 className="text-sm font-medium text-ink">Certifications</h2>
            {supplier.certifications.length > 0 ? (
              <ul data-testid="supplier-certifications" className="mt-3 border-t border-line">
                {supplier.certifications.map((cert) => (
                  <li
                    key={cert.name}
                    className="flex items-center justify-between gap-4 border-b border-line py-4 text-sm"
                  >
                    <span className="tag text-ink">{cert.name}</span>
                    <span className="text-xs text-ink-faint">
                      verified {formatCaptureDate(cert.sourceCapturedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 border-t border-line pt-4 text-sm text-ink-faint">
                No certifications captured yet.
              </p>
            )}
          </section>
        </div>

        <section>
          <h2 className="font-semiwide text-3xl font-light tracking-[-0.02em] text-ink">
            Catalog{" "}
            <span className="text-ink-faint tabular-nums">({supplier.products.length})</span>
          </h2>
          <div
            data-testid="supplier-catalog"
            className="mt-8 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 xl:grid-cols-4"
          >
            {supplier.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
