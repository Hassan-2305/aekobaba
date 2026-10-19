import { beforeEach, describe, expect, it, vi } from "vitest";

// Route contract for POST /api/quotes: auth gates resolve before any parse
// (401 anonymous → sign-in round trip, 403 supplier/admin), validation rejects
// bad payloads, contact details fall back to the session email, artwork goes
// through the injected uploader, and the happy path hands off to submitRfq
// then tries to deliver the queued team email.

const mocks = vi.hoisted(() => ({
  getServerSessionUser: vi.fn(),
  getCurrentUserRole: vi.fn(),
  artworkUploader: vi.fn(),
  submitRfq: vi.fn(),
  deliverOutbox: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getServerSessionUser: mocks.getServerSessionUser,
  getCurrentUserRole: mocks.getCurrentUserRole,
}));
vi.mock("@/lib/quotes/storage", () => ({
  artworkUploader: mocks.artworkUploader,
  MAX_ARTWORK_BYTES: 10 * 1024 * 1024,
}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/rfq/submit", () => ({ submitRfq: mocks.submitRfq }));
vi.mock("@/lib/notify/outbox", () => ({ deliverOutbox: mocks.deliverOutbox }));

import { POST } from "./route";

function postForm(payload: unknown, artwork?: File) {
  const form = new FormData();
  form.set("payload", JSON.stringify(payload));
  if (artwork) form.set("artwork", artwork);
  return POST(new Request("http://localhost:3000/api/quotes", { method: "POST", body: form }));
}

const OK = {
  ok: true,
  id: "qr_new",
  reference: "AEK-261019-7KQ4",
  itemCount: 2,
  supplierCount: 2,
  outboxId: "ob_1",
  warnings: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getServerSessionUser.mockResolvedValue({ supabaseUserId: "sb_brand", email: "brand@acme.test", emailVerified: true });
  mocks.getCurrentUserRole.mockResolvedValue("BRAND");
  mocks.submitRfq.mockResolvedValue(OK);
  mocks.deliverOutbox.mockResolvedValue({ sent: 1, failed: 0, skipped: 0 });
});

describe("POST /api/quotes", () => {
  it("returns 401 for an anonymous visitor — the client redirects to sign-in, basket preserved", async () => {
    mocks.getServerSessionUser.mockResolvedValue(null);
    const res = await postForm({ items: [{ productId: "p_1", quantity: 100 }] });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthenticated" });
  });

  it("returns 403 for a SUPPLIER account — only brands send quote requests", async () => {
    mocks.getCurrentUserRole.mockResolvedValue("SUPPLIER");
    const res = await postForm({ items: [{ productId: "p_1", quantity: 100 }] });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "role_mismatch" });
  });

  it("returns 400 for a malformed payload envelope", async () => {
    const form = new FormData();
    form.set("payload", "not json");
    const res = await POST(new Request("http://localhost:3000/api/quotes", { method: "POST", body: form }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_payload" });
  });

  it("returns 400 when the payload fails validation (no items, bad quantity, bad email)", async () => {
    for (const payload of [
      { items: [] },
      { items: [{ productId: "p_1", quantity: "lots" }] },
      { items: [{ productId: "p_1", quantity: 1 }], contact: { name: "A", email: "not-an-email" } },
    ]) {
      const res = await postForm(payload);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "invalid_payload" });
    }
  });

  it("submits the RFQ with contact details and returns 201 with id and reference", async () => {
    const res = await postForm({
      items: [
        { productId: "p_1", quantity: 1000, specNotes: "Black cap" },
        { productId: "p_2", quantity: 10 },
      ],
      contact: { name: "Ada Brand", email: "ada@acme.test", phone: "+1 555 0100", company: "Acme Foods" },
      deadline: "2026-11-15",
      notes: "Food-grade only",
      artworkNotes: "Matte finish",
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      quoteRequest: { id: "qr_new", reference: "AEK-261019-7KQ4", status: "SENT" },
      itemCount: 2,
      supplierCount: 2,
      warnings: [],
    });
    expect(mocks.submitRfq.mock.calls[0][1]).toMatchObject({
      supabaseUserId: "sb_brand",
      contact: { name: "Ada Brand", email: "ada@acme.test", company: "Acme Foods" },
      deadline: new Date("2026-11-15T00:00:00.000Z"),
      notes: "Food-grade only",
      artworkNotes: "Matte finish",
      artworkFileUrl: null,
    });
    expect(mocks.deliverOutbox).toHaveBeenCalledWith({}, { ids: ["ob_1"] });
    expect(mocks.artworkUploader).not.toHaveBeenCalled();
  });

  it("falls back to the session email when no contact block is sent", async () => {
    await postForm({ items: [{ productId: "p_1", quantity: 5 }] });
    expect(mocks.submitRfq.mock.calls[0][1].contact).toEqual({ name: "brand", email: "brand@acme.test" });
  });

  it("still returns 201 when email delivery fails — the outbox keeps the notification", async () => {
    mocks.deliverOutbox.mockRejectedValue(new Error("provider down"));
    const res = await postForm({ items: [{ productId: "p_1", quantity: 5 }] });
    expect(res.status).toBe(201);
  });

  it("maps unknown_products with the offending ids and a 400", async () => {
    mocks.submitRfq.mockResolvedValue({ ok: false, reason: "unknown_products", unknownProductIds: ["ghost"] });
    const res = await postForm({ items: [{ productId: "ghost", quantity: 10 }] });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "unknown_products", unknownProductIds: ["ghost"] });
  });

  it("uploads artwork through the factory uploader and passes the returned URL", async () => {
    mocks.artworkUploader.mockResolvedValue(async () => "https://storage.example/artwork/logo.pdf");
    const res = await postForm(
      { items: [{ productId: "p_1", quantity: 100 }] },
      new File(["pdf"], "logo.pdf", { type: "application/pdf" }),
    );
    expect(res.status).toBe(201);
    expect(mocks.submitRfq.mock.calls[0][1].artworkFileUrl).toBe("https://storage.example/artwork/logo.pdf");
  });

  it("returns 503 when artwork storage is not configured — never a fabricated URL", async () => {
    mocks.artworkUploader.mockResolvedValue(null);
    const res = await postForm(
      { items: [{ productId: "p_1", quantity: 100 }] },
      new File(["pdf"], "logo.pdf", { type: "application/pdf" }),
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "artwork_storage_unavailable" });
    expect(mocks.submitRfq).not.toHaveBeenCalled();
  });

  it("returns 413 for artwork beyond the 10 MiB ceiling", async () => {
    const oversized = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "huge.pdf", { type: "application/pdf" });
    const res = await postForm({ items: [{ productId: "p_1", quantity: 100 }] }, oversized);
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: "artwork_too_large" });
  });
});
