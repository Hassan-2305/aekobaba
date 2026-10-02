import { z } from "zod";

import { jsonError, requireApiRole } from "@/lib/auth/api";
import { db } from "@/lib/db";

// PATCH /api/admin/inquiries/[id] — move an inquiry through NEW → CONTACTED → CLOSED.

const bodySchema = z.object({ status: z.enum(["NEW", "CONTACTED", "CLOSED"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("ADMIN");
  if (auth.kind === "deny") return jsonError(auth.status, auth.code);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json");
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "invalid_status");

  const { id } = await params;
  const exists = await db.inquiry.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return jsonError(404, "not_found");

  await db.inquiry.update({ where: { id }, data: { status: parsed.data.status } });
  return Response.json({ ok: true });
}
