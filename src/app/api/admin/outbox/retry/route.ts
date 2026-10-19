import { requireAdminApi } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { deliverOutbox } from "@/lib/notify/outbox";

// POST /api/admin/outbox/retry — deliver every undelivered team email now.

export async function POST() {
  const admin = await requireAdminApi();
  if (admin instanceof Response) return admin;
  const result = await deliverOutbox(db, { limit: 50 });
  return Response.json(result);
}
