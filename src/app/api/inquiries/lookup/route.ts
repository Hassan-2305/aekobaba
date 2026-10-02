import { z } from "zod";

import { db } from "@/lib/db";
import { tokenMatches } from "@/lib/inquiries/access";

// POST /api/inquiries/lookup — live status for the requests this browser
// sent. Body: { items: [{ id, token }] } (max 50). Each item is answered only
// when its token matches the stored hash; anything else is silently omitted,
// so the endpoint reveals nothing about inquiries you did not send.

const bodySchema = z.object({
  items: z
    .array(z.object({ id: z.string().min(1).max(64), token: z.string().min(16).max(128) }))
    .max(50),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_items" }, { status: 400 });

  const tokens = new Map(parsed.data.items.map((item) => [item.id, item.token]));
  if (tokens.size === 0) return Response.json({ items: [] });

  const rows = await db.inquiry.findMany({
    where: { id: { in: [...tokens.keys()] } },
    select: { id: true, status: true, updatedAt: true, accessTokenHash: true },
  });

  const items = rows
    .filter((row) => tokenMatches(tokens.get(row.id) ?? "", row.accessTokenHash))
    .map((row) => ({ id: row.id, status: row.status, updatedAt: row.updatedAt.toISOString() }));

  return Response.json({ items }, { headers: { "Cache-Control": "no-store" } });
}
