import { describe, expect, it } from "vitest";

import { partnerFirst, PARTNER_PROFILES, varietyOrder } from "./partners";
import { makeProduct } from "./test-fixtures";

describe("partner profiles", () => {
  it("source every fact and service", () => {
    for (const profile of Object.values(PARTNER_PROFILES)) {
      // A public page, or a document the partner supplied (hosted under /partners/<slug>/).
      const src = /^(https:\/\/|\/partners\/[a-z0-9-]+\/)/;
      for (const fact of profile.facts) expect(fact.sourceUrl).toMatch(src);
      for (const service of profile.services) expect(service.sourceUrl).toMatch(src);
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

describe("featured partners", () => {
  it("features Berlin, Daehung and Print247, in that order", async () => {
    const { partnerRank } = await import("./partners");
    expect(Object.keys(PARTNER_PROFILES)).toEqual(["berlin-packaging", "daehung-pack", "print247"]);
    expect(partnerRank("berlin-packaging")).toBeLessThan(partnerRank("daehung-pack"));
    expect(partnerRank("daehung-pack")).toBeLessThan(partnerRank("print247"));
    expect(partnerRank("someone-else")).toBeGreaterThan(partnerRank("print247"));
  });

  it("marks every profiled partner as a partner in the seed, with its logo on disk", async () => {
    const { readFileSync, existsSync } = await import("node:fs");
    const path = await import("node:path");
    const seed = JSON.parse(readFileSync(path.join(process.cwd(), "data/aekobaba-seed.json"), "utf8")) as {
      suppliers: { slug: string; isPartner: boolean }[];
    };
    for (const profile of Object.values(PARTNER_PROFILES)) {
      expect(seed.suppliers.find((s) => s.slug === profile.slug)?.isPartner, profile.slug).toBe(true);
      expect(existsSync(path.join(process.cwd(), "public", profile.logoUrl)), profile.logoUrl).toBe(true);
    }
  });
});
