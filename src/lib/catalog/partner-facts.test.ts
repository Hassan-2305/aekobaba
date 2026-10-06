import { describe, expect, it } from "vitest";

import { partnerFactsFor, PARTNER_SUPPLIED_FACTS, type PartnerSuppliedFacts } from "./partner-facts";

// Partner-supplied facts fill gaps, are labelled as supplied (not captured),
// never override what the supplier's own page publishes, and do nothing
// until the partner has actually sent them.

const url = "https://partner.example/sku-1";
const listing = {
  sourceUrl: url,
  moq: null,
  moqUnit: null,
  leadTimeDays: null,
  supplier: { slug: "berlin-packaging", name: "Berlin Packaging" },
};
const supplied = (over: Partial<PartnerSuppliedFacts>): Record<string, PartnerSuppliedFacts> => ({
  [url]: {
    supplier: "berlin-packaging",
    moq: 240,
    moqUnit: "bottles",
    leadTimeDays: 5,
    casePack: 240,
    suppliedAt: "2026-10-10",
    ...over,
  },
});

describe("partnerFactsFor", () => {
  it("fills missing MOQ and lead time and labels them as partner-supplied", () => {
    const result = partnerFactsFor(listing, supplied({}));
    expect(result).toMatchObject({ moq: 240, moqUnit: "bottles", leadTimeDays: 5 });
    expect(result.facts).toEqual({
      supplierName: "Berlin Packaging",
      suppliedAt: "2026-10-10",
      moq: true,
      leadTime: true,
      casePack: 240,
    });
  });

  it("never overrides a value captured from the supplier's page", () => {
    const result = partnerFactsFor({ ...listing, moq: 12, moqUnit: "pieces" }, supplied({}));
    expect(result.moq).toBe(12);
    expect(result.facts?.moq).toBe(false);
  });

  it("does nothing until the partner has supplied values, or for another supplier", () => {
    expect(partnerFactsFor(listing, supplied({ suppliedAt: null })).facts).toBeNull();
    expect(
      partnerFactsFor({ ...listing, supplier: { slug: "someone-else", name: "X" } }, supplied({})).facts,
    ).toBeNull();
  });

  it("ships every Berlin entry pending — no invented values", () => {
    for (const entry of Object.values(PARTNER_SUPPLIED_FACTS)) {
      expect(entry.suppliedAt).toBeNull();
      expect([entry.moq, entry.leadTimeDays, entry.casePack]).toEqual([null, null, null]);
    }
  });
});
