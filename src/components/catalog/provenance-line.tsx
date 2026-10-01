import { formatCaptureDate } from "@/lib/catalog/format";

// The provenance line (spec C6): every price and value carries the date we
// verified it and a link to the exact supplier page it came from. This is
// the product's core trust asset — it renders on every card and detail page.

export function ProvenanceLine({
  sourceUrl,
  sourceCapturedAt,
  variant = "sm",
  tone = "light",
}: {
  sourceUrl: string;
  sourceCapturedAt: string;
  variant?: "sm" | "md";
  tone?: "light" | "dark";
}) {
  const textClass = variant === "md" ? "text-sm" : "text-xs";
  const color = tone === "dark" ? "text-on-dark-muted" : "text-ink-muted";
  const link =
    tone === "dark"
      ? "text-on-dark decoration-on-dark/30 hover:decoration-orange"
      : "text-ink decoration-ink/25 hover:text-orange-ink hover:decoration-orange";
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
    </p>
  );
}
