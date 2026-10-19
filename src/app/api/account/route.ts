import { z } from "zod";

import { jsonError, requireApiRole } from "@/lib/auth/api";
import { db } from "@/lib/db";

// PATCH /api/account — a buyer updates their own profile (name, phone,
// company, website). Identity comes from the session; the email is managed
// by sign-in and can't be changed here.

const schema = z.object({
  name: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  company: z.string().trim().max(160).optional(),
  website: z.string().trim().max(300).optional(),
});

export async function PATCH(request: Request) {
  const auth = await requireApiRole("BRAND");
  if (auth.kind === "deny") return jsonError(auth.status, auth.code);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_payload");

  const user = await db.user.findUnique({ where: { supabaseUserId: auth.supabaseUserId }, select: { id: true } });
  if (!user) return jsonError(403, "missing_role");
  const { name, phone, company, website } = parsed.data;

  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { name: name || null, phone: phone || null } });
    if (company !== undefined || website !== undefined) {
      const existing = await tx.brandProfile.findUnique({ where: { userId: user.id } });
      if (existing) {
        await tx.brandProfile.update({
          where: { userId: user.id },
          data: { companyName: company || existing.companyName, website: website || null },
        });
      } else if (company) {
        await tx.brandProfile.create({ data: { userId: user.id, companyName: company, website: website || null } });
      }
    }
  });
  return Response.json({ ok: true });
}
