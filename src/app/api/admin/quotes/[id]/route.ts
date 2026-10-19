import { requireAdminApi } from "@/lib/auth/admin";
import { jsonError } from "@/lib/auth/api";
import { db } from "@/lib/db";
import { adminQuoteActionSchema, applyAdminQuoteAction } from "@/lib/rfq/admin-actions";

// PATCH /api/admin/quotes/:id — one team action on an RFQ (status changes,
// outreach log, supplier quote, sample tracking). ADMIN only; every action
// writes an activity row (src/lib/rfq/admin-actions.ts).

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi();
  if (admin instanceof Response) return admin;
  const { id } = await params;

  const parsed = adminQuoteActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_payload");

  const result = await applyAdminQuoteAction(db, { requestId: id, actorId: admin.id, action: parsed.data });
  if (!result.ok) return jsonError(result.status, result.error);
  return Response.json({ ok: true });
}
