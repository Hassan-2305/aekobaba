import { formatCaptureDate } from "@/lib/catalog/format";
import {
  formatStarPercent,
  reviewInsights,
  type ReviewInsights,
} from "@/lib/catalog/review-insights";
import type { SupplierSummaryVM } from "@/lib/catalog/view-models";
import { getLiveSupplierReviews, type LivePlatformReviews } from "@/lib/reviews/live";

// Supplier reviews — the Amazon / Alibaba-style block under a product:
// overall rating with the star distribution, what customers keep mentioning
// (our summary, labelled), and real review cards pulled live from the
// platforms' official APIs with their attribution. These are reviews of the
// SUPPLIER company, not of this product, and the section says so.

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  const full = Math.round(rating * 2) / 2;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = full >= i ? 1 : full >= i - 0.5 ? 0.5 : 0;
        return (
          <svg key={i} aria-hidden width={size} height={size} viewBox="0 0 24 24">
            <defs>
              <linearGradient id={`s${i}-${fill}`}>
                <stop offset={`${fill * 100}%`} stopColor="var(--orange)" />
                <stop offset={`${fill * 100}%`} stopColor="var(--line)" />
              </linearGradient>
            </defs>
            <path
              d="m12 2.5 2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6-4.9-4.6 6.6-.8z"
              fill={`url(#s${i}-${fill})`}
            />
          </svg>
        );
      })}
    </span>
  );
}

function formatReviewDate(iso: string | null, relative: string | null): string | null {
  if (iso) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime()))
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  return relative;
}

export function SupplierReviewsView({
  supplier,
  insights,
  live,
}: {
  supplier: Pick<SupplierSummaryVM, "name" | "slug" | "reviewScore" | "reviewCount" | "reviewPlatform" | "reviewUrl">;
  insights: ReviewInsights | null;
  live: LivePlatformReviews[];
}) {
  const overview = insights?.overviews[0] ?? null;
  const score = overview?.score ?? supplier.reviewScore;
  const count = overview?.reviewCount ?? supplier.reviewCount;
  const platform = overview?.platform ?? supplier.reviewPlatform;
  const platformUrl = overview?.sourceUrl ?? supplier.reviewUrl;
  const cards = live.flatMap((p) => p.reviews).slice(0, 6);
  const hasAnything = score !== null || cards.length > 0;

  return (
    <section className="mt-20 scroll-mt-6" id="reviews" data-testid="supplier-reviews">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-semiwide text-3xl font-light tracking-[-0.02em] text-ink">
            {supplier.name} reviews
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Ratings and reviews of the supplier company from independent platforms — not of this
            specific product.
          </p>
        </div>
      </div>

      {!hasAnything ? (
        <p data-testid="reviews-empty" className="mt-8 border border-dashed border-line px-6 py-10 text-center text-sm text-ink-muted">
          No published reviews for {supplier.name} yet on Trustpilot or Google. Ask for references
          with your quote request.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-14">
          {/* Overview */}
          <div>
            {score !== null ? (
              <div className="border border-line bg-card p-6" data-testid="reviews-overview">
                <p className="flex items-baseline gap-3">
                  <span className="font-semiwide text-5xl font-light tracking-tight text-ink tabular-nums">
                    {score.toFixed(1)}
                  </span>
                  <span className="text-sm text-ink-muted">out of 5</span>
                </p>
                <div className="mt-2">
                  <Stars rating={score} size={18} />
                </div>
                <p className="mt-2 text-sm text-ink-muted tabular-nums">
                  {count.toLocaleString("en-US")} review{count === 1 ? "" : "s"}
                  {platform ? ` on ${platform}` : ""}
                </p>

                {overview?.stars ? (
                  <ul className="mt-5 space-y-1.5" data-testid="reviews-distribution">
                    {([5, 4, 3, 2, 1] as const).map((star) => {
                      const pct = overview.stars![star];
                      return (
                        <li key={star} className="grid grid-cols-[3.2rem_1fr_2.6rem] items-center gap-2 text-xs">
                          <span className="text-ink-muted tabular-nums">{star} star</span>
                          <span className="h-2 overflow-hidden bg-well">
                            <span className="block h-full bg-orange" style={{ width: `${pct}%` }} />
                          </span>
                          <span className="text-right text-ink-muted tabular-nums">{formatStarPercent(pct)}</span>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}

                {overview?.replies ? (
                  <p className="mt-4 border-t border-line pt-3 text-xs text-ink-muted">{overview.replies}.</p>
                ) : null}

                <div className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
                  {platformUrl ? (
                    <a
                      href={platformUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="reviews-platform-link"
                      className="block text-ink underline decoration-ink/25 underline-offset-[3px] hover:decoration-orange"
                    >
                      Read all {count.toLocaleString("en-US")} on {platform ?? "the platform"} &#8599;
                    </a>
                  ) : null}
                  {live
                    .filter((p) => p.platform !== platform && p.url)
                    .map((p) => (
                      <a
                        key={p.platform}
                        href={p.url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-ink underline decoration-ink/25 underline-offset-[3px] hover:decoration-orange"
                      >
                        {p.rating !== null ? `${p.rating.toFixed(1)}★ ` : ""}
                        {p.reviewCount !== null ? `(${p.reviewCount.toLocaleString("en-US")}) ` : ""}
                        on {p.platform} &#8599;
                      </a>
                    ))}
                </div>
                {overview ? (
                  <p className="mt-3 text-[11px] text-ink-faint">
                    Figures as shown on {overview.platform}, {formatCaptureDate(overview.capturedAt)}.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Highlights + review cards */}
          <div>
            {insights && (insights.praise.length > 0 || insights.concerns.length > 0) ? (
              <div data-testid="reviews-highlights">
                <h3 className="text-sm font-medium text-ink">What customers mention</h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div className="border-l-2 border-success-ink/60 pl-4">
                    <p className="tag text-success-ink">Often praised</p>
                    <ul className="mt-2 space-y-1.5 text-sm text-ink">
                      {insights.praise.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="border-l-2 border-warning-ink/60 pl-4">
                    <p className="tag text-warning-ink">Common complaints</p>
                    <ul className="mt-2 space-y-1.5 text-sm text-ink">
                      {insights.concerns.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-ink-faint">
                  Summarised by Aekobaba from {insights.summarisedFrom} — our wording, not quotes.
                </p>
              </div>
            ) : null}

            {cards.length > 0 ? (
              <div className="mt-8" data-testid="reviews-cards">
                <h3 className="text-sm font-medium text-ink">Recent reviews</h3>
                <ul className="mt-3 grid gap-4 md:grid-cols-2">
                  {cards.map((r, i) => (
                    <li key={`${r.platform}-${i}`} className="border border-line bg-card p-5">
                      <div className="flex items-center justify-between gap-3">
                        <Stars rating={r.rating} />
                        <span className="tag text-ink-faint">via {r.platform}</span>
                      </div>
                      {r.title ? <p className="mt-3 text-sm font-semibold text-ink">{r.title}</p> : null}
                      <p className="mt-2 line-clamp-6 whitespace-pre-line text-sm leading-relaxed text-ink-muted">
                        {r.text}
                      </p>
                      <p className="mt-3 text-xs text-ink-faint">
                        {r.authorUrl ? (
                          <a href={r.authorUrl} target="_blank" rel="noopener noreferrer" className="text-ink hover:underline">
                            {r.author}
                          </a>
                        ) : (
                          <span className="text-ink">{r.author}</span>
                        )}
                        {formatReviewDate(r.date, r.relativeTime) ? ` · ${formatReviewDate(r.date, r.relativeTime)}` : ""}
                        {r.url ? (
                          <>
                            {" · "}
                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline decoration-ink/20 hover:decoration-orange">
                              View on {r.platform}
                            </a>
                          </>
                        ) : null}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p data-testid="reviews-cards-pending" className="mt-8 text-xs text-ink-faint">
                Individual reviews are shown through the platforms&rsquo; official feeds;{" "}
                {platformUrl ? (
                  <a href={platformUrl} target="_blank" rel="noopener noreferrer" className="text-ink underline decoration-ink/25 underline-offset-[3px]">
                    read them on {platform}
                  </a>
                ) : (
                  "they appear here once connected"
                )}
                .
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

/** Loads the overview + live cards, then renders. Wrap in <Suspense> — the API calls never block the page. */
export async function SupplierReviews({
  supplier,
}: {
  supplier: Pick<
    SupplierSummaryVM,
    "name" | "slug" | "location" | "website" | "reviewScore" | "reviewCount" | "reviewPlatform" | "reviewUrl"
  >;
}) {
  const live = await getLiveSupplierReviews(
    supplier.name,
    supplier.location,
    supplier.reviewUrl,
    supplier.website,
  ).catch(() => []);
  return <SupplierReviewsView supplier={supplier} insights={reviewInsights(supplier.slug)} live={live} />;
}
