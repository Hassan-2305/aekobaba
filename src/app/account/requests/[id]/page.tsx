import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { requireBrandPage } from "@/lib/auth/page-guards";
import { formatMoney } from "@/lib/catalog/format";
import { db } from "@/lib/db";
import { customerSupplierStatus, label, quoteVisibleToCustomer } from "@/lib/rfq/statuses";

// The buyer's view of one request. Owns only the buyer's own requests (another
// account's id renders 404). The buyer sees progress per supplier and the
// quotes the team has shared — never internal notes or outreach detail.

export const metadata: Metadata = { title: "Quote request — Aekobaba" };
export const dynamic = "force-dynamic";

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export default async function QuoteRequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const { submitted } = await searchParams;
  const brand = await requireBrandPage(`/account/requests/${id}`);

  const request = await db.quoteRequest.findFirst({
    where: { id, brandUserId: brand.id },
    include: {
      items: { include: { product: { include: { supplier: true } } }, orderBy: { createdAt: "asc" } },
      suppliers: {
        include: {
          supplier: { select: { id: true, name: true, slug: true } },
          quotes: { include: { lines: true }, orderBy: { receivedAt: "desc" } },
        },
      },
    },
  });
  if (!request) notFound();

  return (
    <div className="mx-auto max-w-4xl px-5 pb-24 pt-12 sm:px-8">
      <Link href="/account/requests" className="text-sm text-ink-muted hover:text-ink">
        ← My quote requests
      </Link>
      {submitted ? (
        <p role="status" className="mt-4 rounded-md border border-success-ink/30 bg-success-tint px-4 py-3 text-sm text-success-deep">
          Request sent. The Aekovera team has it and will contact each supplier for you — we&rsquo;ll reply to{" "}
          {request.contactEmail ?? "your email"}.
        </p>
      ) : null}
      <p className="tag mt-6 text-ink-muted">{request.reference ?? request.id}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Quote request · {label(request.stage)}
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Sent {day(request.createdAt)} · {request.items.length} {request.items.length === 1 ? "item" : "items"} ·{" "}
        {request.suppliers.length} {request.suppliers.length === 1 ? "supplier" : "suppliers"}
        {request.deadline ? ` · needed by ${day(request.deadline)}` : ""}
      </p>

      <div className="mt-8 space-y-5">
        {request.suppliers.map((line) => {
          const items = request.items.filter((i) => i.product.supplierId === line.supplier.id);
          const shared = quoteVisibleToCustomer(line.commercialStatus) ? line.quotes[0] : null;
          return (
            <section key={line.id} className="rounded-xl border border-line-strong bg-paper p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-semibold text-ink">{line.supplier.name}</h2>
                <span className="rounded-full bg-well px-3 py-1 text-xs font-medium text-ink">
                  {customerSupplierStatus(line.outreachStatus, line.commercialStatus)}
                </span>
              </div>
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-ink-muted">
                    <th className="py-2 pr-3 font-medium">Product</th>
                    <th className="py-2 pr-3 text-right font-medium">Qty</th>
                    {shared ? <th className="py-2 pr-3 text-right font-medium">Quoted unit price</th> : null}
                    <th className="py-2 text-right font-medium">Sample</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const quoted = shared?.lines.find((l) => l.quoteRequestItemId === item.id);
                    return (
                      <tr key={item.id} className="border-b border-line align-top">
                        <td className="py-2.5 pr-3">
                          <Link href={`/products/${item.productId}`} className="text-ink hover:underline">
                            {item.product.title}
                          </Link>
                          {item.specNotes ? <p className="mt-0.5 text-xs text-ink-muted">{item.specNotes}</p> : null}
                        </td>
                        <td className="py-2.5 pr-3 text-right tabular-nums">{item.quantity.toLocaleString("en-US")}</td>
                        {shared ? (
                          <td className="py-2.5 pr-3 text-right tabular-nums">
                            {quoted ? formatMoney(Number(quoted.unitPrice), shared.currency as "USD") : "—"}
                          </td>
                        ) : null}
                        <td className="py-2.5 text-right text-xs text-ink-muted">
                          {item.sampleStatus === "NOT_REQUESTED" ? "—" : label(item.sampleStatus)}
                          {item.sampleTracking ? <span className="block">Tracking {item.sampleTracking}</span> : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {shared ? (
                <p className="mt-3 text-xs text-ink-muted">
                  Quote received {day(shared.receivedAt)}
                  {shared.leadTimeDays ? ` · lead time ${shared.leadTimeDays} days` : ""}
                  {shared.validUntil ? ` · valid until ${day(shared.validUntil)}` : ""}
                  {shared.terms ? ` · ${shared.terms}` : ""}. Reply to our email to accept or ask questions.
                </p>
              ) : null}
            </section>
          );
        })}
      </div>

      {request.notes || request.artworkNotes || request.artworkFileUrl ? (
        <div className="mt-6 rounded-xl border border-line bg-well p-5 text-sm">
          {request.notes ? (
            <p>
              <span className="text-ink-muted">Requirements: </span>
              {request.notes}
            </p>
          ) : null}
          {request.artworkNotes ? (
            <p className="mt-1">
              <span className="text-ink-muted">Artwork notes: </span>
              {request.artworkNotes}
            </p>
          ) : null}
          {request.artworkFileUrl ? (
            <a href={request.artworkFileUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-orange-ink underline">
              View attached artwork
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
