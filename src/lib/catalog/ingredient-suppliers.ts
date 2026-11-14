// Ingredient-supplier spotlights for the ingredients section (/ingredients)
// and the supplier's own page. Every fact is the supplier's own published
// figure or dated public reporting, with its source — nothing here is an
// Aekobaba claim. Order = the order spotlights render in.

export interface IngredientFact {
  value: string;
  label: string;
  sourceUrl: string;
}

export interface IngredientSupplierProfile {
  slug: string;
  /** One line under the name. */
  tagline: string;
  /** Short paragraph: what they make and why buyers care. */
  summary: string;
  /** Wide photo for the spotlight (hosted under /suppliers/<slug>/). */
  heroImage: { url: string; alt: string };
  /** Secondary photo shown beside the hero on wide screens. */
  detailImage: { url: string; alt: string };
  /** Headline proof points, each linked to its source. */
  facts: IngredientFact[];
  /** Why a formulator would pick them over the usual options. */
  reasons: string[];
  /** Date the facts were checked (ISO). */
  capturedAt: string;
}

const PLANTIBLE = "https://www.plantiblefoods.com";

export const INGREDIENT_SUPPLIERS: IngredientSupplierProfile[] = [
  {
    slug: "plantible",
    tagline: "Functional RuBisCO protein, egg replacement and greens — grown from Lemna in Texas",
    summary:
      "Plantible grows Lemna (duckweed) year-round in closed-loop greenhouses in Schleicher County, Texas, and extracts Rubi Protein™ — RuBisCO, the most abundant protein on Earth. It is the first isolated RuBisCO protein to receive an FDA “no questions” letter on its GRAS notice, and it does what most plant proteins can’t: it whips like egg white, emulsifies, gels and dissolves, with a neutral taste and a complete amino-acid profile.",
    heroImage: { url: "/suppliers/plantible/plantible-greenhouse.webp", alt: "Lemna growing in a Plantible greenhouse" },
    detailImage: { url: "/suppliers/plantible/plantible-lemna.webp", alt: "Lemna fronds" },
    facts: [
      { value: "85%", label: "protein in Rubi Protein", sourceUrl: `${PLANTIBLE}/product/rubi-protein` },
      { value: "1.0", label: "PDCAAS — complete protein", sourceUrl: `${PLANTIBLE}/product/rubi-protein` },
      { value: "20", label: "food allergens it is free from (incl. FDA top 8)", sourceUrl: `${PLANTIBLE}/applications` },
      {
        value: "FDA",
        label: "GRAS “no questions” letter, Feb 2026",
        sourceUrl: "https://vegconomist.com/ingredients/plantible-foods-receives-fda-green-light-for-lemna-derived-rubi-protein/",
      },
    ],
    reasons: [
      "Replaces egg white and methylcellulose with one clean-label protein (“Lemna leaf protein”)",
      "Year-round US supply from controlled greenhouses — no egg-market or harvest swings",
      "Scaling up: $35M raised in Aug 2026 to build up to 50 more greenhouses, >1,000 t/year capacity",
      "R&D samples and an applications scientist within 48 hours of a request",
    ],
    capturedAt: "2026-11-13",
  },
];

export function ingredientProfile(slug: string): IngredientSupplierProfile | null {
  return INGREDIENT_SUPPLIERS.find((p) => p.slug === slug) ?? null;
}

/**
 * Spotlighted suppliers first (in profile order), then everyone else; inside
 * a supplier, products keep catalog (seed) order — strongest product first.
 */
export function rankIngredients<T extends { supplier: { slug: string } }>(products: T[]): T[] {
  const rank = (slug: string) => {
    const i = INGREDIENT_SUPPLIERS.findIndex((p) => p.slug === slug);
    return i === -1 ? INGREDIENT_SUPPLIERS.length : i;
  };
  return products
    .map((product, index) => ({ product, index }))
    .sort((a, b) => rank(a.product.supplier.slug) - rank(b.product.supplier.slug) || a.index - b.index)
    .map(({ product }) => product);
}
