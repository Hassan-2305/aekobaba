// Header category menu — static navigation, not live data.
//
// The site header renders on every page, including prerendered auth pages, so
// it must not query the database (a DB query here broke CI builds with no
// Postgres, and stale counts in a nav menu would be dishonest anyway). The
// full category grid on Home keeps live counts via getCategories().
//
// Kept in lockstep with data/aekobaba-seed.json by menu.test.ts — a taxonomy
// rename fails the test instead of silently desyncing the menu.

export interface CategoryMenuEntry {
  slug: string;
  name: string;
}

export const CATEGORY_MENU: CategoryMenuEntry[] = [
  { slug: "pouches-bags", name: "Flexible Pouches & Bags" },
  { slug: "plastic-bottles", name: "Plastic Bottles" },
  { slug: "plastic-jars", name: "Plastic Jars & Canisters" },
  { slug: "tubs-pails", name: "Tubs, Cups & Pails" },
  { slug: "folding-cartons", name: "Folding Cartons" },
  { slug: "labels", name: "Labels" },
  { slug: "closures", name: "Closures" },
  { slug: "pumps-sprayers", name: "Pumps, Sprayers & Airless Dispensers" },
  { slug: "corrugated", name: "Corrugated Shippers & Secondary Packaging" },
  { slug: "glass-bottles", name: "Glass Bottles" },
  { slug: "glass-jars", name: "Glass Jars" },
  { slug: "collapsible-tubes", name: "Collapsible Tubes" },
  { slug: "metal-cans", name: "Metal Cans — Beverage & Food" },
  { slug: "metal-tins", name: "Metal Tins" },
  { slug: "sachets-stick-packs", name: "Sachets & Stick Packs" },
  { slug: "rollstock", name: "Flexible Film Rollstock & Flow Wrap" },
  { slug: "shrink-sleeves", name: "Shrink Sleeves" },
  { slug: "thermoforms", name: "Blister Packs, Clamshells & Thermoform Trays" },
  { slug: "setup-boxes", name: "Rigid Setup Boxes" },
  { slug: "droppers-vials", name: "Dropper Assemblies, Vials & Roll-Ons" },
  { slug: "aerosols", name: "Aerosol Cans" },
  { slug: "mailers", name: "Mailers & E-Commerce Shipping" },
  { slug: "cr-cannabis", name: "Child-Resistant & Cannabis Specialty Packaging" },
  { slug: "compostables", name: "Compostables & Sustainable Structures" },
  { slug: "brand-accessories", name: "Branding Accessories: Hang Tags, Stickers, Tissue & Tape" },
];

// ─── Groups ──────────────────────────────────────────────────────────────────
//
// 25 flat categories is too many to scan, so navigation and the home index
// group them by what the buyer is shopping for. Every menu slug belongs to
// exactly one group (menu.test.ts enforces it).

export interface CategoryGroup {
  id: string;
  name: string;
  slugs: string[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: "containers",
    name: "Containers",
    slugs: [
      "plastic-bottles",
      "plastic-jars",
      "glass-bottles",
      "glass-jars",
      "tubs-pails",
      "metal-cans",
      "metal-tins",
      "collapsible-tubes",
      "aerosols",
    ],
  },
  {
    id: "closures",
    name: "Closures & dispensing",
    slugs: ["closures", "pumps-sprayers", "droppers-vials"],
  },
  { id: "flexible", name: "Flexible", slugs: ["pouches-bags", "sachets-stick-packs", "rollstock"] },
  { id: "paper", name: "Paper & cartons", slugs: ["folding-cartons", "setup-boxes"] },
  {
    id: "labels",
    name: "Labels & decoration",
    slugs: ["labels", "shrink-sleeves", "brand-accessories"],
  },
  { id: "shipping", name: "Shipping", slugs: ["corrugated", "mailers"] },
  { id: "specialty", name: "Specialty", slugs: ["thermoforms", "cr-cannabis", "compostables"] },
];

/** Menu entries per group, in group order. */
export function groupedMenu(): { group: CategoryGroup; entries: CategoryMenuEntry[] }[] {
  const bySlug = new Map(CATEGORY_MENU.map((entry) => [entry.slug, entry]));
  return CATEGORY_GROUPS.map((group) => ({
    group,
    entries: group.slugs
      .map((slug) => bySlug.get(slug))
      .filter((entry): entry is CategoryMenuEntry => entry !== undefined),
  }));
}

/**
 * "Request a supplier" for a category with no listings yet. Opens an email
 * to NEXT_PUBLIC_CONTACT_EMAIL; without one configured it falls back to the
 * company site rather than inventing an address.
 */
export function requestSupplierHref(categoryName: string): string {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  if (!email) return "https://www.aekovera.com";
  const subject = encodeURIComponent(`Supplier request: ${categoryName}`);
  const body = encodeURIComponent(
    `I'm looking for a supplier for ${categoryName}.\n\nWhat I need (format, quantity, timing):\n`,
  );
  return `mailto:${email}?subject=${subject}&body=${body}`;
}
