import type { Metadata } from "next";
import Link from "next/link";

import { RfqChip } from "@/components/admin/rfq-chip";
import { SendEmailLink } from "@/components/admin/send-email-link";
import { FilterTabs, WorkspaceShell } from "@/components/workspace/shell";
import { requireAdminPage } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { emailConfigured } from "@/lib/notify/outbox";
import { composeRfqEmail } from "@/lib/rfq/mailto";

export const metadata: Metadata = { title: "Quote requests · Admin" };
export const dynamic = "force-dynamic";

// The team's quote management workspace. Four views:
//   Inbox     — customer requests (newest first), with overall stage
//   By supplier — each supplier's open requests, ready to email
//   Outreach  — one row per supplier per request: contact + quote status
//   Samples   — every product line with a sample in motion
//   Activity  — the audit trail across all requests

const VIEWS = ["inbox", "suppliers", "outreach", "samples", "activity"] as const;
type View = (typeof VIEWS)[number];

const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "—");
const when = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ");

export default async function AdminQuotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage("/admin/quotes");
  const params = await searchParams;
  const view: View = (VIEWS as readonly string[]).includes(String(params.view)) ? (params.view as View) : "inbox";
  const showClosed = params.closed === "1";

  const [newCount, outreachOpen, samplesOpen, pendingMail] = await Promise.all([
    db.quoteRequest.count({ where: { stage: "NEW" } }),
    db.quoteRequestSupplier.count({
      where: { outreachStatus: { in: ["NOT_CONTACTED", "EMAIL_PREPARED", "FOLLOW_UP_NEEDED", "REPLIED"] }, quoteRequest: { stage: { notIn: ["COMPLETED", "CANCELLED"] } } },
    }),
    db.quoteRequestItem.count({ where: { sampleStatus: { in: ["REQUESTED", "APPROVED", "DISPATCHED"] } } }),
    db.notificationOutbox.count({ where: { status: { in: ["PENDING", "FAILED"] } } }),
  ]);

  return (
    <WorkspaceShell
      area="admin"
      active="quotes"
      title="Quote requests"
      subtitle="Customer RFQs. Contact suppliers from here, record replies and quotes, and track samples."
    >
      {pendingMail > 0 ? (
        <p className="mb-5 rounded-md border border-orange/40 bg-orange-tint px-4 py-3 text-sm text-orange-ink">
          {pendingMail} team email{pendingMail === 1 ? "" : "s"} not delivered yet
          {emailConfigured() ? "" : " — email sending is not configured (RESEND_API_KEY / EMAIL_FROM)"}.{" "}
          <Link href="/admin/notifications" className="font-medium underline">
            Open the outbox
          </Link>
        </p>
      ) : null}
      <FilterTabs
        tabs={[
          { href: "/admin/quotes", label: "Inbox", count: newCount, active: view === "inbox" },
          { href: "/admin/quotes?view=suppliers", label: "By supplier", active: view === "suppliers" },
          { href: "/admin/quotes?view=outreach", label: "Outreach", count: outreachOpen, active: view === "outreach" },
          { href: "/admin/quotes?view=samples", label: "Samples", count: samplesOpen, active: view === "samples" },
          { href: "/admin/quotes?view=activity", label: "Activity", active: view === "activity" },
        ]}
      />
      <div className="mt-6">
        {view === "inbox" ? <InboxView showClosed={showClosed} /> : null}
        {view === "suppliers" ? <BySupplierView /> : null}
        {view === "outreach" ? <OutreachView /> : null}
        {view === "samples" ? <SamplesView /> : null}
        {view === "activity" ? <ActivityView /> : null}
      </div>
    </WorkspaceShell>
  );
}

async function InboxView({ showClosed }: { showClosed: boolean }) {
  const rows = await db.quoteRequest.findMany({
    where: showClosed ? {} : { stage: { notIn: ["COMPLETED", "CANCELLED"] } },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      suppliers: { select: { outreachStatus: true, commercialStatus: true, supplier: { select: { name: true } } } },
      _count: { select: { items: true } },
      assignedTo: { select: { name: true, email: true } },
    },
  });
  if (rows.length === 0) return <Empty text="No open quote requests." />;
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-muted">
              <th className="py-2 pr-3 font-medium">Reference</th>
              <th className="py-2 pr-3 font-medium">Customer</th>
              <th className="py-2 pr-3 font-medium">Suppliers</th>
              <th className="py-2 pr-3 font-medium">Stage</th>
              <th className="py-2 pr-3 font-medium">Next action</th>
              <th className="py-2 pr-3 font-medium">Assigned</th>
              <th className="py-2 font-medium">Received</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line align-top hover:bg-well/60">
                <td className="py-3 pr-3">
                  <Link href={`/admin/quotes/${r.id}`} className="font-mono text-[13px] font-medium text-orange-ink hover:underline">
                    {r.reference ?? r.id.slice(0, 8)}
                  </Link>
                  <span className="block text-xs text-ink-muted">{r._count.items} items</span>
                </td>
                <td className="py-3 pr-3">
                  <span className="block font-medium text-ink">{r.companyName ?? r.contactName ?? "—"}</span>
                  <span className="block text-xs text-ink-muted">{r.contactEmail}</span>
                </td>
                <td className="py-3 pr-3">
                  <ul className="space-y-1">
                    {r.suppliers.map((s) => (
                      <li key={s.supplier.name} className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-ink">{s.supplier.name}</span>
                        <RfqChip value={s.outreachStatus} />
                        <RfqChip value={s.commercialStatus} />
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="py-3 pr-3">
                  <RfqChip value={r.stage} />
                </td>
                <td className="py-3 pr-3 text-xs">
                  {r.nextAction ?? "—"}
                  {r.nextActionDue ? <span className="block text-ink-muted">due {day(r.nextActionDue)}</span> : null}
                </td>
                <td className="py-3 pr-3 text-xs">{r.assignedTo ? (r.assignedTo.name ?? r.assignedTo.email) : "—"}</td>
                <td className="py-3 text-xs text-ink-muted">{day(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs">
        <Link href={showClosed ? "/admin/quotes" : "/admin/quotes?closed=1"} className="text-ink-muted underline">
          {showClosed ? "Hide completed and cancelled" : "Show completed and cancelled"}
        </Link>
      </p>
    </>
  );
}

async function BySupplierView() {
  const lines = await db.quoteRequestSupplier.findMany({
    where: { quoteRequest: { stage: { notIn: ["COMPLETED", "CANCELLED"] } } },
    orderBy: { createdAt: "desc" },
    take: 400,
    include: {
      supplier: { select: { id: true, name: true, businessEmail: true, website: true } },
      quoteRequest: {
        select: {
          id: true,
          reference: true,
          companyName: true,
          contactName: true,
          deadline: true,
          notes: true,
          artworkNotes: true,
          artworkFileUrl: true,
          createdAt: true,
          items: {
            select: { quantity: true, specNotes: true, product: { select: { title: true, sourceUrl: true, supplierId: true } } },
          },
        },
      },
    },
  });
  if (lines.length === 0) return <Empty text="No open requests for any supplier." />;

  const groups = new Map<string, typeof lines>();
  for (const line of lines) groups.set(line.supplier.id, [...(groups.get(line.supplier.id) ?? []), line]);
  const ordered = [...groups.values()].sort(
    (a, b) =>
      b.filter((l) => l.outreachStatus === "NOT_CONTACTED").length - a.filter((l) => l.outreachStatus === "NOT_CONTACTED").length ||
      b.length - a.length,
  );

  return (
    <div className="space-y-6">
      {ordered.map((group) => {
        const supplier = group[0].supplier;
        return (
          <section key={supplier.id} id={`sup-${supplier.id}`} className="scroll-mt-20 rounded-xl border border-line-strong bg-paper p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold">{supplier.name}</h2>
              <span className="text-xs text-ink-muted">
                {group.length} open request{group.length === 1 ? "" : "s"} ·{" "}
                {supplier.businessEmail ? `RFQ email ${supplier.businessEmail}` : "no business email yet — add it on any request"}
              </span>
            </div>
            <ul className="mt-3 divide-y divide-line">
              {group.map((line) => {
                const r = line.quoteRequest;
                const items = r.items.filter((i) => i.product.supplierId === supplier.id);
                const reference = r.reference ?? r.id.slice(0, 8);
                const mail = supplier.businessEmail
                  ? composeRfqEmail({
                      reference,
                      supplierName: supplier.name,
                      supplierEmail: supplier.businessEmail,
                      lines: items.map((i) => ({ productTitle: i.product.title, quantity: i.quantity, sourceUrl: i.product.sourceUrl, specNotes: i.specNotes })),
                      deadline: r.deadline ? r.deadline.toISOString().slice(0, 10) : null,
                      requirements: r.notes,
                      artworkAvailable: Boolean(r.artworkFileUrl || r.artworkNotes),
                    })
                  : null;
                return (
                  <li key={line.id} className="flex flex-wrap items-start gap-x-6 gap-y-2 py-3 text-sm">
                    <div className="w-[170px] flex-none">
                      <Link href={`/admin/quotes/${r.id}#line-${line.id}`} className="font-mono text-[13px] font-medium text-orange-ink hover:underline">
                        {reference}
                      </Link>
                      <span className="block text-xs text-ink-muted">{r.companyName ?? r.contactName ?? "—"} · {day(r.createdAt)}</span>
                    </div>
                    <ul className="min-w-[240px] flex-1 space-y-0.5">
                      {items.map((i) => (
                        <li key={i.product.title}>
                          {i.product.title} <span className="text-ink-muted">× {i.quantity.toLocaleString("en-US")}</span>
                          {i.specNotes ? <span className="block text-xs text-ink-muted">Spec: {i.specNotes}</span> : null}
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <RfqChip value={line.outreachStatus} />
                      <RfqChip value={line.commercialStatus} />
                    </div>
                    <div className="flex items-center gap-2">
                      {mail ? (
                        <SendEmailLink requestId={r.id} lineId={line.id} href={mail.href} />
                      ) : (
                        <Link href={`/admin/quotes/${r.id}#line-${line.id}`} className="text-xs underline">
                          Add email
                        </Link>
                      )}
                      <Link href={`/admin/quotes/${r.id}#line-${line.id}`} className="inline-flex h-8 items-center rounded-md border border-ink px-3 text-xs font-medium">
                        Open
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

async function OutreachView() {
  const rows = await db.quoteRequestSupplier.findMany({
    where: { quoteRequest: { stage: { notIn: ["COMPLETED", "CANCELLED"] } } },
    orderBy: [{ nextActionDue: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    take: 300,
    include: {
      supplier: { select: { name: true, businessEmail: true } },
      quoteRequest: { select: { id: true, reference: true, companyName: true, contactName: true } },
    },
  });
  if (rows.length === 0) return <Empty text="No supplier outreach open." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-ink-muted">
            <th className="py-2 pr-3 font-medium">Supplier</th>
            <th className="py-2 pr-3 font-medium">Request</th>
            <th className="py-2 pr-3 font-medium">Outreach</th>
            <th className="py-2 pr-3 font-medium">Quote</th>
            <th className="py-2 pr-3 font-medium">Last contact</th>
            <th className="py-2 pr-3 font-medium">Last reply</th>
            <th className="py-2 font-medium">Next action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line align-top">
              <td className="py-3 pr-3">
                <span className="block font-medium">{r.supplier.name}</span>
                <span className="block text-xs text-ink-muted">{r.supplier.businessEmail ?? "no business email"}</span>
              </td>
              <td className="py-3 pr-3">
                <Link href={`/admin/quotes/${r.quoteRequest.id}#line-${r.id}`} className="font-mono text-[13px] text-orange-ink hover:underline">
                  {r.quoteRequest.reference ?? r.quoteRequest.id.slice(0, 8)}
                </Link>
                <span className="block text-xs text-ink-muted">{r.quoteRequest.companyName ?? r.quoteRequest.contactName}</span>
              </td>
              <td className="py-3 pr-3"><RfqChip value={r.outreachStatus} /></td>
              <td className="py-3 pr-3"><RfqChip value={r.commercialStatus} /></td>
              <td className="py-3 pr-3 text-xs">{day(r.lastContactAt)}</td>
              <td className="py-3 pr-3 text-xs">
                {day(r.lastReplyAt)}
                {r.lastReplySummary ? <span className="block max-w-[220px] truncate text-ink-muted">{r.lastReplySummary}</span> : null}
              </td>
              <td className="py-3 text-xs">
                {r.nextAction ?? "—"}
                {r.nextActionDue ? <span className="block text-ink-muted">due {day(r.nextActionDue)}</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function SamplesView() {
  const rows = await db.quoteRequestItem.findMany({
    where: { sampleStatus: { not: "NOT_REQUESTED" } },
    orderBy: { updatedAt: "desc" },
    take: 300,
    include: {
      product: { select: { title: true, supplier: { select: { name: true } } } },
      quoteRequest: { select: { id: true, reference: true, companyName: true, contactName: true } },
    },
  });
  if (rows.length === 0) return <Empty text="No samples requested yet. Set a product's sample status on its request page." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-ink-muted">
            <th className="py-2 pr-3 font-medium">Product</th>
            <th className="py-2 pr-3 font-medium">Request</th>
            <th className="py-2 pr-3 font-medium">Sample</th>
            <th className="py-2 pr-3 font-medium">Tracking</th>
            <th className="py-2 pr-3 font-medium">Dispatched / delivered</th>
            <th className="py-2 font-medium">Customer feedback</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line align-top">
              <td className="py-3 pr-3">
                <span className="block font-medium">{r.product.title}</span>
                <span className="block text-xs text-ink-muted">{r.product.supplier.name}</span>
              </td>
              <td className="py-3 pr-3">
                <Link href={`/admin/quotes/${r.quoteRequest.id}`} className="font-mono text-[13px] text-orange-ink hover:underline">
                  {r.quoteRequest.reference ?? r.quoteRequest.id.slice(0, 8)}
                </Link>
                <span className="block text-xs text-ink-muted">{r.quoteRequest.companyName ?? r.quoteRequest.contactName}</span>
              </td>
              <td className="py-3 pr-3"><RfqChip value={r.sampleStatus} /></td>
              <td className="py-3 pr-3 text-xs">{[r.sampleCarrier, r.sampleTracking].filter(Boolean).join(" · ") || "—"}</td>
              <td className="py-3 pr-3 text-xs">{day(r.sampleDispatchedAt)} / {day(r.sampleDeliveredAt)}</td>
              <td className="py-3 text-xs">{r.customerFeedback ? <RfqChip value={r.customerFeedback} /> : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function ActivityView() {
  const rows = await db.quoteActivity.findMany({
    orderBy: { createdAt: "desc" },
    take: 150,
    include: {
      actor: { select: { name: true, email: true, role: true } },
      quoteRequest: { select: { id: true, reference: true } },
    },
  });
  if (rows.length === 0) return <Empty text="No activity yet." />;
  return (
    <ol className="divide-y divide-line">
      {rows.map((a) => (
        <li key={a.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5 text-sm">
          <span className="w-[130px] flex-none font-mono text-xs text-ink-muted">{when(a.createdAt)}</span>
          <Link href={`/admin/quotes/${a.quoteRequest.id}`} className="font-mono text-xs text-orange-ink hover:underline">
            {a.quoteRequest.reference ?? a.quoteRequest.id.slice(0, 8)}
          </Link>
          <span className="min-w-0 flex-1 text-ink">{a.message}</span>
          <span className="text-xs text-ink-muted">
            {a.actor ? (a.actor.role === "ADMIN" ? (a.actor.name ?? a.actor.email) : "customer") : "system"}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-line px-6 py-10 text-center text-sm text-ink-muted">{text}</p>;
}
