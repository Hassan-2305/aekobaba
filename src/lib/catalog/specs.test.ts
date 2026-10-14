import { describe, expect, it } from "vitest";

import { extractSpecs, parseCapacity, parseDimensions, parseThickness } from "./specs";

// Specs come only from the listing's own words — nothing is inferred.

const base = {
  description: null,
  material: "Glass",
  subcategory: null,
  categorySlug: "glass-bottles",
  priceBasis: null,
  stockOrCustom: "STOCK" as const,
};

describe("parseCapacity", () => {
  it("reads oz, ml, cc and gallons, preferring the title", () => {
    expect(parseCapacity("16oz (480ml) Amber Boston Round", null)).toEqual({ value: 473.2, label: "16 oz (480 ml)" });
    expect(parseCapacity("30 ml Amber Euro Dropper", null)?.value).toBe(30);
    expect(parseCapacity("3 cc LDPE Dropper", null)?.label).toBe("3 cc");
    expect(parseCapacity("5 Gallon Bucket", null)?.label).toBe("5 gallons");
    expect(parseCapacity("Honey bear", "holds 8 fl oz (12 honey-weight oz)")?.label).toBe("8 oz (235 ml)");
    expect(parseCapacity("Corrugated box", null)).toBeNull();
  });
});

describe("parseDimensions", () => {
  it("reads inch and mm sizes, fractions, and unit-less box sizes", () => {
    expect(parseDimensions("10 x 8 x 6 Corrugated Boxes", "corrugated")).toEqual({ value: 10, label: "10 × 8 × 6 in" });
    expect(parseDimensions("4-1/2 x 5-1/2 Envelopes", "mailers")?.label).toBe("4.5 × 5.5 in");
    expect(parseDimensions("Box 229 x 152 x 152mm", "corrugated")?.value).toBeCloseTo(9.02, 1);
    expect(parseDimensions("Tissue (19.5in x 30in)", "brand-accessories")?.label).toBe("19.5 × 30 in");
  });

  it("never guesses: unit-less sizes outside box categories and film rolls are skipped", () => {
    expect(parseDimensions("10 x 8 label", "labels")).toBeNull();
    expect(parseDimensions("16 x 1500 ft Stretch Film", "corrugated")).toBeNull();
  });
});

describe("parseThickness", () => {
  it("normalizes micron, mil and gauge to µm", () => {
    expect(parseThickness("12 Micron film")?.value).toBe(12);
    expect(parseThickness("90 Mil bucket")?.value).toBe(2286);
    expect(parseThickness("150 gauge bag")?.value).toBe(38.1);
  });
});

describe("extractSpecs", () => {
  it("collects neck finish, closures, finishes from the listing text", () => {
    const s = extractSpecs({
      ...base,
      title: "8 oz Clear PET Plastic Honey Bear Bottles (Cap Not Included) — 3351B09-B",
      description: '"Cap Size: 38-400 (sold separately)"; front and back label panels',
      material: "Clear PET plastic",
    });
    expect(s.neckFinish).toBe("38-400");
    expect(s.closures).toEqual(["Cap sold separately"]);
    expect(s.finishes).toContain("Clear");
    expect(s.printing).toContain("Label panel");
  });

  it("reads setup and sample terms only when published", () => {
    const s = extractSpecs({
      ...base,
      title: "Custom Printed Stand-Up Pouch",
      categorySlug: "pouches-bags",
      stockOrCustom: "CUSTOM",
      description: "Print: digital or gravure. Colours: up to 10. Setup: none for digital; printing cylinders required for gravure.",
    });
    expect(s.setupNote).toBe("none for digital; printing cylinders required for gravure.");
    expect(s.customization).toEqual(["Custom printing", "Up to 10 print colours"]);
    expect(s.sampleNote).toBeNull();
    expect(extractSpecs({ ...base, title: "Plain jar" }).setupNote).toBeNull();
  });
});
