import type { SupplierSummaryVM } from "@/lib/catalog/view-models";

// Review evidence line: "Supplier rating ★ 4.5 (214) via Trustpilot". The
// aggregate is for the supplier company, not the product, so it is always
// labelled as a supplier rating. When the supplier has no aggregate, we say
// so plainly — no stars are drawn from thin air.

export function ReviewScore({
  reviewScore,
  reviewCount,
  reviewPlatform,
  size = "sm",
}: Pick<SupplierSummaryVM, "reviewScore" | "reviewCount" | "reviewPlatform"> & { size?: "sm" | "md" }) {
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
  return (
    <span
      className={`inline-flex flex-wrap items-center gap-x-1 ${textClass} text-ink`}
      title="Rating of the supplier company, not this product"
    >
      <span className="text-ink-faint">Supplier rating</span>
      <span aria-hidden className="text-orange">
        ★
      </span>
      <span className="tabular-nums">
        {reviewScore.toFixed(1)} ({reviewCount.toLocaleString("en-US")})
      </span>
      {reviewPlatform ? <span className="text-ink-faint">via {reviewPlatform}</span> : null}
    </span>
  );
}
