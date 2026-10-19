import type { Metadata } from "next";
import Link from "next/link";

import { RfqChip } from "@/components/admin/rfq-chip";
import { WorkspaceShell } from "@/components/workspace/shell";
import { requireAdminPage } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { inquiryReference } from "@/lib/inquiries/validation";
import { emailConfigured } from "@/lib/notify/outbox";

export const metadata: Metadata = { title: "Dashboard · Admin" };
export const dynamic = "force-dynamic";

// The team's landing page: what needs attention today, the catalog at a
// glance, recent customer requests (AEK references) and every supplier with
// its products and open requests.

const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "—");

export default async function AdminDashboardPage() {
  const admin = await requireAdminPage("/admin");
  const today = new Date();
  today.setUTCHours(23, 59, 59, 999);

  const [
    productCount,
    activeSuppliers,
    partnerCount,
    stageCounts,
    notContacted,
    awaitingShare,
    followUpsDue,
    samplesMoving,
    pendingApps,
    undelivered,
    recent,
    suppliers,
    openLines,
    buyerCount,
    newInquiries,
    recentInquiries,
  ] = await Promise.all([
    db.product.count({ where: { supplier: { status: { not: "DISABLED" } } } }),
    db.supplier.count({ where: { status: { not: "DISABLED" } } }),
    db.supplier.count({ where: { isPartner: true, status: { not: "DISABLED" } } }),
    db.quoteRequest.groupBy({ by: ["stage"], _count: { _all: true } }),
    db.quoteRequestSupplier.count({ where: { outreachStatus: "NOT_CONTACTED", quoteRequest: { stage: { notIn: ["COMPLETED", "CANCELLED"] } } } }),
    db.quoteRequestSupplier.count({ where: { commercialStatus: { in: ["QUOTE_RECEIVED", "REVIEWING"] } } }),
    db.quoteRequestSupplier.count({
      where: { nextActionDue: { lte: today }, quoteRequest: { stage: { notIn: ["COMPLETED", "CANCELLED"] } } },
    }),
    db.quoteRequestItem.count({ where: { sampleStatus: { in: ["REQUESTED", "APPROVED", "DISPATCHED"] } } }),
    db.supplierApplication.count({ where: { status: "PENDING" } }),
    db.notificationOutbox.count({ where: { status: { in: ["PENDING", "FAILED"] } } }),
    db.quoteRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        suppliers: { select: { outreachStatus: true, commercialStatus: true, supplier: { select: { name: true } } } },
        _count: { select: { items: true } },
      },
    }),
    db.supplier.findMany({
      where: { status: { not: "DISABLED" } },
      orderBy: [{ isPartner: "desc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        website: true,
        status: true,
        isPartner: true,
        businessEmail: true,
        _count: { select: { products: true } },
      },
    }),
    db.quoteRequestSupplier.groupBy({
      by: ["supplierId"],
      where: { quoteRequest: { stage: { notIn: ["COMPLETED", "CANCELLED"] } } },
      _count: { _all: true },
      _max: { lastContactAt: true },
    }),
    db.user.count({ where: { role: "BRAND" } }),
    db.inquiry.count({ where: { status: "NEW" } }),
    db.inquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        kind: true,
        status: true,
        name: true,
        company: true,
        email: true,
        quantity: true,
        createdAt: true,
        product: { select: { id: true, title: true, supplier: { select: { name: true } } } },
      },
    }),
  ]);

  const stage = (s: string) => stageCounts.find((c) => c.stage === s)?._count._all ?? 0;
  const totalRequests = stageCounts.reduce((sum, c) => sum + c._count._all, 0);
  const openBySupplier = new Map(openLines.map((l) => [l.supplierId, l]));

  const attention = [
    { n: stage("NEW"), label: "New basket requests (AEK)", href: "/admin/quotes" },
    { n: newInquiries, label: "New product-page requests", href: "/admin/inquiries" },
    { n: notContacted, label: "Suppliers not contacted", href: "/admin/quotes?view=suppliers" },
    { n: awaitingShare, label: "Quotes to review & share", href: "/admin/quotes?view=outreach" },
    { n: followUpsDue, label: "Follow-ups due today", href: "/admin/quotes?view=outreach" },
    { n: samplesMoving, label: "Samples in progress", href: "/admin/quotes?view=samples" },
    { n: pendingApps, label: "Supplier applications", href: "/admin/applications" },
  ];

  return (
    <WorkspaceShell area="admin" active="dashboard" title="Dashboard" subtitle={`Signed in as ${admin.email}`}>
      {undelivered > 0 ? (
        <p className="mb-6 rounded-md border border-orange/40 bg-orange-tint px-4 py-3 text-sm text-orange-ink">
          {undelivered} team email{undelivered === 1 ? "" : "s"} waiting to be sent
          {emailConfigured() ? "" : " — email sending isn't set up yet (RESEND_API_KEY and EMAIL_FROM in Vercel)"}.{" "}
          <Link href="/admin/notifications" className="font-medium underline">
            Email outbox
          </Link>
        </p>
      ) : null}

      <h2 className="tag text-ink-muted">Needs attention</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {attention.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className={`rounded-xl border p-4 transition-colors hover:border-ink ${a.n > 0 ? "border-orange/50 bg-orange-tint" : "border-line-strong bg-paper"}`}
          >
            <span className="block text-3xl font-semibold tabular-nums tracking-tight">{a.n}</span>
            <span className="mt-1 block text-sm text-ink-body">{a.label}</span>
          </Link>
        ))}
      </div>

      <h2 className="tag mt-8 text-ink-muted">Marketplace</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {[
          { n: productCount, label: "Live products", href: "/results" },
          { n: activeSuppliers, label: "Suppliers", href: "#suppliers" },
          { n: partnerCount, label: "Partners", href: "/partners" },
          { n: totalRequests, label: "Quote requests (all time)", href: "/admin/quotes?closed=1" },
          { n: stage("IN_PROGRESS") + stage("QUOTES_SHARED"), label: "Requests in progress", href: "/admin/quotes" },
          { n: buyerCount, label: "Buyer accounts", href: "/admin/quotes" },
        ].map((k) => (
          <Link key={k.label} href={k.href} className="rounded-xl border border-line-strong bg-paper p-4 hover:border-ink">
            <span className="block text-3xl font-semibold tabular-nums tracking-tight">{k.n.toLocaleString("en-US")}</span>
            <span className="mt-1 block text-sm text-ink-body">{k.label}</span>
          </Link>
        ))}
      </div>

      <section className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold">Latest basket requests (AEK)</h2>
          <Link href="/admin/quotes" className="text-sm font-medium text-orange-ink hover:underline">
            All requests →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-line px-6 py-8 text-center text-sm text-ink-muted">No requests yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-muted">
                  <th className="py-2 pr-3 font-medium">Reference</th>
                  <th className="py-2 pr-3 font-medium">Customer</th>
                  <th className="py-2 pr-3 font-medium">Suppliers</th>
                  <th className="py-2 pr-3 font-medium">Stage</th>
                  <th className="py-2 font-medium">Received</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-b border-line align-top">
                    <td className="py-2.5 pr-3">
                      <Link href={`/admin/quotes/${r.id}`} className="font-mono text-[13px] font-medium text-orange-ink hover:underline">
                        {r.reference ?? r.id.slice(0, 8)}
                      </Link>
                      <span className="block text-xs text-ink-muted">{r._count.items} items</span>
                    </td>
                    <td className="py-2.5 pr-3">
                      {r.companyName ?? r.contactName ?? "—"}
                      <span className="block text-xs text-ink-muted">{r.contactEmail}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-xs">
                      {r.suppliers.map((s) => (
                        <span key={s.supplier.name} className="mb-1 mr-2 inline-flex items-center gap-1">
                          {s.supplier.name} <RfqChip value={s.outreachStatus} />
                        </span>
                      ))}
                    </td>
                    <td className="py-2.5 pr-3">
                      <RfqChip value={r.stage} />
                    </td>
                    <td className="py-2.5 text-xs text-ink-muted">{day(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold">Latest product-page requests</h2>
          <Link href="/admin/inquiries" className="text-sm font-medium text-orange-ink hover:underline">
            All product requests →
          </Link>
        </div>
        {recentInquiries.length === 0 ? (
          <p className="mt-3 rounded-md border border-dashed border-line px-6 py-8 text-center text-sm text-ink-muted">None yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-muted">
                  <th className="py-2 pr-3 font-medium">Reference</th>
                  <th className="py-2 pr-3 font-medium">Customer</th>
                  <th className="py-2 pr-3 font-medium">Product</th>
                  <th className="py-2 pr-3 font-medium">Qty</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 font-medium">Received</th>
                </tr>
              </thead>
              <tbody>
                {recentInquiries.map((q) => (
                  <tr key={q.id} className="border-b border-line align-top">
                    <td className="py-2.5 pr-3">
                      <Link href="/admin/inquiries" className="font-mono text-[13px] font-medium text-orange-ink hover:underline">
                        #{inquiryReference(q.id)}
                      </Link>
                      <span className="block text-xs text-ink-muted">{q.kind === "SAMPLE" ? "Sample" : "Quote"}</span>
                    </td>
                    <td className="py-2.5 pr-3">
                      {q.company || q.name}
                      <span className="block text-xs text-ink-muted">{q.email}</span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <Link href={`/products/${q.product.id}`} className="hover:underline">
                        {q.product.title}
                      </Link>
                      <span className="block text-xs text-ink-muted">{q.product.supplier.name}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-xs">{q.quantity}</td>
                    <td className="py-2.5 pr-3">
                      <RfqChip value={q.status === "NEW" ? "NEW" : q.status === "CONTACTED" ? "IN_PROGRESS" : "COMPLETED"} />
                    </td>
                    <td className="py-2.5 text-xs text-ink-muted">{day(q.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="suppliers" className="mt-10 scroll-mt-20">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-semibold">Suppliers ({suppliers.length})</h2>
          <Link href="/admin/suppliers" className="text-sm font-medium text-orange-ink hover:underline">
            Verification & tiers →
          </Link>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-muted">
                <th className="py-2 pr-3 font-medium">Supplier</th>
                <th className="py-2 pr-3 text-right font-medium">Products</th>
                <th className="py-2 pr-3 text-right font-medium">Open requests</th>
                <th className="py-2 pr-3 font-medium">Last contact</th>
                <th className="py-2 pr-3 font-medium">RFQ email</th>
                <th className="py-2 font-medium">Tier</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => {
                const open = openBySupplier.get(s.id);
                return (
                  <tr key={s.id} className="border-b border-line align-top">
                    <td className="py-2.5 pr-3">
                      <Link href={`/suppliers/${s.slug}`} className="font-medium text-ink hover:underline">
                        {s.name}
                      </Link>
                      {s.isPartner ? <span className="ml-2 rounded bg-partner px-1.5 py-0.5 font-mono text-[10px] text-partner-on">PARTNER</span> : null}
                      <a href={s.website} target="_blank" rel="noopener noreferrer" className="block text-xs text-ink-muted hover:underline">
                        {s.website.replace(/^https?:\/\/(www\.)?/, "")}
                      </a>
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{s._count.products}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">
                      {open ? (
                        <Link href={`/admin/quotes?view=suppliers#sup-${s.id}`} className="font-semibold text-orange-ink hover:underline">
                          {open._count._all}
                        </Link>
                      ) : (
                        <span className="text-ink-faint">0</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-xs">{day(open?._max.lastContactAt)}</td>
                    <td className="py-2.5 pr-3 text-xs">{s.businessEmail ?? <span className="text-ink-faint">not set</span>}</td>
                    <td className="py-2.5 text-xs">{s.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </WorkspaceShell>
  );
}
