import type { SupplierSummaryVM } from "@/lib/catalog/view-models";

// Review evidence line: "Supplier rating ★ 4.5 (214) via Trustpilot". The
// aggregate is for the supplier company, not the product, so it is always
// labelled as a supplier rating, and it links to the supplier's page on the
// review platform. When the supplier has no aggregate, we say so plainly —
// no stars are drawn from thin air.

export function ReviewScore({
  reviewScore,
  reviewCount,
  reviewPlatform,
  size = "sm",
  reviewUrl = null,
}: Pick<SupplierSummaryVM, "reviewScore" | "reviewCount" | "reviewPlatform"> & {
  reviewUrl?: string | null;
  size?: "sm" | "md";
}) {
  const textClass = size === "md" ? "text-sm" : "text-xs";
  if (reviewScore === null) {
    return (
      <span className={`text-ink-faint ${textClass}`}>
        No published supplier rating
        <span data-testid="review-unsupported" className="sr-only">
          (review score not published)
        </span>
      </span>
    );
  }
  const className = `inline-flex flex-wrap items-center gap-x-1 ${textClass} text-ink`;
  const body = (
    <>
      <span className="text-ink-faint">Supplier rating</span>
      <span aria-hidden className="text-orange">
        ★
      </span>
      <span className="tabular-nums">
        {reviewScore.toFixed(1)} ({reviewCount.toLocaleString("en-US")})
      </span>
      {reviewPlatform ? <span className="text-ink-faint">via {reviewPlatform}</span> : null}
    </>
  );
  if (reviewUrl) {
    return (
      <a
        href={reviewUrl}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="review-link"
        title={`Open ${reviewPlatform ?? "the review"} page for this supplier (rating of the company, not this product)`}
        className={`${className} relative z-20 underline decoration-ink/20 underline-offset-[3px] transition-colors hover:decoration-orange`}
      >
        {body}
      </a>
    );
  }
  return (
    <span className={className} title="Rating of the supplier company, not this product">
      {body}
    </span>
  );
}
