import type { PrismaClient } from "@prisma/client";
import { z } from "zod";

import {
  COMMERCIAL_STATUSES,
  CUSTOMER_FEEDBACK,
  OUTREACH_STATUSES,
  REQUEST_STAGES,
  SAMPLE_STATUSES,
  label,
} from "./statuses";

// Team actions on one RFQ. Every action is validated here, applied in one
// transaction, and leaves a QuoteActivity row — the audit trail is not
// optional. Admin role is enforced by the route before this runs.

const optText = (max: number) => z.string().trim().max(max).nullable().optional();
const optDate = z.iso.date().nullable().optional();

export const adminQuoteActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("updateRequest"),
    stage: z.enum(REQUEST_STAGES).optional(),
    assignedToId: z.string().nullable().optional(),
    nextAction: optText(300),
    nextActionDue: optDate,
    internalNotes: optText(8000),
  }),
  z.object({
    action: z.literal("updateSupplier"),
    lineId: z.string().min(1),
    outreachStatus: z.enum(OUTREACH_STATUSES).optional(),
    commercialStatus: z.enum(COMMERCIAL_STATUSES).optional(),
    assignedToId: z.string().nullable().optional(),
    nextAction: optText(300),
    nextActionDue: optDate,
    internalNotes: optText(8000),
  }),
  z.object({ action: z.literal("emailPrepared"), lineId: z.string().min(1) }),
  z.object({
    action: z.literal("logOutreach"),
    lineId: z.string().min(1),
    direction: z.enum(["OUTBOUND", "INBOUND"]),
    channel: z.enum(["EMAIL", "PHONE", "OTHER"]).default("EMAIL"),
    subject: optText(300),
    summary: z.string().trim().min(1).max(4000),
    occurredAt: z.iso.datetime({ local: true }).optional(),
  }),
  z.object({
    action: z.literal("recordQuote"),
    lineId: z.string().min(1),
    currency: z.string().trim().length(3).default("USD"),
    leadTimeDays: z.number().int().positive().max(1000).nullable().optional(),
    validUntil: optDate,
    terms: optText(500),
    notes: optText(4000),
    lines: z
      .array(
        z.object({
          itemId: z.string().min(1),
          unitPrice: z.number().positive().max(1_000_000),
          moq: z.number().int().positive().nullable().optional(),
          notes: optText(500),
        }),
      )
      .min(1),
  }),
  z.object({
    action: z.literal("updateItem"),
    itemId: z.string().min(1),
    sampleStatus: z.enum(SAMPLE_STATUSES).optional(),
    sampleCarrier: optText(100),
    sampleTracking: optText(200),
    customerFeedback: z.enum(CUSTOMER_FEEDBACK).nullable().optional(),
    customerFeedbackNote: optText(2000),
    supplierFeedbackNote: optText(2000),
  }),
  z.object({
    action: z.literal("setSupplierEmail"),
    supplierId: z.string().min(1),
    email: z.email().max(200).nullable(),
  }),
]);

export type AdminQuoteAction = z.infer<typeof adminQuoteActionSchema>;

export type ActionResult = { ok: true } | { ok: false; status: 404 | 400; error: string };

const toDate = (v: string | null | undefined) => (v === undefined ? undefined : v === null ? null : new Date(`${v}T00:00:00Z`));

/** Fields present in a patch, ready for Prisma (undefined = leave as is). */
function pick<T extends Record<string, unknown>>(obj: T, keys: (keyof T)[]) {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (obj[k] !== undefined) out[k as string] = obj[k];
  return out;
}

export async function applyAdminQuoteAction(
  db: PrismaClient,
  input: { requestId: string; actorId: string; action: AdminQuoteAction; now?: Date },
): Promise<ActionResult> {
  const { requestId, actorId, action } = input;
  const now = input.now ?? new Date();
  const request = await db.quoteRequest.findUnique({ where: { id: requestId }, select: { id: true, stage: true } });
  if (!request) return { ok: false, status: 404, error: "not_found" };

  const lineFor = async (lineId: string) =>
    db.quoteRequestSupplier.findFirst({
      where: { id: lineId, quoteRequestId: requestId },
      include: { supplier: { select: { name: true } } },
    });

  switch (action.action) {
    case "updateRequest": {
      const data = { ...pick(action, ["stage", "assignedToId", "nextAction", "internalNotes"]), nextActionDue: toDate(action.nextActionDue) };
      const changes: string[] = [];
      if (action.stage && action.stage !== request.stage) changes.push(`stage ${label(request.stage)} → ${label(action.stage)}`);
      if (action.assignedToId !== undefined) changes.push(action.assignedToId ? "assignee changed" : "unassigned");
      if (action.nextAction !== undefined) changes.push(`next action: ${action.nextAction || "—"}`);
      if (action.nextActionDue !== undefined) changes.push(`due ${action.nextActionDue ?? "—"}`);
      if (action.internalNotes !== undefined) changes.push("internal notes updated");
      await db.$transaction([
        db.quoteRequest.update({ where: { id: requestId }, data }),
        db.quoteActivity.create({
          data: { quoteRequestId: requestId, actorId, kind: "request.updated", message: `Request: ${changes.join("; ") || "updated"}` },
        }),
      ]);
      return { ok: true };
    }

    case "updateSupplier": {
      const line = await lineFor(action.lineId);
      if (!line) return { ok: false, status: 404, error: "line_not_found" };
      const data = {
        ...pick(action, ["outreachStatus", "commercialStatus", "assignedToId", "nextAction", "internalNotes"]),
        nextActionDue: toDate(action.nextActionDue),
      };
      const changes: string[] = [];
      if (action.outreachStatus && action.outreachStatus !== line.outreachStatus)
        changes.push(`outreach ${label(line.outreachStatus)} → ${label(action.outreachStatus)}`);
      if (action.commercialStatus && action.commercialStatus !== line.commercialStatus)
        changes.push(`quote ${label(line.commercialStatus)} → ${label(action.commercialStatus)}`);
      if (action.nextAction !== undefined) changes.push(`next action: ${action.nextAction || "—"}`);
      if (action.nextActionDue !== undefined) changes.push(`due ${action.nextActionDue ?? "—"}`);
      if (action.assignedToId !== undefined) changes.push(action.assignedToId ? "assignee changed" : "unassigned");
      if (action.internalNotes !== undefined) changes.push("notes updated");
      const stageBump = request.stage === "NEW" && (action.outreachStatus ?? "NOT_CONTACTED") !== "NOT_CONTACTED";
      await db.$transaction([
        db.quoteRequestSupplier.update({ where: { id: line.id }, data }),
        ...(stageBump ? [db.quoteRequest.update({ where: { id: requestId }, data: { stage: "IN_PROGRESS" } })] : []),
        ...(action.commercialStatus === "SHARED_WITH_CUSTOMER"
          ? [db.quoteRequest.update({ where: { id: requestId }, data: { stage: "QUOTES_SHARED", status: "RESPONDED" } })]
          : []),
        db.quoteActivity.create({
          data: { quoteRequestId: requestId, actorId, kind: "supplier.updated", message: `${line.supplier.name}: ${changes.join("; ") || "updated"}` },
        }),
      ]);
      return { ok: true };
    }

    case "emailPrepared": {
      const line = await lineFor(action.lineId);
      if (!line) return { ok: false, status: 404, error: "line_not_found" };
      await db.$transaction([
        ...(line.outreachStatus === "NOT_CONTACTED"
          ? [db.quoteRequestSupplier.update({ where: { id: line.id }, data: { outreachStatus: "EMAIL_PREPARED" } })]
          : []),
        ...(request.stage === "NEW" ? [db.quoteRequest.update({ where: { id: requestId }, data: { stage: "IN_PROGRESS" } })] : []),
        db.quoteActivity.create({
          data: { quoteRequestId: requestId, actorId, kind: "outreach.prepared", message: `${line.supplier.name}: RFQ email opened in the mail app` },
        }),
      ]);
      return { ok: true };
    }

    case "logOutreach": {
      const line = await lineFor(action.lineId);
      if (!line) return { ok: false, status: 404, error: "line_not_found" };
      const at = action.occurredAt ? new Date(action.occurredAt) : now;
      const outbound = action.direction === "OUTBOUND";
      await db.$transaction([
        db.supplierOutreach.create({
          data: {
            quoteRequestSupplierId: line.id,
            direction: action.direction,
            channel: action.channel,
            subject: action.subject ?? null,
            summary: action.summary,
            occurredAt: at,
            recordedById: actorId,
          },
        }),
        db.quoteRequestSupplier.update({
          where: { id: line.id },
          data: outbound
            ? { lastContactAt: at, outreachStatus: line.outreachStatus === "REPLIED" ? "REPLIED" : "CONTACTED" }
            : { lastReplyAt: at, lastReplySummary: action.summary.slice(0, 500), outreachStatus: "REPLIED" },
        }),
        ...(request.stage === "NEW" ? [db.quoteRequest.update({ where: { id: requestId }, data: { stage: "IN_PROGRESS" } })] : []),
        db.quoteActivity.create({
          data: {
            quoteRequestId: requestId,
            actorId,
            kind: outbound ? "outreach.sent" : "outreach.reply",
            message: `${line.supplier.name}: ${outbound ? "contacted" : "replied"} by ${action.channel.toLowerCase()} — ${action.summary.slice(0, 160)}`,
          },
        }),
      ]);
      return { ok: true };
    }

    case "recordQuote": {
      const line = await lineFor(action.lineId);
      if (!line) return { ok: false, status: 404, error: "line_not_found" };
      const items = await db.quoteRequestItem.findMany({
        where: { quoteRequestId: requestId, product: { supplierId: line.supplierId } },
        select: { id: true },
      });
      const allowed = new Set(items.map((i) => i.id));
      if (action.lines.some((l) => !allowed.has(l.itemId))) return { ok: false, status: 400, error: "item_not_in_supplier_line" };
      await db.$transaction(async (tx) => {
        await tx.supplierQuote.create({
          data: {
            quoteRequestSupplierId: line.id,
            currency: action.currency.toUpperCase(),
            leadTimeDays: action.leadTimeDays ?? null,
            validUntil: toDate(action.validUntil) ?? null,
            terms: action.terms ?? null,
            notes: action.notes ?? null,
            recordedById: actorId,
            lines: {
              create: action.lines.map((l) => ({
                quoteRequestItemId: l.itemId,
                unitPrice: l.unitPrice,
                moq: l.moq ?? null,
                notes: l.notes ?? null,
              })),
            },
          },
        });
        await tx.quoteRequestSupplier.update({
          where: { id: line.id },
          data: {
            commercialStatus: ["AWAITING_QUOTE", "EXPIRED"].includes(line.commercialStatus) ? "QUOTE_RECEIVED" : line.commercialStatus,
            outreachStatus: "REPLIED",
            lastReplyAt: now,
          },
        });
        await tx.quoteRequestItem.updateMany({ where: { id: { in: action.lines.map((l) => l.itemId) } }, data: { status: "QUOTED" } });
        await tx.quoteActivity.create({
          data: {
            quoteRequestId: requestId,
            actorId,
            kind: "quote.recorded",
            message: `${line.supplier.name}: quote recorded (${action.lines.length} line${action.lines.length === 1 ? "" : "s"}, ${action.currency.toUpperCase()}${action.leadTimeDays ? `, ${action.leadTimeDays}-day lead time` : ""})`,
          },
        });
      });
      return { ok: true };
    }

    case "updateItem": {
      const item = await db.quoteRequestItem.findFirst({
        where: { id: action.itemId, quoteRequestId: requestId },
        include: { product: { select: { title: true } } },
      });
      if (!item) return { ok: false, status: 404, error: "item_not_found" };
      const data: Record<string, unknown> = pick(action, [
        "sampleStatus",
        "sampleCarrier",
        "sampleTracking",
        "customerFeedback",
        "customerFeedbackNote",
        "supplierFeedbackNote",
      ]);
      if (action.sampleStatus === "DISPATCHED" && !item.sampleDispatchedAt) data.sampleDispatchedAt = now;
      if (action.sampleStatus === "DELIVERED") {
        if (!item.sampleDeliveredAt) data.sampleDeliveredAt = now;
        if (!item.customerFeedback && action.customerFeedback === undefined) data.customerFeedback = "AWAITING_FEEDBACK";
      }
      const changes: string[] = [];
      if (action.sampleStatus && action.sampleStatus !== item.sampleStatus)
        changes.push(`sample ${label(item.sampleStatus)} → ${label(action.sampleStatus)}`);
      if (action.sampleTracking) changes.push(`tracking ${action.sampleTracking}`);
      if (action.customerFeedback !== undefined) changes.push(`customer feedback: ${label(action.customerFeedback)}`);
      if (action.customerFeedbackNote) changes.push("customer note added");
      if (action.supplierFeedbackNote) changes.push("supplier note added");
      await db.$transaction([
        db.quoteRequestItem.update({ where: { id: item.id }, data }),
        db.quoteActivity.create({
          data: { quoteRequestId: requestId, actorId, kind: "item.updated", message: `${item.product.title}: ${changes.join("; ") || "updated"}` },
        }),
      ]);
      return { ok: true };
    }

    case "setSupplierEmail": {
      const inRequest = await db.quoteRequestSupplier.findFirst({
        where: { quoteRequestId: requestId, supplierId: action.supplierId },
        include: { supplier: { select: { name: true } } },
      });
      if (!inRequest) return { ok: false, status: 404, error: "supplier_not_in_request" };
      await db.$transaction([
        db.supplier.update({
          where: { id: action.supplierId },
          data: { businessEmail: action.email, businessEmailVerifiedAt: action.email ? now : null },
        }),
        db.quoteActivity.create({
          data: {
            quoteRequestId: requestId,
            actorId,
            kind: "supplier.email",
            message: `${inRequest.supplier.name}: business email ${action.email ? `set to ${action.email}` : "cleared"}`,
          },
        }),
      ]);
      return { ok: true };
    }
  }
}
