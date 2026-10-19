import { afterEach, describe, expect, it, vi } from "vitest";

import { deliverOutbox, teamInbox, type OutboxMessage } from "./outbox";
import { applicationEmail, inquiryEmail, newRequestEmail } from "./templates";

function fakeDb(rows: (OutboxMessage & { id: string; status: string; attempts: number })[]) {
  const updates: { id: string; data: Record<string, unknown> }[] = [];
  return {
    updates,
    notificationOutbox: {
      findMany: vi.fn(async () => rows),
      updateMany: vi.fn(async () => ({ count: 1 })),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        updates.push({ id: where.id, data });
        return {};
      }),
    },
  };
}

afterEach(() => {
  delete process.env.TEAM_INBOX_EMAIL;
});

describe("deliverOutbox", () => {
  const row = { id: "ob1", kind: "rfq.created", toEmail: "team@x.test", subject: "S", textBody: "B", status: "PENDING", attempts: 0 };

  it("marks rows SENT on success and FAILED with the error otherwise — never throws", async () => {
    const db = fakeDb([row, { ...row, id: "ob2" }]);
    const sender = vi.fn().mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false, error: "resend_500" });
    const result = await deliverOutbox(db as never, { sender });
    expect(result).toEqual({ sent: 1, failed: 1, skipped: 0 });
    expect(db.updates[0]).toMatchObject({ id: "ob1", data: { status: "SENT" } });
    expect(db.updates[1]).toMatchObject({ id: "ob2", data: { status: "FAILED", lastError: "resend_500" } });
  });

  it("leaves rows untouched when no email provider is configured", async () => {
    const db = fakeDb([row]);
    const result = await deliverOutbox(db as never, { ids: ["ob1"] });
    expect(result).toEqual({ sent: 0, failed: 0, skipped: 1 });
    expect(db.notificationOutbox.findMany).not.toHaveBeenCalled();
  });
});

describe("team email templates", () => {
  it("defaults to the Aekovera inbox and can be overridden", () => {
    expect(teamInbox()).toBe("teamaekovera@gmail.com");
    process.env.TEAM_INBOX_EMAIL = "ops@x.test";
    expect(teamInbox()).toBe("ops@x.test");
  });

  it("new request email has reference, customer, products by supplier, quantities and the dashboard link", () => {
    const mail = newRequestEmail({
      id: "qr_1",
      reference: "AEK-261019-7KQ4",
      contactName: "Ada",
      contactEmail: "ada@acme.test",
      contactPhone: null,
      companyName: "Acme Foods",
      deadline: "2026-11-30",
      notes: "Food-grade",
      artworkNotes: null,
      hasArtworkFile: true,
      lines: [
        { supplierName: "Burch", productTitle: "8 oz Boston", quantity: 1200, specNotes: "Black cap" },
        { supplierName: "SKS", productTitle: "Honey bear", quantity: 300, specNotes: null },
      ],
    });
    expect(mail.toEmail).toBe("teamaekovera@gmail.com");
    expect(mail.subject).toBe("New quote request AEK-261019-7KQ4 — Acme Foods");
    for (const part of ["Ada", "ada@acme.test", "Acme Foods", "Burch\n  - 8 oz Boston — qty 1,200", "Spec: Black cap", "SKS", "Food-grade", "/admin/quotes/qr_1"])
      expect(mail.textBody).toContain(part);
  });

  it("application email names the request type and links the dashboard", () => {
    const mail = applicationEmail({
      id: "app_1",
      reference: "APP-261019-AB23",
      type: "PRODUCT_FETCH",
      companyName: "Jar Co",
      website: "https://jarco.com",
      location: null,
      contactName: "Lee",
      contactEmail: "lee@jarco.com",
      contactPhone: null,
      categories: [],
      catalogUrls: ["https://jarco.com/jars"],
      message: null,
    });
    expect(mail.subject).toBe("Fetch products: Jar Co (APP-261019-AB23)");
    expect(mail.textBody).toContain("authorize extraction");
    expect(mail.textBody).toContain("/admin/applications/app_1");
  });

  it("product-page request email names the product, supplier, customer and links the dashboard", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "aekobaba.vercel.app";
    const mail = inquiryEmail({
      reference: "KJGQJXBX",
      kind: "QUOTE",
      name: "Test",
      email: "buyer@x.test",
      quantity: "500",
      description: "Need black caps",
      hasFile: false,
      product: { id: "p1", title: "68 x 50 Clear PVC Shrink Band", supplierName: "Burch Bottle", sourceUrl: "https://burch.example/x" },
    });
    expect(mail.subject).toBe("Quote request #KJGQJXBX — Test — 68 x 50 Clear PVC Shrink Band");
    for (const part of ["buyer@x.test", "Burch Bottle", "Quantity: 500", "Need black caps", "https://aekobaba.vercel.app/admin/inquiries"])
      expect(mail.textBody).toContain(part);
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  });
});
