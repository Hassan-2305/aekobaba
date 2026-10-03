import { describe, expect, it } from "vitest";

import { partnerFirst, PARTNER_PROFILES, varietyOrder } from "./partners";
import { makeProduct } from "./test-fixtures";

describe("partner profiles", () => {
  it("source every fact and service", () => {
    for (const profile of Object.values(PARTNER_PROFILES)) {
      for (const fact of profile.facts) expect(fact.sourceUrl).toMatch(/^https:\/\//);
      for (const service of profile.services) expect(service.sourceUrl).toMatch(/^https:\/\//);
      expect(profile.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

describe("partnerFirst", () => {
  it("moves partner products to the front and keeps the rest in order", () => {
    const a = makeProduct();
    const b = makeProduct();
    const p = makeProduct();
    p.supplier = { ...p.supplier, isPartner: true };
    expect(partnerFirst([a, b, p]).map((x) => x.id)).toEqual([p.id, a.id, b.id]);
  });
});

describe("varietyOrder", () => {
  it("round-robins product types", () => {
    const mk = (sub: string) => ({ ...makeProduct(), subcategory: sub });
    const list = [mk("Honey bear"), mk("Honey bear"), mk("Spice jar"), mk("Packer")];
    expect(varietyOrder(list).map((p) => p.subcategory)).toEqual([
      "Honey bear",
      "Spice jar",
      "Packer",
      "Honey bear",
    ]);
  });
});
