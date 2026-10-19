import type { PrismaClient } from "@prisma/client";

import { enqueueEmail } from "@/lib/notify/outbox";
import { newRequestEmail } from "@/lib/notify/templates";
import { assessMoq } from "@/lib/quotes/moq";

import { isUniqueViolation, makeReference } from "./reference";

// Buyer RFQ submission (Aekobaba as mediator). One transaction writes the
// request, every product line, one tracking row per supplier, the first
// activity entry and the team notification (outbox) — and clears the buyer's
// saved basket. Suppliers are NOT emailed; the team contacts them by hand.

export interface RfqSubmitInput {
  supabaseUserId: string;
  items: { productId: string; quantity: number; specNotes?: string | null }[];
  contact: { name: string; email: string; phone?: string | null; company?: string | null };
  deadline: Date | null;
  notes: string | null;
  artworkNotes: string | null;
  artworkFileUrl: string | null;
}

export type RfqSubmitResult =
  | {
      ok: true;
      id: string;
      reference: string;
      itemCount: number;
      supplierCount: number;
      outboxId: string;
      warnings: { productId: string; message: string }[];
    }
  | { ok: false; reason: "empty_items" | "no_brand_user" | "unknown_products"; unknownProductIds?: string[] };

export async function submitRfq(db: PrismaClient, input: RfqSubmitInput): Promise<RfqSubmitResult> {
  if (input.items.length === 0) return { ok: false, reason: "empty_items" };

  // One line per product; the last quantity wins.
  const byProduct = new Map<string, RfqSubmitInput["items"][number]>();
  for (const item of input.items) byProduct.set(item.productId, item);
  const items = [...byProduct.values()];

  const user = await db.user.findUnique({
    where: { supabaseUserId: input.supabaseUserId },
    select: { id: true, role: true },
  });
  if (!user || user.role !== "BRAND") return { ok: false, reason: "no_brand_user" };

  const products = await db.product.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
    select: { id: true, title: true, moq: true, moqUnit: true, supplierId: true, supplier: { select: { name: true } } },
  });
  const known = new Map(products.map((p) => [p.id, p]));
  const unknown = items.filter((i) => !known.has(i.productId)).map((i) => i.productId);
  if (unknown.length) return { ok: false, reason: "unknown_products", unknownProductIds: unknown };

  const warnings = items.flatMap((item) => {
    const p = known.get(item.productId)!;
    const message = assessMoq(item.quantity, p.moq, p.moqUnit).message;
    return message ? [{ productId: item.productId, message }] : [];
  });
  const supplierIds = [...new Set(products.map((p) => p.supplierId))];

  for (let attempt = 0; attempt < 5; attempt++) {
    const reference = makeReference("AEK");
    try {
      const created = await db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: { name: input.contact.name, phone: input.contact.phone ?? undefined },
        });
        if (input.contact.company) {
          await tx.brandProfile.upsert({
            where: { userId: user.id },
            update: { companyName: input.contact.company },
            create: { userId: user.id, companyName: input.contact.company },
          });
        }
        const request = await tx.quoteRequest.create({
          data: {
            brandUserId: user.id,
            status: "SENT",
            stage: "NEW",
            reference,
            contactName: input.contact.name,
            contactEmail: input.contact.email,
            contactPhone: input.contact.phone ?? null,
            companyName: input.contact.company ?? null,
            deadline: input.deadline,
            notes: input.notes,
            artworkNotes: input.artworkNotes,
            artworkFileUrl: input.artworkFileUrl,
          },
          select: { id: true },
        });
        await tx.quoteRequestItem.createMany({
          data: items.map((item) => ({
            quoteRequestId: request.id,
            productId: item.productId,
            quantity: item.quantity,
            status: "SENT" as const,
            specNotes: item.specNotes?.trim() || null,
          })),
        });
        await tx.quoteRequestSupplier.createMany({
          data: supplierIds.map((supplierId) => ({ quoteRequestId: request.id, supplierId })),
        });
        await tx.quoteActivity.create({
          data: {
            quoteRequestId: request.id,
            actorId: user.id,
            kind: "request.created",
            message: `Request ${reference} submitted: ${items.length} product${items.length === 1 ? "" : "s"} from ${supplierIds.length} supplier${supplierIds.length === 1 ? "" : "s"}.`,
          },
        });
        const outboxId = await enqueueEmail(
          tx,
          newRequestEmail({
            id: request.id,
            reference,
            contactName: input.contact.name,
            contactEmail: input.contact.email,
            contactPhone: input.contact.phone ?? null,
            companyName: input.contact.company ?? null,
            deadline: input.deadline ? input.deadline.toISOString().slice(0, 10) : null,
            notes: input.notes,
            artworkNotes: input.artworkNotes,
            hasArtworkFile: Boolean(input.artworkFileUrl),
            lines: items.map((item) => {
              const p = known.get(item.productId)!;
              return {
                supplierName: p.supplier.name,
                productTitle: p.title,
                quantity: item.quantity,
                specNotes: item.specNotes?.trim() || null,
              };
            }),
          }),
        );
        // The basket has become a request.
        await tx.basketItem.deleteMany({ where: { basket: { userId: user.id } } });
        return { id: request.id, outboxId };
      });
      return {
        ok: true,
        id: created.id,
        reference,
        itemCount: items.length,
        supplierCount: supplierIds.length,
        outboxId: created.outboxId,
        warnings,
      };
    } catch (error) {
      if (isUniqueViolation(error)) continue; // reference collision — draw a new one
      throw error;
    }
  }
  throw new Error("could not allocate a unique request reference");
}
