import { jsonError, requireApiRole } from "@/lib/auth/api";
import { getServerSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { deliverOutbox } from "@/lib/notify/outbox";
import { artworkUploader, MAX_ARTWORK_BYTES, type ArtworkFile } from "@/lib/quotes/storage";
import { quoteSubmitSchema } from "@/lib/quotes/validation";
import { submitRfq } from "@/lib/rfq/submit";

// POST /api/quotes — the buyer submits their Quote Basket as one RFQ.
//
// Multipart form: `payload` (JSON: items, contact, deadline, notes,
// artworkNotes) plus the optional `artwork` file. BRAND accounts only:
// anonymous → 401 (the client sends them to sign-in; the basket survives),
// other roles → 403. The request, its lines, per-supplier tracking rows and
// the team email are written in one transaction (src/lib/rfq/submit.ts);
// the email is delivered after commit and retried from the outbox if the
// provider is down. Suppliers are never emailed automatically.

const SUBMIT_FAILURE_STATUS = {
  empty_items: 400,
  no_brand_user: 403,
  unknown_products: 400,
} as const;

async function parseArtwork(value: FormDataEntryValue | null): Promise<ArtworkFile | null> {
  if (!(value instanceof File) || value.size === 0) return null;
  return {
    bytes: Buffer.from(await value.arrayBuffer()),
    contentType: value.type || "application/octet-stream",
    name: value.name,
  };
}

export async function POST(request: Request) {
  const auth = await requireApiRole("BRAND");
  if (auth.kind === "deny") return jsonError(auth.status, auth.code);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, "invalid_form");
  }

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(String(form.get("payload") ?? ""));
  } catch {
    return jsonError(400, "invalid_payload");
  }

  const parsed = quoteSubmitSchema.safeParse(rawPayload);
  if (!parsed.success) return jsonError(400, "invalid_payload");

  // Contact details: what the buyer typed, falling back to the verified
  // session email so the team always has a way to reach them.
  const session = await getServerSessionUser();
  const sessionEmail = session?.email ?? "";
  const contact = parsed.data.contact ?? {
    name: sessionEmail.split("@")[0] || "Customer",
    email: sessionEmail,
  };
  if (!contact.email) return jsonError(400, "contact_required");

  const artwork = await parseArtwork(form.get("artwork"));
  let artworkFileUrl: string | null = null;
  if (artwork) {
    if (artwork.bytes.byteLength > MAX_ARTWORK_BYTES) return jsonError(413, "artwork_too_large");
    const uploader = await artworkUploader();
    if (!uploader) return jsonError(503, "artwork_storage_unavailable");
    try {
      artworkFileUrl = await uploader(artwork);
    } catch (uploadError) {
      // The buyer must know their artwork did not attach — never submit silently without it.
      console.error("[aekobaba] artwork upload failed", uploadError);
      return jsonError(502, "artwork_upload_failed");
    }
  }

  const result = await submitRfq(db, {
    supabaseUserId: auth.supabaseUserId,
    items: parsed.data.items,
    contact,
    deadline: parsed.data.deadline ? new Date(`${parsed.data.deadline}T00:00:00Z`) : null,
    notes: parsed.data.notes ?? null,
    artworkNotes: parsed.data.artworkNotes ?? null,
    artworkFileUrl,
  });

  if (!result.ok) {
    return Response.json(
      { error: result.reason, unknownProductIds: result.unknownProductIds },
      { status: SUBMIT_FAILURE_STATUS[result.reason] },
    );
  }

  // Best-effort immediate delivery; the outbox keeps it if this fails.
  await deliverOutbox(db, { ids: [result.outboxId] }).catch((error) =>
    console.error("[aekobaba] team notification delivery failed", error),
  );

  return Response.json(
    {
      quoteRequest: { id: result.id, reference: result.reference, status: "SENT" },
      itemCount: result.itemCount,
      supplierCount: result.supplierCount,
      warnings: result.warnings,
    },
    { status: 201 },
  );
}
