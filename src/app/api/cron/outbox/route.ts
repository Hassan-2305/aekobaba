import { db } from "@/lib/db";
import { deliverOutbox } from "@/lib/notify/outbox";

// GET /api/cron/outbox — scheduled retry of undelivered team emails (Vercel
// Cron, see vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`;
// anything else is refused.

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await deliverOutbox(db, { limit: 50 });
  return Response.json(result);
}
