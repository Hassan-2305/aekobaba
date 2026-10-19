import { z } from "zod";

import { jsonError, requireApiRole } from "@/lib/auth/api";
import { getAllProducts } from "@/lib/catalog/queries";
import { db } from "@/lib/db";

// Persistent Quote Basket for signed-in buyers. Guests keep their basket in
// the browser; once signed in, the client merges it here and the database
// becomes the source of truth (same basket on every device).
//
// GET → { items: [{ product: ProductVM, quantity, addedAt }] }
// PUT { items: [{ productId, quantity }] } → replaces the basket

const putSchema = z.object({
  items: z
    .array(z.object({ productId: z.string().min(1), quantity: z.number().int().positive().max(10_000_000) }))
    .max(200),
});

async function brandUserId(): Promise<{ id: string } | Response> {
  const auth = await requireApiRole("BRAND");
  if (auth.kind === "deny") return jsonError(auth.status, auth.code);
  const user = await db.user.findUnique({ where: { supabaseUserId: auth.supabaseUserId }, select: { id: true } });
  if (!user) return jsonError(403, "missing_role");
  return user;
}

export async function GET() {
  const user = await brandUserId();
  if (user instanceof Response) return user;
  const basket = await db.basket.findUnique({
    where: { userId: user.id },
    include: { items: { orderBy: { addedAt: "asc" } } },
  });
  if (!basket || basket.items.length === 0) return Response.json({ items: [] });

  const catalog = new Map((await getAllProducts()).map((p) => [p.id, p]));
  const items = basket.items
    .filter((item) => catalog.has(item.productId))
    .map((item) => ({ product: catalog.get(item.productId)!, quantity: item.quantity, addedAt: item.addedAt.toISOString() }));
  return Response.json({ items });
}

export async function PUT(request: Request) {
  const user = await brandUserId();
  if (user instanceof Response) return user;
  const parsed = putSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "invalid_payload");

  const byProduct = new Map(parsed.data.items.map((i) => [i.productId, i.quantity]));
  const ids = [...byProduct.keys()];
  const existing = ids.length
    ? new Set((await db.product.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((p) => p.id))
    : new Set<string>();

  await db.$transaction(async (tx) => {
    const basket = await tx.basket.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
    await tx.basketItem.deleteMany({ where: { basketId: basket.id, productId: { notIn: [...existing] } } });
    for (const productId of existing) {
      const quantity = byProduct.get(productId)!;
      await tx.basketItem.upsert({
        where: { basketId_productId: { basketId: basket.id, productId } },
        update: { quantity },
        create: { basketId: basket.id, productId, quantity },
      });
    }
  });
  return Response.json({ ok: true, count: existing.size });
}
