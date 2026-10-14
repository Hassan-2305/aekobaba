// Technical specifications, read from the listing's own words.
//
// Suppliers publish capacity, dimensions, neck finish, closures and finishes
// inside titles and descriptions ("16oz (480ml) Amber Boston Round — 28-400
// Neck", "10 x 8 x 6 Corrugated Boxes", "12 Micron"). This module turns that
// text into structured values for filters and the spec table. Truth rule: a
// value appears only when the listing states it — nothing is inferred from
// the category, and an unstated spec stays null / empty.
//
// Pure and deterministic: same listing text, same specs.

export interface MeasuredSpec {
  /** Normalized value: ml for capacity, inches (longest side) for dimensions, µm for thickness. */
  value: number;
  /** As the supplier wrote it, e.g. "16 oz (480 ml)", "10 × 8 × 6 in", "12 micron". */
  label: string;
}

export interface ProductSpecs {
  capacity: MeasuredSpec | null;
  dimensions: MeasuredSpec | null;
  thickness: MeasuredSpec | null;
  /** Neck / cap finish, normalized "28-400". */
  neckFinish: string | null;
  closures: string[];
  finishes: string[];
  printing: string[];
  customization: string[];
  /** Corrugated construction: "Single wall" / "Double wall". */
  wall: string | null;
  /** Board strength as published, e.g. "Standard strength", "32 ECT". */
  strength: string | null;
  /** Setup / tooling note as published (null = not stated). */
  setupNote: string | null;
  /** Sample availability / cost as published (null = not stated). */
  sampleNote: string | null;
  /** Lead-time wording as published, when the structured field is empty. */
  leadNote: string | null;
}

export interface SpecSource {
  title: string;
  description: string | null;
  material: string;
  subcategory: string | null;
  categorySlug: string;
  priceBasis: string | null;
  stockOrCustom: "STOCK" | "CUSTOM";
}

const ML_PER = { floz: 29.5735, gal: 3785.41, l: 1000, ml: 1, cc: 1 } as const;
const MICRON_PER_MIL = 25.4;
const MICRON_PER_GAUGE = 0.254;
const INCH_MM = 25.4;

const round = (n: number, step = 1) => Number((Math.round(n / step) * step).toFixed(4));
const trimNum = (n: number) => (Number.isInteger(n) ? String(n) : String(+n.toFixed(2)));

/** "4-1/2" → 4.5, "19.5" → 19.5 */
function parseQty(raw: string): number {
  const mixed = /^(\d+)-(\d+)\/(\d+)$/.exec(raw);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = /^(\d+)\/(\d+)$/.exec(raw);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  return Number(raw);
}

/** Capacity — the title wins over the description. A number must sit right
 * before its unit, so "12 honey-weight oz" (a weight, not a volume) never matches. */
export function parseCapacity(title: string, description: string | null): MeasuredSpec | null {
  const pattern =
    /(\d+(?:\.\d+)?)\s?(fl\.?\s?oz|oz|ml|cc|liters?|litres?|l|gallons?|gal)\b/i;
  for (const text of [title, description ?? ""]) {
    const m = pattern.exec(text);
    if (!m) continue;
    const n = Number(m[1]);
    const unit = m[2].toLowerCase().replace(/\s|\./g, "");
    let ml: number;
    let unitLabel: string;
    if (unit === "oz" || unit === "floz") {
      ml = n * ML_PER.floz;
      unitLabel = "oz";
    } else if (unit.startsWith("gal")) {
      ml = n * ML_PER.gal;
      unitLabel = n === 1 ? "gallon" : "gallons";
    } else if (unit === "l" || unit.startsWith("lit")) {
      ml = n * ML_PER.l;
      unitLabel = "L";
    } else if (unit === "cc") {
      ml = n;
      unitLabel = "cc";
    } else {
      ml = n;
      unitLabel = "ml";
    }
    const metric = /\((\d+(?:\.\d+)?)\s?ml\)/i.exec(text);
    const label =
      unitLabel === "oz"
        ? `${trimNum(n)} oz (${metric ? metric[1] : round(ml, 5)} ml)`
        : `${trimNum(n)} ${unitLabel}`;
    return { value: round(ml, 0.1), label };
  }
  return null;
}

/** Dimensions — "10 x 8 x 6", "9.5in x 7.75in x 4in", "229 x 152 x 152mm", "4-1/2 x 5-1/2". */
export function parseDimensions(text: string, categorySlug: string): MeasuredSpec | null {
  const n = String.raw`(\d+(?:-\d+\/\d+|\.\d+)?)`;
  const u = String.raw`\s?(mm|cm|in|inch(?:es)?|")?`;
  const re = new RegExp(`${n}${u}\\s?[x×]\\s?${n}${u}(?:\\s?[x×]\\s?${n}${u})?`, "i");
  const m = re.exec(text);
  if (!m) return null;
  const nums = [m[1], m[3], m[5]].filter((v): v is string => v !== undefined).map(parseQty);
  const unitRaw = (m[6] ?? m[4] ?? m[2] ?? "").toLowerCase();
  // "16 x 1500 ft" (film roll width x length) is not a box size.
  if (/^\s?ft\b/i.test(text.slice(m.index + m[0].length))) return null;
  let unit: "mm" | "cm" | "in" | null =
    unitRaw === "mm" ? "mm" : unitRaw === "cm" ? "cm" : unitRaw ? "in" : null;
  // Unit-less sizes are inches only for US box/mailer listings, where that is the trade norm.
  if (!unit) {
    if (!["corrugated", "mailers", "folding-cartons", "setup-boxes"].includes(categorySlug)) return null;
    unit = "in";
  }
  const toIn = unit === "mm" ? 1 / INCH_MM : unit === "cm" ? 10 / INCH_MM : 1;
  const longest = Math.max(...nums) * toIn;
  const label = `${nums.map(trimNum).join(" × ")} ${unit}`;
  return { value: round(longest, 0.01), label };
}

/** Thickness — micron, mil or gauge, normalized to µm. */
export function parseThickness(text: string): MeasuredSpec | null {
  const micron = /(\d+(?:\.\d+)?)\s?(?:micron|µm|um)\b/i.exec(text);
  if (micron) return { value: Number(micron[1]), label: `${trimNum(Number(micron[1]))} micron` };
  const mil = /(\d+(?:\.\d+)?)\s?mil\b/i.exec(text);
  if (mil) {
    const v = Number(mil[1]);
    return { value: round(v * MICRON_PER_MIL, 0.1), label: `${trimNum(v)} mil` };
  }
  const gauge = /(\d+)\s?gauge\b/i.exec(text);
  if (gauge) {
    const v = Number(gauge[1]);
    return { value: round(v * MICRON_PER_GAUGE, 0.1), label: `${v} gauge` };
  }
  return null;
}

export function parseNeckFinish(text: string): string | null {
  const m = /\b(\d{2})\s?[-/]\s?(400|405|410|415|425)\b/.exec(text);
  return m ? `${m[1]}-${m[2]}` : null;
}

const has = (text: string, re: RegExp) => re.test(text);

function collect(text: string, rules: [RegExp, string][]): string[] {
  return [...new Set(rules.filter(([re]) => re.test(text)).map(([, label]) => label))];
}

const CLOSURE_RULES: [RegExp, string][] = [
  [/cap not included|caps? sold separately|cap size:.*sold separately/i, "Cap sold separately"],
  [/flip[- ]?top/i, "Flip-top cap"],
  [/includes .*cap|with (?:\w+ )?cap\b|\(\w+ cap\)|cap included|spice cap included/i, "Cap included"],
  [/sifter/i, "Sifter fitment"],
  [/dropper/i, "Dropper"],
  [/\bTE\b|tamper[- ]evident/i, "Tamper-evident"],
  [/resealable|zip\b|zipper/i, "Resealable zip"],
  [/spout/i, "Spout"],
  [/valve/i, "One-way valve"],
  [/self[- ]seal|peel and seal|grip seal/i, "Self-seal"],
  [/top[- ]tuck/i, "Tuck-top"],
];

const FINISH_RULES: [RegExp, string][] = [
  [/\bclear\b|flint|transparent/i, "Clear"],
  [/\bamber\b/i, "Amber"],
  [/\bmatte\b/i, "Matte"],
  [/\bgloss/i, "Gloss"],
  [/\bkraft\b/i, "Kraft"],
  [/metallic|brushed|wire-drawn|\bgold\b|\bfoil\b/i, "Metallic"],
  [/\bwhite\b/i, "White"],
  [/\bblack\b/i, "Black"],
  [/waterproof/i, "Waterproof"],
];

const PRINT_RULES: [RegExp, string][] = [
  [/full[- ]colou?r|cmyk/i, "Full colour (CMYK)"],
  [/digital(?: print)?/i, "Digital print"],
  [/gravure/i, "Gravure print"],
  [/uv(?:[- ]printed| spot| printing)/i, "UV spot print"],
  [/label panel/i, "Label panel"],
  [/pressure[- ]sensitive label/i, "Pressure-sensitive label"],
  [/pre-printed|blank|plain\b/i, "Plain / blank available"],
];

/** Everything the listing states, structured. */
export function extractSpecs(p: SpecSource): ProductSpecs {
  const text = `${p.title} ${p.subcategory ?? ""} ${p.material} ${p.description ?? ""}`;
  const custom = p.stockOrCustom === "CUSTOM" || /\bcustom\b/i.test(p.title);

  const printing = collect(text, PRINT_RULES);
  if (custom && /print|artwork|cmyk|colou?r/i.test(text) && !printing.length) printing.push("Custom print");

  const customization: string[] = [];
  if (custom && /print|artwork|cmyk|label|colou?rs?|sticker|die[- ]cut|tape|tissue/i.test(text))
    customization.push("Custom printing");
  if (/upload (?:your )?artwork/i.test(text)) customization.push("Artwork upload");
  if (/\bsizes? offered|custom size|any size|size-dependent|choose (?:a|your) size/i.test(text))
    customization.push("Choice of sizes");
  if (/colou?rs?: up to \d+/i.test(text)) {
    const m = /colou?rs?: up to (\d+)/i.exec(text)!;
    customization.push(`Up to ${m[1]} print colours`);
  }

  const wall = has(text, /double[- ]wall/i)
    ? "Double wall"
    : has(text, /single[- ]wall/i)
      ? "Single wall"
      : null;
  const strengthMatch =
    /(\d{2,3})\s?ECT\b/i.exec(text) ?? /(\d{3})\s?#|(\d{3})\s?lb(?:s)? (?:test|burst)/i.exec(text);
  const strength = strengthMatch
    ? strengthMatch[0].replace(/\s+/g, " ").trim()
    : has(text, /standard strength/i)
      ? "Standard strength"
      : null;

  const setup = /(setup:[^.]*\.|no setup[^.]*\.|tooling[^.]*\.|cylinders required[^.]*\.)/i.exec(
    p.description ?? "",
  );
  const sample =
    /(sample[^.;"]*\$\d[^.;"]*|\$\d[^.;"]*sample[^.;"]*|free(?: product)? samples?[^.;"]*|samples? (?:also )?priced[^.;"]*|quantity-1 proofs available)/i.exec(
      `${p.title} ${p.description ?? ""}`,
    );
  const lead =
    /(\d+\s?(?:–|-|to)\s?\d+\s?(?:week|day|business day)s? lead time|turnaround time as fast as [^".;]*)/i.exec(
      p.description ?? "",
    );

  return {
    capacity: parseCapacity(p.title, p.description),
    dimensions: parseDimensions(p.title, p.categorySlug) ?? parseDimensions(p.description ?? "", p.categorySlug),
    thickness: parseThickness(`${p.title} ${p.material}`) ?? parseThickness(p.description ?? ""),
    neckFinish: parseNeckFinish(text),
    closures: collect(text, CLOSURE_RULES).filter(
      (c, _, all) => !(c === "Cap included" && all.includes("Cap sold separately")),
    ),
    finishes: collect(`${p.title} ${p.material}`, FINISH_RULES),
    printing,
    customization: [...new Set(customization)],
    wall,
    strength,
    setupNote: setup ? setup[1].replace(/^setup:\s*/i, "").trim() : null,
    sampleNote: sample ? sample[1].trim() : null,
    leadNote: lead ? lead[1].trim() : null,
  };
}
