import { jsonError } from "@/lib/auth/api";
import { getServerSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { deliverOutbox } from "@/lib/notify/outbox";
import { applicationSchema, createApplication } from "@/lib/rfq/applications";

// POST /api/applications — List your company / Fetch products / Become a partner.
// Listing and product-fetch requests need a signed-in account (the supplier
// signs in first); partnership requests may come from anyone. Stored PENDING,
// with a team email queued in the same transaction.

export async function POST(request: Request) {
  const parsed = applicationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_payload");

  const session = await getServerSessionUser();
  if (!session && parsed.data.type !== "PARTNERSHIP") return jsonError(401, "unauthenticated");
  if (parsed.data.type === "PRODUCT_FETCH" && parsed.data.catalogUrls.length === 0 && !parsed.data.message) {
    return jsonError(400, "catalog_required");
  }

  const user = session
    ? await db.user.findUnique({ where: { supabaseUserId: session.supabaseUserId }, select: { id: true } })
    : null;

  const created = await createApplication(db, parsed.data, user?.id ?? null);
  await deliverOutbox(db, { ids: [created.outboxId] }).catch((error) =>
    console.error("[aekobaba] application notification delivery failed", error),
  );

  const bookingUrl = parsed.data.type === "PARTNERSHIP" ? process.env.NEXT_PUBLIC_PARTNER_BOOKING_URL?.trim() || null : null;
  return Response.json({ id: created.id, reference: created.reference, bookingUrl }, { status: 201 });
}
