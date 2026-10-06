import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { CATEGORY_GROUPS, CATEGORY_MENU, groupedMenu } from "./menu";

// The header menu is a code constant; this test is the sync mechanism with
// the seeded taxonomy. A seed rename must fail here, not ship a stale menu.

const seed = JSON.parse(
  readFileSync(path.join(__dirname, "../../../data/aekobaba-seed.json"), "utf8"),
) as { categories: { slug: string; name: string }[] };

describe("CATEGORY_MENU", () => {
  it("covers exactly the seeded taxonomy — same slugs, same names, same order", () => {
    expect(CATEGORY_MENU).toEqual(
      seed.categories.map((c) => ({ slug: c.slug, name: c.name })),
    );
  });

  it("links every menu entry through /results?category=", () => {
    for (const entry of CATEGORY_MENU) {
      expect(entry.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });
});

describe("CATEGORY_GROUPS", () => {
  it("puts every menu category in exactly one of seven groups", () => {
    expect(CATEGORY_GROUPS).toHaveLength(7);
    const grouped = CATEGORY_GROUPS.flatMap((g) => g.slugs);
    expect(new Set(grouped).size).toBe(grouped.length);
    expect([...grouped].sort()).toEqual(CATEGORY_MENU.map((c) => c.slug).sort());
    expect(groupedMenu().reduce((n, g) => n + g.entries.length, 0)).toBe(CATEGORY_MENU.length);
  });
});
