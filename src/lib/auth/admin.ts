import { redirect } from "next/navigation";

import { db } from "@/lib/db";

import { jsonError, requireApiRole } from "./api";
import { ACCESS_DENIED_PATH, SIGN_IN_PATH } from "./guard";
import { getServerSessionUser } from "./session";

// Admin identity for the team dashboard. The role is the explicit ADMIN value
// in the database (granted with `npm run admin:grant -- you@example.com`) —
// never inferred from an email domain. Middleware already blocks /admin pages
// for other roles; these helpers also return the User row id for audit trails.

export async function requireAdminPage(nextPath: string): Promise<{ id: string; email: string }> {
  const session = await getServerSessionUser();
  if (!session) redirect(`${SIGN_IN_PATH}?next=${encodeURIComponent(nextPath)}`);
  const user = await db.user.findUnique({
    where: { supabaseUserId: session.supabaseUserId },
    select: { id: true, role: true, email: true },
  });
  if (!user || user.role !== "ADMIN") redirect(ACCESS_DENIED_PATH);
  return { id: user.id, email: user.email };
}

/** API variant: the admin's User id, or a 401/403 Response. */
export async function requireAdminApi(): Promise<{ id: string } | Response> {
  const auth = await requireApiRole("ADMIN");
  if (auth.kind === "deny") return jsonError(auth.status, auth.code);
  const user = await db.user.findUnique({ where: { supabaseUserId: auth.supabaseUserId }, select: { id: true } });
  if (!user) return jsonError(403, "missing_role");
  return user;
}
