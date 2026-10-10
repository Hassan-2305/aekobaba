import type { ProductVM } from "./view-models";

// Featured partner profiles — the suppliers who signed up with Aekobaba and
// get premium placement (home showcase first, partner band on results,
// "Featured partner" badges). Every fact carries the page it came from and
// the day it was captured: the truth rule applies to partners too, and no
// figure is shown that we could not read on a source page.

export interface PartnerFact {
  value: string;
  label: string;
  sourceUrl: string;
  sourceName: string;
}

export interface PartnerService {
  title: string;
  body: string;
  sourceUrl: string;
}

export interface PartnerProfile {
  slug: string;
  name: string;
  tagline: string;
  summary: string;
  facts: PartnerFact[];
  services: PartnerService[];
  perks: { text: string; sourceUrl: string }[];
  capturedAt: string;
  /** Storefront branding: the partner's own mark and brand colour. */
  logoUrl: string;
  brandColor: string;
}

export const PARTNER_PROFILES: Record<string, PartnerProfile> = {
  "berlin-packaging": {
    slug: "berlin-packaging",
    name: "Berlin Packaging",
    tagline: "World's largest hybrid container and packaging supplier",
    summary:
      "Plastic, glass and metal containers, closures and dispensing systems — stock items with published web prices, plus custom design and sourcing for brands that need more.",
    facts: [
      {
        value: "100+",
        label: "locations worldwide",
        sourceUrl: "https://www.gcimagazine.com/home/company/21163018/berlin-packaging",
        sourceName: "GCI Magazine company profile",
      },
      {
        value: "1,700+",
        label: "global supplier partners",
        sourceUrl: "https://www.gcimagazine.com/home/company/21163018/berlin-packaging",
        sourceName: "GCI Magazine company profile",
      },
      {
        value: "4.4★",
        label: "supplier rating, Trustpilot (4,779 reviews)",
        sourceUrl: "https://www.trustpilot.com/review/berlinpackaging.com",
        sourceName: "Trustpilot",
      },
    ],
    services: [
      {
        title: "Studio One Eleven design",
        body: "In-house package and brand design — structural, graphic and product design — offered at no charge in exchange for packaging business.",
        sourceUrl: "https://www.berlinpackaging.com/innovation/",
      },
      {
        title: "Stock and custom",
        body: "Thousands of stock bottles, jars and closures with web prices, and custom packaging through a packaging consultant for larger runs.",
        sourceUrl: "https://www.berlinpackaging.com/",
      },
    ],
    perks: [
      {
        text: "Free shipping over $300 on qualifying online orders",
        sourceUrl: "https://www.berlinpackaging.com/",
      },
    ],
    capturedAt: "2026-10-02",
    logoUrl: "/partners/berlin-packaging/logo.svg",
    // Berlin's red, taken from the logo file they supplied.
    brandColor: "#E21A22",
  },
  // Every fact below comes from the two documents Daehung Pack supplied
  // (hosted under /partners/daehung-pack/); Chinese text translated to English.
  "daehung-pack": {
    slug: "daehung-pack",
    name: "Daehung Pack",
    tagline: "Family-owned printed flexible packaging maker in Southern China (Mingda Packaging)",
    summary:
      "Custom printed pouches, roll stock and form-fill-seal film for CPG and FMCG brands — from design and proofing through rotogravure or digital printing, lamination, slitting and bag making in their own plant.",
    facts: [
      {
        value: "10",
        label: "pouch and film formats",
        sourceUrl: "/partners/daehung-pack/products-2025.pdf",
        sourceName: "Daehung Pack product catalog 2025",
      },
      {
        value: "500 pcs",
        label: "minimum order, digital print",
        sourceUrl: "/partners/daehung-pack/products-2025.pdf",
        sourceName: "Daehung Pack product catalog 2025",
      },
      {
        value: "10",
        label: "print colours, digital or gravure",
        sourceUrl: "/partners/daehung-pack/products-2025.pdf",
        sourceName: "Daehung Pack product catalog 2025",
      },
    ],
    services: [
      {
        title: "Design and proofing",
        body: "Die lines and artwork prepared before production, with digital, offset and cylinder proofing through a colour management system.",
        sourceUrl: "/partners/daehung-pack/company-profile.pdf",
      },
      {
        title: "In-house production",
        body: "Rotogravure printing (CMYK and Pantone spot colours), lamination, curing, slitting and bag making on their own lines.",
        sourceUrl: "/partners/daehung-pack/company-profile.pdf",
      },
    ],
    perks: [
      {
        text: "No setup cost on digital print (gravure needs printing cylinders)",
        sourceUrl: "/partners/daehung-pack/products-2025.pdf",
      },
    ],
    capturedAt: "2026-10-10",
    logoUrl: "/partners/daehung-pack/logo.png",
    // Mingda red, from the company logo in their presentation.
    brandColor: "#D7262D",
  },
};

/** The partner whose profile leads the home page (first signed-up partner). */
export const LEAD_PARTNER_SLUG = "berlin-packaging";

export function partnerProfile(slug: string): PartnerProfile | null {
  return PARTNER_PROFILES[slug] ?? null;
}

/** Stable partner-first ordering: partner products lead, original order kept otherwise. */
export function partnerFirst(products: ProductVM[]): ProductVM[] {
  // Lead partner, then other partners, then everyone — stable within each.
  const rank = (p: ProductVM) =>
    p.supplier.slug === LEAD_PARTNER_SLUG ? 0 : p.supplier.isPartner ? 1 : 2;
  return [...products].sort((a, b) => rank(a) - rank(b));
}

/** Variety-first order: one listing per product type, round-robin, so a showcase never repeats a shape back to back. */
export function varietyOrder(products: ProductVM[]): ProductVM[] {
  const groups = new Map<string, ProductVM[]>();
  for (const p of products) {
    const type = p.subcategory ?? p.categorySlug;
    groups.set(type, [...(groups.get(type) ?? []), p]);
  }
  const out: ProductVM[] = [];
  const queues = [...groups.values()];
  while (queues.some((q) => q.length > 0)) {
    for (const q of queues) {
      const next = q.shift();
      if (next) out.push(next);
    }
  }
  return out;
}
