import { supplierStatusLabel } from "@/lib/catalog/format";
import type { SupplierStatusValue } from "@/lib/catalog/view-models";

// Supplier tier mark — the plan's tier semantics in one glance:
// Recommended (verified, meets all four gates), Listed (verified),
// Quote only (sells but publishes no prices), Pending / Disabled.
// Orange is reserved for the top tier: it is the verification signal.

type Tone = "light" | "dark";

function Marker({ status, tone }: { status: SupplierStatusValue; tone: Tone }) {
  if (status === "RECOMMENDED") {
    return (
      <svg aria-hidden width="12" height="12" viewBox="0 0 16 16" className="shrink-0 text-orange">
        <rect x="0.5" y="0.5" width="15" height="15" fill="currentColor" />
        <path d="m4.2 8.2 2.5 2.4 5-5.2" fill="none" stroke="#080a0d" strokeWidth="2" />
      </svg>
    );
  }
  if (status === "LISTED") {
    return (
      <svg aria-hidden width="12" height="12" viewBox="0 0 16 16" className="shrink-0">
        <rect x="1" y="1" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="m4.2 8.2 2.5 2.4 5-5.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  const muted = tone === "dark" ? "text-on-dark-muted" : "text-ink-faint";
  return (
    <span
      aria-hidden
      className={`inline-block h-[9px] w-[9px] shrink-0 border border-current ${status === "DISABLED" ? "text-red-600" : muted}`}
    />
  );
}

const TEXT: Record<Tone, Record<SupplierStatusValue, string>> = {
  light: {
    RECOMMENDED: "text-ink",
    LISTED: "text-ink",
    QUOTE_ONLY: "text-ink-muted",
    PENDING: "text-ink-faint",
    DISABLED: "text-red-700",
  },
  dark: {
    RECOMMENDED: "text-on-dark",
    LISTED: "text-on-dark",
    QUOTE_ONLY: "text-on-dark-muted",
    PENDING: "text-on-dark-muted",
    DISABLED: "text-red-400",
  },
};

export function TierBadge({ status, tone = "light" }: { status: SupplierStatusValue; tone?: Tone }) {
  return (
    <span
      data-testid="tier-badge"
      data-tier={status}
      className={`tag inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap ${TEXT[tone][status]}`}
    >
      <Marker status={status} tone={tone} />
      {supplierStatusLabel(status)}
    </span>
  );
}
