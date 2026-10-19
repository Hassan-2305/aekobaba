import { describe, expect, it } from "vitest";

import { adminQuoteActionSchema } from "./admin-actions";
import { applicationSchema } from "./applications";
import { composeRfqEmail, rfqSubject } from "./mailto";
import { isUniqueViolation, makeReference } from "./reference";
import { customerSupplierStatus, label, quoteVisibleToCustomer, suggestedStage } from "./statuses";

describe("makeReference", () => {
  it("formats prefix, UTC date and an unambiguous 4-character tail", () => {
    let i = 0;
    const ref = makeReference("AEK", new Date("2026-10-19T23:30:00Z"), () => i++);
    expect(ref).toBe("AEK-261019-2345");
    expect(makeReference("APP", new Date("2026-01-05T00:00:00Z"))).toMatch(/^APP-260105-[2-9A-HJ-NP-Z]{4}$/);
  });
  it("recognises Prisma unique violations only", () => {
    expect(isUniqueViolation({ code: "P2002" })).toBe(true);
    expect(isUniqueViolation(new Error("x"))).toBe(false);
  });
});

describe("composeRfqEmail", () => {
  const email = composeRfqEmail({
    reference: "AEK-261019-7KQ4",
    supplierName: "Burch Bottle & Packaging",
    supplierEmail: "sales@burch.example",
    lines: [
      { productTitle: "8 oz Flint Boston Round", quantity: 1200, sourceUrl: "https://burch.example/8oz", specNotes: "Black cap" },
      { productTitle: "4 oz Amber Jar", quantity: 500 },
    ],
    deadline: "2026-11-30",
    requirements: "Food-grade",
    artworkAvailable: true,
    signOff: "Sam",
  });

  it("uses the required subject format", () => {
    expect(email.subject).toBe("Aekobaba RFQ — AEK-261019-7KQ4 — 8 oz Flint Boston Round (+1 more)");
    expect(rfqSubject("AEK-1", "x".repeat(100), 0)).toHaveLength("Aekobaba RFQ — AEK-1 — ".length + 68);
  });

  it("explains the request with quantities, specs, links and the reference — no buyer identity", () => {
    expect(email.body).toContain("received a sourcing request from one of our customers");
    expect(email.body).toContain("Quantity: 1,200");
    expect(email.body).toContain("Specification: Black cap");
    expect(email.body).toContain("https://burch.example/8oz");
    expect(email.body).toContain("Needed by: 2026-11-30");
    expect(email.body).toContain("artwork / design files");
    expect(email.body).toContain("Sam\nTeam Aekovera");
  });

  it("builds a mailto: link that composes, never sends", () => {
    expect(email.href.startsWith("mailto:sales@burch.example?subject=")).toBe(true);
    expect(decodeURIComponent(email.href.split("&body=")[1])).toBe(email.body);
  });
});

describe("status helpers", () => {
  it("shows the buyer a plain-language supplier status and hides unshared quotes", () => {
    expect(customerSupplierStatus("NOT_CONTACTED", "AWAITING_QUOTE")).toBe("We're contacting the supplier");
    expect(customerSupplierStatus("CONTACTED", "AWAITING_QUOTE")).toBe("Waiting for the supplier's quote");
    expect(customerSupplierStatus("REPLIED", "QUOTE_RECEIVED")).toMatch(/reviewing/);
    expect(customerSupplierStatus("REPLIED", "SHARED_WITH_CUSTOMER")).toBe("Quote ready");
    expect(quoteVisibleToCustomer("QUOTE_RECEIVED")).toBe(false);
    expect(quoteVisibleToCustomer("SHARED_WITH_CUSTOMER")).toBe(true);
  });
  it("suggests an overall stage from supplier lines", () => {
    expect(suggestedStage([])).toBe("NEW");
    expect(suggestedStage([{ outreachStatus: "NOT_CONTACTED", commercialStatus: "AWAITING_QUOTE" }])).toBe("NEW");
    expect(suggestedStage([{ outreachStatus: "CONTACTED", commercialStatus: "AWAITING_QUOTE" }])).toBe("IN_PROGRESS");
    expect(
      suggestedStage([
        { outreachStatus: "REPLIED", commercialStatus: "SHARED_WITH_CUSTOMER" },
        { outreachStatus: "CONTACTED", commercialStatus: "AWAITING_QUOTE" },
      ]),
    ).toBe("QUOTES_SHARED");
    expect(suggestedStage([{ outreachStatus: "REPLIED", commercialStatus: "DECLINED" }])).toBe("COMPLETED");
  });
  it("labels every status", () => {
    expect(label("FOLLOW_UP_NEEDED")).toBe("Follow-up needed");
    expect(label(null)).toBe("—");
  });
});

describe("adminQuoteActionSchema", () => {
  it("accepts each action shape and rejects unknown statuses", () => {
    expect(adminQuoteActionSchema.safeParse({ action: "updateRequest", stage: "IN_PROGRESS", nextActionDue: "2026-11-01" }).success).toBe(true);
    expect(adminQuoteActionSchema.safeParse({ action: "updateSupplier", lineId: "l1", outreachStatus: "QUOTED" }).success).toBe(false);
    expect(
      adminQuoteActionSchema.safeParse({ action: "logOutreach", lineId: "l1", direction: "INBOUND", summary: "Can do 1,200 at $0.62" }).success,
    ).toBe(true);
    expect(adminQuoteActionSchema.safeParse({ action: "recordQuote", lineId: "l1", lines: [] }).success).toBe(false);
    expect(
      adminQuoteActionSchema.safeParse({ action: "recordQuote", lineId: "l1", lines: [{ itemId: "i1", unitPrice: 0.62 }] }).success,
    ).toBe(true);
    expect(adminQuoteActionSchema.safeParse({ action: "updateItem", itemId: "i1", sampleStatus: "DISPATCHED" }).success).toBe(true);
    expect(adminQuoteActionSchema.safeParse({ action: "setSupplierEmail", supplierId: "s1", email: "nope" }).success).toBe(false);
  });
});

describe("applicationSchema", () => {
  const base = { type: "LISTING", companyName: "Jar Co", website: "jarco.com", contactName: "Lee", contactEmail: "lee@jarco.com" };
  it("normalises the website and defaults lists", () => {
    const parsed = applicationSchema.parse(base);
    expect(parsed.website).toBe("https://jarco.com");
    expect(parsed.categories).toEqual([]);
  });
  it("rejects bots that fill the honeypot", () => {
    expect(applicationSchema.safeParse({ ...base, fax: "555" }).success).toBe(false);
  });
});
