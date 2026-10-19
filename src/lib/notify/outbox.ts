import type { Prisma, PrismaClient } from "@prisma/client";

// Automated team notifications, outbox-first. The event (an RFQ, an
// application) and its email row are written in ONE transaction; delivery
// happens after commit and is retried until it succeeds, so a provider outage
// never loses a notification. Delivery uses Resend's HTTP API when
// RESEND_API_KEY is set; without it rows stay PENDING and the dashboard says so.

export const DEFAULT_TEAM_INBOX = "teamaekovera@gmail.com";
export const MAX_ATTEMPTS = 8;

export function teamInbox(): string {
  return process.env.TEAM_INBOX_EMAIL?.trim() || DEFAULT_TEAM_INBOX;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");
}

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());
}

export interface OutboxMessage {
  kind: string;
  toEmail: string;
  subject: string;
  textBody: string;
  htmlBody?: string | null;
}

type Tx = Pick<Prisma.TransactionClient, "notificationOutbox">;

/** Queue an email inside the caller's transaction. Returns the row id. */
export async function enqueueEmail(tx: Tx, message: OutboxMessage): Promise<string> {
  const row = await tx.notificationOutbox.create({
    data: {
      kind: message.kind,
      toEmail: message.toEmail,
      subject: message.subject,
      textBody: message.textBody,
      htmlBody: message.htmlBody ?? null,
    },
    select: { id: true },
  });
  return row.id;
}

export type SendResult = { ok: true } | { ok: false; error: string };
export type Sender = (message: OutboxMessage) => Promise<SendResult>;

/** Resend HTTP API sender (no SDK dependency). */
export const resendSender: Sender = async (message) => {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!key || !from) return { ok: false, error: "email_not_configured" };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [message.toEmail],
        subject: message.subject,
        text: message.textBody,
        ...(message.htmlBody ? { html: message.htmlBody } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) return { ok: true };
    const detail = await response.text().catch(() => "");
    return { ok: false, error: `resend_${response.status}: ${detail.slice(0, 300)}` };
  } catch (error) {
    return { ok: false, error: `network: ${String(error).slice(0, 300)}` };
  }
};

type OutboxDb = Pick<PrismaClient, "notificationOutbox">;

/**
 * Try to deliver outbox rows: the given ids, or every PENDING/FAILED row under
 * the attempt cap. Never throws — each row records its own outcome.
 */
export async function deliverOutbox(
  db: OutboxDb,
  options: { ids?: string[]; sender?: Sender; limit?: number } = {},
): Promise<{ sent: number; failed: number; skipped: number }> {
  const sender = options.sender ?? resendSender;
  if (!options.sender && !emailConfigured()) return { sent: 0, failed: 0, skipped: options.ids?.length ?? 0 };

  const rows = await db.notificationOutbox.findMany({
    where: {
      ...(options.ids ? { id: { in: options.ids } } : {}),
      status: { in: ["PENDING", "FAILED"] },
      attempts: { lt: MAX_ATTEMPTS },
    },
    orderBy: { createdAt: "asc" },
    take: options.limit ?? 25,
  });

  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    const result = await sender(row);
    if (result.ok) {
      sent++;
      await db.notificationOutbox.update({
        where: { id: row.id },
        data: { status: "SENT", sentAt: new Date(), attempts: { increment: 1 }, lastError: null },
      });
    } else {
      failed++;
      await db.notificationOutbox.update({
        where: { id: row.id },
        data: { status: "FAILED", attempts: { increment: 1 }, lastError: result.error },
      });
    }
  }
  return { sent, failed, skipped: 0 };
}
