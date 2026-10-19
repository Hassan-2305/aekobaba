import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { QuoteWorkspace, type QuoteWorkspaceData } from "@/components/admin/quote-workspace";
import { WorkspaceShell } from "@/components/workspace/shell";
import { requireAdminPage } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { composeRfqEmail } from "@/lib/rfq/mailto";

export const metadata: Metadata = { title: "Quote request · Admin" };
export const dynamic = "force-dynamic";

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

export default async function AdminQuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireAdminPage(`/admin/quotes/${id}`);

  const [request, admins] = await Promise.all([
    db.quoteRequest.findUnique({
      where: { id },
      include: {
        brand: { select: { email: true, name: true, phone: true, brandProfile: { select: { companyName: true, website: true } } } },
        items: { include: { product: { select: { id: true, title: true, sourceUrl: true, supplierId: true } } }, orderBy: { createdAt: "asc" } },
        suppliers: {
          include: {
            supplier: { select: { id: true, name: true, website: true, businessEmail: true, businessEmailVerifiedAt: true } },
            outreach: { orderBy: { occurredAt: "desc" }, include: { recordedBy: { select: { name: true, email: true } } } },
            quotes: { orderBy: { receivedAt: "desc" }, include: { lines: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        activities: { orderBy: { createdAt: "desc" }, take: 100, include: { actor: { select: { name: true, email: true, role: true } } } },
      },
    }),
    db.user.findMany({ where: { role: "ADMIN" }, select: { id: true, name: true, email: true }, orderBy: { email: "asc" } }),
  ]);
  if (!request) notFound();

  const me = admins.find((a) => a.id === admin.id);
  const reference = request.reference ?? request.id.slice(0, 8);

  const data: QuoteWorkspaceData = {
    request: {
      id: request.id,
      reference,
      stage: request.stage,
      createdAt: request.createdAt.toISOString(),
      deadline: day(request.deadline),
      contactName: request.contactName ?? request.brand.name ?? null,
      contactEmail: request.contactEmail ?? request.brand.email,
      contactPhone: request.contactPhone ?? request.brand.phone ?? null,
      companyName: request.companyName ?? request.brand.brandProfile?.companyName ?? null,
      companyWebsite: request.brand.brandProfile?.website ?? null,
      accountEmail: request.brand.email,
      notes: request.notes,
      artworkNotes: request.artworkNotes,
      artworkFileUrl: request.artworkFileUrl,
      nextAction: request.nextAction,
      nextActionDue: day(request.nextActionDue),
      internalNotes: request.internalNotes,
      assignedToId: request.assignedToId,
    },
    admins: admins.map((a) => ({ id: a.id, label: a.name ?? a.email })),
    lines: request.suppliers.map((line) => {
      const items = request.items.filter((i) => i.product.supplierId === line.supplierId);
      const mail = line.supplier.businessEmail
        ? composeRfqEmail({
            reference,
            supplierName: line.supplier.name,
            supplierEmail: line.supplier.businessEmail,
            lines: items.map((i) => ({ productTitle: i.product.title, quantity: i.quantity, sourceUrl: i.product.sourceUrl, specNotes: i.specNotes })),
            deadline: day(request.deadline),
            requirements: request.notes,
            artworkAvailable: Boolean(request.artworkFileUrl || request.artworkNotes),
            signOff: me?.name ?? undefined,
          })
        : null;
      return {
        id: line.id,
        supplier: {
          id: line.supplier.id,
          name: line.supplier.name,
          website: line.supplier.website,
          businessEmail: line.supplier.businessEmail,
          emailVerifiedAt: day(line.supplier.businessEmailVerifiedAt),
        },
        outreachStatus: line.outreachStatus,
        commercialStatus: line.commercialStatus,
        lastContactAt: iso(line.lastContactAt),
        lastReplyAt: iso(line.lastReplyAt),
        lastReplySummary: line.lastReplySummary,
        nextAction: line.nextAction,
        nextActionDue: day(line.nextActionDue),
        assignedToId: line.assignedToId,
        internalNotes: line.internalNotes,
        mail: mail ? { href: mail.href, subject: mail.subject, body: mail.body } : null,
        outreach: line.outreach.map((o) => ({
          id: o.id,
          direction: o.direction,
          channel: o.channel,
          subject: o.subject,
          summary: o.summary,
          occurredAt: o.occurredAt.toISOString(),
          by: o.recordedBy ? (o.recordedBy.name ?? o.recordedBy.email) : null,
        })),
        quotes: line.quotes.map((q) => ({
          id: q.id,
          receivedAt: q.receivedAt.toISOString(),
          currency: q.currency,
          leadTimeDays: q.leadTimeDays,
          validUntil: day(q.validUntil),
          terms: q.terms,
          notes: q.notes,
          lines: q.lines.map((l) => ({ itemId: l.quoteRequestItemId, unitPrice: Number(l.unitPrice), moq: l.moq, notes: l.notes })),
        })),
        items: items.map((i) => ({
          id: i.id,
          productId: i.product.id,
          title: i.product.title,
          sourceUrl: i.product.sourceUrl,
          quantity: i.quantity,
          specNotes: i.specNotes,
          sampleStatus: i.sampleStatus,
          sampleCarrier: i.sampleCarrier,
          sampleTracking: i.sampleTracking,
          sampleDispatchedAt: day(i.sampleDispatchedAt),
          sampleDeliveredAt: day(i.sampleDeliveredAt),
          customerFeedback: i.customerFeedback,
          customerFeedbackNote: i.customerFeedbackNote,
          supplierFeedbackNote: i.supplierFeedbackNote,
        })),
      };
    }),
    activities: request.activities.map((a) => ({
      id: a.id,
      at: a.createdAt.toISOString(),
      message: a.message,
      actor: a.actor ? (a.actor.role === "ADMIN" ? (a.actor.name ?? a.actor.email) : "customer") : "system",
    })),
  };

  return (
    <WorkspaceShell area="admin" active="quotes" title={`Quote request ${reference}`} subtitle="Everything about this request, per supplier and per product.">
      <Link href="/admin/quotes" className="text-sm text-ink-muted hover:text-ink">
        ← All quote requests
      </Link>
      <QuoteWorkspace data={data} />
    </WorkspaceShell>
  );
}
