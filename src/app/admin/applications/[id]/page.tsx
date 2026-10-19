import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ApplicationReview } from "@/components/admin/application-review";
import { WorkspaceShell } from "@/components/workspace/shell";
import { requireAdminPage } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { label } from "@/lib/rfq/statuses";

export const metadata: Metadata = { title: "Supplier application · Admin" };
export const dynamic = "force-dynamic";

export default async function AdminApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdminPage(`/admin/applications/${id}`);
  const app = await db.supplierApplication.findUnique({
    where: { id },
    include: { meeting: true, applicant: { select: { email: true } } },
  });
  if (!app) notFound();

  const replySubject = encodeURIComponent(`Your Aekobaba ${label(app.type).toLowerCase()} request ${app.reference}`);
  return (
    <WorkspaceShell area="admin" active="applications" title={`${label(app.type)} · ${app.companyName}`} subtitle={app.reference}>
      <Link href="/admin/applications" className="text-sm text-ink-muted hover:text-ink">
        ← All applications
      </Link>
      <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-xl border border-line-strong bg-paper p-5 text-sm">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <Item k="Company" v={app.companyName} />
            <Item
              k="Website"
              v={
                <a href={app.website} target="_blank" rel="noopener noreferrer" className="text-orange-ink underline">
                  {app.website}
                </a>
              }
            />
            <Item k="Location" v={app.location ?? "—"} />
            <Item k="Contact" v={app.contactName} />
            <Item
              k="Email"
              v={
                <a href={`mailto:${app.contactEmail}?subject=${replySubject}`} className="text-orange-ink underline">
                  {app.contactEmail}
                </a>
              }
            />
            <Item k="Phone" v={app.contactPhone ?? "—"} />
            <Item k="Signed-in account" v={app.applicant?.email ?? "not signed in"} />
            <Item k="Received" v={app.createdAt.toISOString().slice(0, 16).replace("T", " ")} />
            <Item k="Categories" v={app.categories.length ? app.categories.join(", ") : "—"} wide />
            {app.catalogUrls.length ? (
              <Item
                k="Product / catalog pages"
                wide
                v={
                  <ul className="space-y-0.5">
                    {app.catalogUrls.map((u) => (
                      <li key={u}>
                        <a href={u} target="_blank" rel="noopener noreferrer" className="break-all text-orange-ink underline">
                          {u}
                        </a>
                      </li>
                    ))}
                  </ul>
                }
              />
            ) : null}
            <Item k="Message" v={<span className="whitespace-pre-wrap">{app.message ?? "—"}</span>} wide />
          </dl>
          {app.type === "PRODUCT_FETCH" ? (
            <p className="mt-5 rounded-md bg-well px-3 py-2 text-xs text-ink-muted">
              Extraction flow: review the site → set status to &ldquo;Extraction authorized&rdquo; once the supplier confirms →
              &ldquo;Extracting&rdquo; → &ldquo;Products in review&rdquo; (check every price, keep source URL + capture date) →
              &ldquo;Published&rdquo;.
            </p>
          ) : null}
        </section>
        <ApplicationReview
          id={app.id}
          type={app.type}
          status={app.status}
          internalNotes={app.internalNotes}
          meeting={
            app.meeting
              ? {
                  status: app.meeting.status,
                  scheduledAt: app.meeting.scheduledAt ? app.meeting.scheduledAt.toISOString() : null,
                  outcome: app.meeting.outcome,
                  followUp: app.meeting.followUp,
                }
              : null
          }
          bookingUrl={process.env.NEXT_PUBLIC_PARTNER_BOOKING_URL?.trim() || null}
        />
      </div>
    </WorkspaceShell>
  );
}

function Item({ k, v, wide }: { k: string; v: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs text-ink-muted">{k}</dt>
      <dd className="mt-0.5">{v}</dd>
    </div>
  );
}
