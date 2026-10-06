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

/**
 * Partner mark — a supplier that pays Aekobaba for partnership. Shown openly
 * next to (never instead of) the earned tier: partners buy labelled,
 * sponsored placement — not a better tier or a hidden ranking boost.
 */
export const PARTNER_DISCLOSURE =
  "Paid partner. Partners get sponsored, labelled placement and a branded storefront; their tier is earned the same way as everyone else's.";

/** Text on the ribbon partner cards wear. */
export const PARTNER_RIBBON_LABEL = "Aekobaba Partner";

/**
 * The graphite-and-brass ribbon on partner product cards — the at-a-glance mark that a
 * listing comes from a paid partner (hover/title carries the disclosure).
 */
export function PartnerRibbon({ className = "" }: { className?: string }) {
  return (
    <span
      data-testid="partner-ribbon"
      title={PARTNER_DISCLOSURE}
      className={`partner-ribbon tag inline-flex items-center gap-1.5 bg-partner py-1 pl-2.5 pr-4 text-[10.5px] text-partner-on shadow-[0_6px_14px_-8px_rgba(16,19,24,.6)] ${className}`}
    >
      <svg aria-hidden width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-partner-star">
        <path d="m12 2.5 2.9 6 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6-4.9-4.6 6.6-.8z" />
      </svg>
      {PARTNER_RIBBON_LABEL}
    </span>
  );
}

/** Small "Sponsored" tag for every paid placement slot. */
export function SponsoredTag() {
  return (
    <span
      data-testid="sponsored-tag"
      title={PARTNER_DISCLOSURE}
      className="tag inline-flex shrink-0 items-center border border-ink/25 px-1.5 py-0.5 text-ink-muted"
    >
      Sponsored
    </span>
  );
}

export function PartnerBadge({ tone = "solid" }: { tone?: "solid" | "outline" }) {
  return (
    <span
      data-testid="partner-badge"
      title={PARTNER_DISCLOSURE}
      className={`tag inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-1.5 py-1 ${
        tone === "solid"
          ? "bg-partner text-partner-on"
          : "border border-partner-accent/60 text-partner-accent-ink"
      }`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 ${tone === "solid" ? "bg-partner-star" : "bg-partner-accent"}`}
      />
      Partner
    </span>
  );
}

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
