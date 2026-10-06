// Partner-supplied facts — the commercial data a partner sends us directly
// (MOQ, lead time, case pack) when their product pages don't publish it.
//
// Truth rule: these are never presented as captured from the supplier's
// page. They render with their own label — "Supplied by Berlin Packaging,
// 6 Oct 2026" — distinct from "Verified from supplier's page". A null value
// stays "Not published"; nothing here is a default or an estimate.
//
// Keyed by the listing's source URL (stable across reseeds). To fill a gap:
// paste the partner's answer from docs/partners/berlin-packaging-data-request.csv
// into the matching entry and set `suppliedAt` to the date they sent it.

export interface PartnerSuppliedFacts {
  /** Supplier slug the facts came from. */
  supplier: string;
  moq: number | null;
  moqUnit: string | null;
  leadTimeDays: number | null;
  /** Units per case / carton, as the partner states it. */
  casePack: number | null;
  /** ISO date the partner supplied the values; null until they do. */
  suppliedAt: string | null;
}

const pending = (supplier: string): PartnerSuppliedFacts => ({
  supplier,
  moq: null,
  moqUnit: null,
  leadTimeDays: null,
  casePack: null,
  suppliedAt: null,
});

/** Requested from Berlin Packaging on 2026-10-06 — awaiting their answers. */
export const PARTNER_SUPPLIED_FACTS: Record<string, PartnerSuppliedFacts> = {
  "https://www.berlinpackaging.com/3351b09-b-8-oz-clear-pet-plastic-honey-bear-bottles-cap-not-included/":
    pending("berlin-packaging"),
  "https://www.berlinpackaging.com/3351b09-8-oz-clear-pet-plastic-honey-bear-bottles-yellow-flip-top-cap/":
    pending("berlin-packaging"),
  "https://www.berlinpackaging.com/33512-8-oz-clear-pet-plastic-honey-bear-bottles-flip-top-cap/":
    pending("berlin-packaging"),
  "https://www.berlinpackaging.com/33512-b-8-oz-clear-pet-plastic-honey-bear-bottles-cap-not-included/":
    pending("berlin-packaging"),
  "https://www.berlinpackaging.com/17-oz-clear-pet-plastic-honey-bear-bottles-cap-not-included-324050/":
    pending("berlin-packaging"),
  "https://www.berlinpackaging.com/2310b05wht-8-4-oz-clear-pet-spice-jars-white-cap/":
    pending("berlin-packaging"),
  "https://www.berlinpackaging.com/4-oz-clear-pet-plastic-spice-jar-black-cap-322420-k/":
    pending("berlin-packaging"),
  "https://www.berlinpackaging.com/4-oz-clear-pet-plastic-spice-jar-red-cap-322420-b/":
    pending("berlin-packaging"),
  "https://www.berlinpackaging.com/3-5-oz-38-400-100-pct-pcr-aluminum-packer-bottle-337048/":
    pending("berlin-packaging"),
};

/** What the UI needs to label partner-supplied values. */
export interface PartnerFactsVM {
  supplierName: string;
  suppliedAt: string;
  /** Which displayed values came from the partner rather than a page capture. */
  moq: boolean;
  leadTime: boolean;
  casePack: number | null;
}

/**
 * Overlay partner-supplied facts onto a listing. Captured values always win —
 * the partner fills gaps, it never overrides what their own page says. Returns
 * the patched fields plus the label data, or null when nothing applies.
 */
export function partnerFactsFor(
  listing: {
    sourceUrl: string;
    moq: number | null;
    moqUnit: string | null;
    leadTimeDays: number | null;
    supplier: { slug: string; name: string };
  },
  table: Record<string, PartnerSuppliedFacts> = PARTNER_SUPPLIED_FACTS,
): {
  moq: number | null;
  moqUnit: string | null;
  leadTimeDays: number | null;
  facts: PartnerFactsVM | null;
} {
  const supplied = table[listing.sourceUrl];
  const unchanged = {
    moq: listing.moq,
    moqUnit: listing.moqUnit,
    leadTimeDays: listing.leadTimeDays,
    facts: null,
  };
  if (!supplied || supplied.supplier !== listing.supplier.slug || !supplied.suppliedAt) {
    return unchanged;
  }
  const fillMoq = listing.moq === null && supplied.moq !== null;
  const fillLead = listing.leadTimeDays === null && supplied.leadTimeDays !== null;
  if (!fillMoq && !fillLead && supplied.casePack === null) return unchanged;
  return {
    moq: fillMoq ? supplied.moq : listing.moq,
    moqUnit: fillMoq ? (supplied.moqUnit ?? "units") : listing.moqUnit,
    leadTimeDays: fillLead ? supplied.leadTimeDays : listing.leadTimeDays,
    facts: {
      supplierName: listing.supplier.name,
      suppliedAt: supplied.suppliedAt,
      moq: fillMoq,
      leadTime: fillLead,
      casePack: supplied.casePack,
    },
  };
}
