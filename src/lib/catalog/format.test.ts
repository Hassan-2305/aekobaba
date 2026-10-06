import { describe, expect, it } from "vitest";

import {
  effectiveUnitPrice,
  formatBreakRange,
  formatCaptureDate,
  formatLeadTime,
  formatMoney,
  formatMoq,
  formatPerUnit,
  formatPriceLine,
  formatUnitMoney,
  captureAgeDays,
  isStaleCapture,
  priceCurrency,
  unitPrice,
} from "./format";

// The truth rule lives in formatting: an unpublished price formats as "Ask
// the supplier", an unpublished MOQ / lead time as "Not published" — never a
// default or estimate (spec C2).

describe("formatMoney", () => {
  it("renders dollars with two decimals", () => {
    expect(formatMoney(0.58)).toBe("$0.58");
    expect(formatMoney(5.6)).toBe("$5.60");
    expect(formatMoney(1234.5)).toBe("$1,234.50");
  });
});

describe("formatCaptureDate", () => {
  it("formats as UTC-stable 'D Mon YYYY' regardless of local timezone", () => {
    // 2026-09-18T00:00:00Z must be 18 Sep 2026 even at UTC-12.
    expect(formatCaptureDate("2026-09-18T00:00:00Z")).toBe("18 Sep 2026");
    expect(formatCaptureDate("2026-09-18T23:59:59Z")).toBe("18 Sep 2026");
  });
});

describe("effectiveUnitPrice", () => {
  it("prefers the computed per-unit figure, then the base price", () => {
    expect(effectiveUnitPrice({ priceUnit: 0.47, basePrice: 0.58 })).toBe(0.47);
    expect(effectiveUnitPrice({ priceUnit: null, basePrice: 0.58 })).toBe(0.58);
    expect(effectiveUnitPrice({ priceUnit: null, basePrice: null })).toBeNull();
  });
});

describe("formatPriceLine", () => {
  it("renders 'Ask the supplier' for a null price — never a number", () => {
    expect(formatPriceLine(null, "per bucket")).toBe("Ask the supplier");
    expect(formatPriceLine(null, null)).toBe("Ask the supplier");
  });

  it("joins price and basis", () => {
    expect(formatPriceLine(5.61, "per bucket (USD)")).toBe("$5.61 per bucket (USD)");
    expect(formatPriceLine(0.58, null)).toBe("$0.58");
  });
});

describe("formatPerUnit", () => {
  it("returns null for a missing per-unit figure", () => {
    expect(formatPerUnit(null)).toBeNull();
    expect(formatPerUnit(0.47)).toBe("≈ $0.47 per unit");
  });
});

describe("formatMoq", () => {
  it("renders a muted 'Not published' when no MOQ is published — never a default", () => {
    expect(formatMoq(null, null)).toBe("Not published");
  });

  it("formats published minimums with thousands separators", () => {
    expect(formatMoq(1, "piece")).toBe("1 piece");
    expect(formatMoq(1000, "units")).toBe("1,000 units");
    expect(formatMoq(500, null)).toBe("500 units");
  });
});

describe("formatLeadTime", () => {
  it("renders 'Not published' when lead time is unpublished", () => {
    expect(formatLeadTime(null)).toBe("Not published");
  });

  it("formats days", () => {
    expect(formatLeadTime(14)).toBe("14 days");
    expect(formatLeadTime(1)).toBe("1 day");
  });
});

describe("formatBreakRange", () => {
  it("formats closed and open tiers", () => {
    expect(formatBreakRange(1, 249)).toBe("1–249");
    expect(formatBreakRange(1000, null)).toBe("1,000+");
  });
});

describe("currency", () => {
  it("reads the published currency from the basis and never shows £ as $", () => {
    expect(priceCurrency("per pack of 10 boxes (GBP, inc. VAT)")).toBe("GBP");
    expect(priceCurrency("per box, from-price (EUR, HT)")).toBe("EUR");
    expect(priceCurrency("per piece (INR, excluding GST)")).toBe("INR");
    expect(priceCurrency("per bottle (USD)")).toBe("USD");
    expect(priceCurrency(null)).toBe("USD");
    expect(formatPriceLine(8.52, "per pack of 10 boxes (GBP, inc. VAT)")).toBe(
      "£8.52 per pack of 10 boxes (GBP, inc. VAT)",
    );
  });
});

describe("unitPrice — comparable per-unit figure", () => {
  it("divides a pack price by the pack size the supplier states", () => {
    const polybags = unitPrice({ basePrice: 73.72, priceBasis: "per 1000 bags, ex. VAT (GBP)", priceUnit: null });
    expect(polybags).toMatchObject({ currency: "GBP", unit: "bag", packSize: 1000 });
    expect(formatUnitMoney(polybags!.amount, polybags!.currency)).toBe("£0.074");

    const burch = unitPrice({ basePrice: 9.15, priceBasis: "per case of 24 jars (USD)", priceUnit: null });
    expect(burch).toMatchObject({ unit: "jar", packSize: 24 });
    expect(burch!.amount).toBeCloseTo(0.38125);

    const mule = unitPrice({
      basePrice: 60,
      priceBasis: "configurator default quantity (USD; 50 stickers at $1.20 each)",
      priceUnit: 1.2,
    });
    expect(mule).toMatchObject({ amount: 1.2, unit: "sticker", packSize: 50 });
  });

  it("keeps a per-item price as is, and never guesses an unknown pack size", () => {
    expect(unitPrice({ basePrice: 0.6, priceBasis: "per bottle (USD), cap sold separately", priceUnit: null }))
      .toMatchObject({ amount: 0.6, unit: "bottle", packSize: 1 });
    expect(unitPrice({ basePrice: 9.87, priceBasis: "per pack, from-price (USD; pack size varies)", priceUnit: null }))
      .toBeNull();
    expect(unitPrice({ basePrice: null, priceBasis: "per case of 24 jars", priceUnit: null })).toBeNull();
  });

  it("orders mixed currencies by indicative USD value for the price sort", () => {
    const gbp = effectiveUnitPrice({ basePrice: 1, priceUnit: null, priceBasis: "per box (GBP)" })!;
    const inr = effectiveUnitPrice({ basePrice: 1, priceUnit: null, priceBasis: "per piece (INR)" })!;
    expect(gbp).toBeGreaterThan(1);
    expect(inr).toBeLessThan(0.1);
  });
});

describe("capture age", () => {
  const now = new Date("2026-10-06T12:00:00Z");
  it("counts whole UTC days and flags captures older than two weeks", () => {
    expect(captureAgeDays("2026-10-03T00:00:00Z", now)).toBe(3);
    expect(captureAgeDays("2026-09-21T00:00:00Z", now)).toBe(15);
    expect(isStaleCapture("2026-10-03T00:00:00Z", now)).toBe(false);
    expect(isStaleCapture("2026-09-21T00:00:00Z", now)).toBe(true);
  });
});
