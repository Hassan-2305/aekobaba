import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ResultsView } from "./results-view";
import { baseFilters, makeProduct } from "@/lib/catalog/test-fixtures";

// Partner listings lead every result set, labelled as sponsored; the rest
// keep the visitor's sort.

describe("ResultsView — partner first", () => {
  it("renders partner listings first with a sponsored note", () => {
    const cheap = makeProduct({ basePrice: 0.1 });
    const base = makeProduct({ basePrice: 9 });
    const partner = { ...base, supplier: { ...base.supplier, slug: "berlin", name: "Berlin", isPartner: true } };
    const html = renderToStaticMarkup(
      createElement(ResultsView, {
        filters: { ...baseFilters(), sort: "price" as const },
        resolved: null,
        allProducts: [cheap, partner],
      }),
    );
    const order = [...html.matchAll(/data-product-id="([^"]+)"/g)].map((m) => m[1]);
    expect(order).toEqual([partner.id, cheap.id]);
    expect(html).toContain('data-testid="partner-band"');
    expect(html).toContain("Sponsored");
  });
});
