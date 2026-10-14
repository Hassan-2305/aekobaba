// Spec filters — capacity, dimensions, thickness, neck finish, closures,
// finishes, printing, customization, board construction — and which of them
// a category shows.
//
// The filter rail changes with the category: a bottle is chosen by capacity
// and neck finish, a shipping box by dimensions, wall and strength, a pouch by
// closure, finish and film thickness. Values come from ProductVM.specs (the
// listing's own words, see specs.ts); an option only appears when at least
// one listing in scope states it.

import { CATEGORY_GROUPS } from "./menu";
import type { ProductVM } from "./view-models";

export const SPEC_KEYS = [
  "cap",
  "dim",
  "thick",
  "neck",
  "closure",
  "finish",
  "wall",
  "strength",
  "print",
  "custom",
] as const;
export type SpecKey = (typeof SPEC_KEYS)[number];
export type SpecSelection = Record<SpecKey, string | null>;

export const emptySpecSelection = (): SpecSelection =>
  Object.fromEntries(SPEC_KEYS.map((k) => [k, null])) as SpecSelection;

interface Bucket {
  id: string;
  label: string;
  /** Exclusive lower bound, inclusive upper bound, in the spec's normalized unit. */
  min: number;
  max: number;
}

export const CAPACITY_BUCKETS: Bucket[] = [
  { id: "xs", label: "Up to 2 oz (60 ml)", min: 0, max: 62 },
  { id: "s", label: "2–4 oz (60–120 ml)", min: 62, max: 125 },
  { id: "m", label: "4–8 oz (120–240 ml)", min: 125, max: 245 },
  { id: "l", label: "8–16 oz (240–480 ml)", min: 245, max: 490 },
  { id: "xl", label: "16–32 oz (480–950 ml)", min: 490, max: 960 },
  { id: "xxl", label: "Over 32 oz / 1 L", min: 960, max: Number.POSITIVE_INFINITY },
];

/** Longest side, inches. */
export const DIMENSION_BUCKETS: Bucket[] = [
  { id: "s", label: "Small — up to 6 in (15 cm)", min: 0, max: 6 },
  { id: "m", label: "Medium — 6 to 12 in (15–30 cm)", min: 6, max: 12 },
  { id: "l", label: "Large — over 12 in (30 cm)", min: 12, max: Number.POSITIVE_INFINITY },
];

/** Microns. */
export const THICKNESS_BUCKETS: Bucket[] = [
  { id: "thin", label: "Thin — up to 25 µm (1 mil)", min: 0, max: 25.4 },
  { id: "mid", label: "Medium — 25–75 µm (1–3 mil)", min: 25.4, max: 76.2 },
  { id: "heavy", label: "Heavy — over 75 µm (3 mil)", min: 76.2, max: Number.POSITIVE_INFINITY },
];

/** Indicative US-dollar ceilings per unit (see SORT_FX_TO_USD for other currencies). */
export const BUDGET_BUCKETS: { value: number; label: string }[] = [
  { value: 0.1, label: "Up to $0.10 per unit" },
  { value: 0.5, label: "Up to $0.50 per unit" },
  { value: 1, label: "Up to $1 per unit" },
  { value: 5, label: "Up to $5 per unit" },
];

const bucketOf = (buckets: Bucket[], value: number | undefined | null): string[] => {
  if (value === undefined || value === null) return [];
  const b = buckets.find((x) => value > x.min && value <= x.max);
  return b ? [b.id] : [];
};

export interface SpecFacetDef {
  key: SpecKey;
  title: string;
  /** Option ids this product carries for the facet (empty = not stated). */
  values: (p: ProductVM) => string[];
  /** Human label for an option id. */
  label: (id: string) => string;
  /** Fixed option order (buckets); free-text facets sort by count. */
  order?: string[];
}

const labelFrom = (buckets: Bucket[]) => (id: string) =>
  buckets.find((b) => b.id === id)?.label ?? id;
const same = (id: string) => id;

export const SPEC_FACETS: Record<SpecKey, SpecFacetDef> = {
  cap: {
    key: "cap",
    title: "Capacity",
    values: (p) => bucketOf(CAPACITY_BUCKETS, p.specs.capacity?.value),
    label: labelFrom(CAPACITY_BUCKETS),
    order: CAPACITY_BUCKETS.map((b) => b.id),
  },
  dim: {
    key: "dim",
    title: "Dimensions",
    values: (p) => bucketOf(DIMENSION_BUCKETS, p.specs.dimensions?.value),
    label: labelFrom(DIMENSION_BUCKETS),
    order: DIMENSION_BUCKETS.map((b) => b.id),
  },
  thick: {
    key: "thick",
    title: "Thickness",
    values: (p) => bucketOf(THICKNESS_BUCKETS, p.specs.thickness?.value),
    label: labelFrom(THICKNESS_BUCKETS),
    order: THICKNESS_BUCKETS.map((b) => b.id),
  },
  neck: {
    key: "neck",
    title: "Neck finish",
    values: (p) => (p.specs.neckFinish ? [p.specs.neckFinish] : []),
    label: same,
  },
  closure: { key: "closure", title: "Closure", values: (p) => p.specs.closures, label: same },
  finish: { key: "finish", title: "Colour & finish", values: (p) => p.specs.finishes, label: same },
  wall: {
    key: "wall",
    title: "Wall / flute",
    values: (p) => (p.specs.wall ? [p.specs.wall] : []),
    label: same,
  },
  strength: {
    key: "strength",
    title: "Board strength",
    values: (p) => (p.specs.strength ? [p.specs.strength] : []),
    label: same,
  },
  print: { key: "print", title: "Printing", values: (p) => p.specs.printing, label: same },
  custom: { key: "custom", title: "Customization", values: (p) => p.specs.customization, label: same },
};

/** Spec facets per category group, most decisive first. */
const GROUP_FACETS: Record<string, { title: string; keys: SpecKey[] }> = {
  containers: { title: "Container details", keys: ["cap", "neck", "closure", "finish"] },
  closures: { title: "Closure details", keys: ["cap", "neck", "closure", "finish"] },
  flexible: { title: "Pouch & film details", keys: ["closure", "finish", "thick"] },
  paper: { title: "Carton details", keys: ["dim", "finish"] },
  labels: { title: "Label details", keys: ["dim", "finish"] },
  shipping: { title: "Box details", keys: ["dim", "wall", "strength", "thick"] },
  specialty: { title: "Product details", keys: ["closure", "finish"] },
};

const ALL_CATEGORIES: { title: string; keys: SpecKey[] } = {
  title: "Product details",
  keys: ["cap", "dim", "thick", "closure", "finish"],
};

export function groupOfCategory(slug: string): string | null {
  return CATEGORY_GROUPS.find((g) => g.slugs.includes(slug))?.id ?? null;
}

/**
 * The spec block for the current scope: one category (or a search whose
 * categories all sit in one group) gets that group's facets; anything wider
 * gets the general set.
 */
export function specBlockFor(categorySlugs: string[] | null): { title: string; keys: SpecKey[] } {
  if (!categorySlugs || categorySlugs.length === 0) return ALL_CATEGORIES;
  const groups = new Set(categorySlugs.map(groupOfCategory));
  if (groups.size !== 1) return ALL_CATEGORIES;
  const [group] = [...groups];
  return (group && GROUP_FACETS[group]) || ALL_CATEGORIES;
}

/** Printing & customization are always offered — every category can be branded. */
export const ALWAYS_SPEC_KEYS: SpecKey[] = ["print", "custom"];

export function matchesSpecs(p: ProductVM, selection: SpecSelection): boolean {
  for (const key of SPEC_KEYS) {
    const want = selection[key];
    if (want !== null && !SPEC_FACETS[key].values(p).includes(want)) return false;
  }
  return true;
}

export function parseSpecSelection(get: (key: string) => string | undefined): SpecSelection {
  const out = emptySpecSelection();
  for (const key of SPEC_KEYS) {
    const v = get(key)?.trim();
    out[key] = v ? v : null;
  }
  return out;
}
