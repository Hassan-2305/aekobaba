import { requireAdminApi } from "@/lib/auth/admin";
import { jsonError } from "@/lib/auth/api";
import { db } from "@/lib/db";
import { adminApplicationUpdateSchema } from "@/lib/rfq/applications";

// PATCH /api/admin/applications/:id — team review of a supplier application
// (status, notes) and, for partnerships, the meeting status and outcome.

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminApi();
  if (admin instanceof Response) return admin;
  const { id } = await params;
  const parsed = adminApplicationUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_payload");

  const app = await db.supplierApplication.findUnique({ where: { id }, select: { id: true, type: true } });
  if (!app) return jsonError(404, "not_found");

  const { meeting, ...fields } = parsed.data;
  await db.$transaction(async (tx) => {
    await tx.supplierApplication.update({ where: { id }, data: fields });
    if (meeting) {
      const data = {
        ...(meeting.status ? { status: meeting.status } : {}),
        ...(meeting.scheduledAt !== undefined ? { scheduledAt: meeting.scheduledAt ? new Date(meeting.scheduledAt) : null } : {}),
        ...(meeting.outcome !== undefined ? { outcome: meeting.outcome } : {}),
        ...(meeting.followUp !== undefined ? { followUp: meeting.followUp } : {}),
      };
      await tx.partnerMeeting.upsert({ where: { applicationId: id }, update: data, create: { applicationId: id, ...data } });
    }
  });
  return Response.json({ ok: true });
}
