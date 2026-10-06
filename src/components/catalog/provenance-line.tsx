import { captureAgeDays, formatCaptureDate, STALE_AFTER_DAYS } from "@/lib/catalog/format";

// The provenance line (spec C6): every price and value carries the date we
// verified it and a link to the exact supplier page it came from. This is
// the product's core trust asset — it renders on every card and detail page.
// Captures older than STALE_AFTER_DAYS carry a visible age flag, so a
// three-week-old price never reads like this morning's.

export function ProvenanceLine({
  sourceUrl,
  sourceCapturedAt,
  variant = "sm",
  tone = "light",
  now,
}: {
  sourceUrl: string;
  sourceCapturedAt: string;
  variant?: "sm" | "md";
  tone?: "light" | "dark";
  /** Reference time for the age flag (tests); defaults to the render time. */
  now?: Date;
}) {
  const textClass = variant === "md" ? "text-sm" : "text-xs";
  const color = tone === "dark" ? "text-on-dark-muted" : "text-ink-muted";
  const link =
    tone === "dark"
      ? "text-on-dark decoration-on-dark/30 hover:decoration-orange"
      : "text-ink decoration-ink/25 hover:text-orange-ink hover:decoration-orange";
  const age = captureAgeDays(sourceCapturedAt, now);
  const stale = age > STALE_AFTER_DAYS;
  return (
    <p data-testid="provenance-line" className={`${textClass} ${color}`}>
      Verified from{" "}
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`underline underline-offset-[3px] transition-colors ${link}`}
      >
        supplier&rsquo;s page
      </a>{" "}
      on {formatCaptureDate(sourceCapturedAt)}
      {stale ? (
        <span
          data-testid="stale-capture"
          title={`Captured ${age} days ago — the supplier's price may have changed. Check the source before you rely on it.`}
          className={`ml-1.5 inline-flex items-center gap-1 whitespace-nowrap px-1.5 py-0.5 align-middle text-[10.5px] font-medium ${
            tone === "dark" ? "bg-warning-ink/25 text-on-dark" : "bg-warning-tint text-warning-ink"
          }`}
        >
          {age} days old
        </span>
      ) : null}
    </p>
  );
}
