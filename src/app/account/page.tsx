import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/account/profile-form";
import { SignOutButton } from "@/components/brand/account-menu";
import { SIGN_IN_PATH } from "@/lib/auth/guard";
import { getServerSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { inquiryReference } from "@/lib/inquiries/validation";
import { label } from "@/lib/rfq/statuses";

export const metadata: Metadata = { title: "My account — Aekobaba" };
export const dynamic = "force-dynamic";

// The buyer's profile: their details, every quote request (AEK references)
// and every quote/sample request sent from a product page with this email.
// Team and supplier accounts are sent to their own workspaces.

const day = (d: Date) => d.toISOString().slice(0, 10);
const INQUIRY_STATUS: Record<string, string> = { NEW: "Received", CONTACTED: "In progress", CLOSED: "Closed" };

export default async function AccountPage() {
  const session = await getServerSessionUser();
  if (!session) redirect(`${SIGN_IN_PATH}?next=%2Faccount`);
  const user = await db.user.findUnique({
    where: { supabaseUserId: session.supabaseUserId },
    select: {
      id: true,
      role: true,
      email: true,
      name: true,
      phone: true,
      createdAt: true,
      brandProfile: { select: { companyName: true, website: true } },
    },
  });
  if (user?.role === "ADMIN") redirect("/admin");
  if (user?.role === "SUPPLIER") redirect("/supplier");
  if (!user) redirect(SIGN_IN_PATH);

  const email = session.email ?? user.email;
  const [requests, inquiries] = await Promise.all([
    db.quoteRequest.findMany({
      where: { brandUserId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { _count: { select: { items: true } }, suppliers: { select: { supplier: { select: { name: true } } } } },
    }),
    // Product-page requests are matched by email, so only a verified address
    // may claim them (otherwise anyone could sign up with someone else's email).
    db.inquiry.findMany({
      where: session.emailVerified ? { email: { equals: email, mode: "insensitive" } } : { id: "__none__" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, kind: true, status: true, quantity: true, createdAt: true, product: { select: { id: true, title: true, supplier: { select: { name: true } } } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-5 pb-24 pt-12 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="tag text-ink-muted">My account</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight text-ink">{user.name || email}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {email} · member since {day(user.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/basket" className="inline-flex h-10 items-center rounded-md bg-orange px-4 text-sm font-semibold text-on-orange hover:bg-orange-hi">
            Quote Basket
          </Link>
          <SignOutButton className="h-10 rounded-md border border-ink px-4 text-sm font-medium text-ink hover:bg-well" />
        </div>
      </div>

      <nav aria-label="Account sections" className="mt-8 flex gap-6 border-b border-line text-sm">
        <a href="#requests" className="border-b-2 border-ink pb-2.5 font-medium">
          Quote requests ({requests.length})
        </a>
        <a href="#product-requests" className="pb-2.5 text-ink-muted hover:text-ink">
          Product requests ({inquiries.length})
        </a>
        <a href="#details" className="pb-2.5 text-ink-muted hover:text-ink">
          My details
        </a>
      </nav>

      <section id="requests" className="mt-8 scroll-mt-24">
        <h2 className="text-xl font-semibold">Quote requests</h2>
        <p className="mt-1 text-sm text-ink-muted">Sent from your Quote Basket. The Aekovera team contacts each supplier and updates the status here.</p>
        {requests.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-line px-6 py-8 text-center text-sm text-ink-muted">
            No quote requests yet.{" "}
            <Link href="/results" className="font-medium text-orange-ink underline">
              Browse packaging
            </Link>{" "}
            and add products to your Quote Basket.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-xl border border-line-strong">
            {requests.map((r) => (
              <li key={r.id}>
                <Link href={`/account/requests/${r.id}`} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-4 hover:bg-well/60">
                  <span className="w-[170px] font-mono text-[13px] font-medium text-orange-ink">{r.reference ?? r.id.slice(0, 8)}</span>
                  <span className="min-w-0 flex-1 text-sm">
                    {r._count.items} item{r._count.items === 1 ? "" : "s"} · {r.suppliers.map((s) => s.supplier.name).join(", ")}
                  </span>
                  <span className="text-xs text-ink-muted">{day(r.createdAt)}</span>
                  <span className="rounded-full bg-well px-3 py-1 text-xs font-medium">{label(r.stage)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="product-requests" className="mt-12 scroll-mt-24">
        <h2 className="text-xl font-semibold">Product requests</h2>
        <p className="mt-1 text-sm text-ink-muted">
          &ldquo;Get a quote&rdquo; and &ldquo;Get a sample&rdquo; requests sent from product pages with {email}.
        </p>
        {inquiries.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-line px-6 py-8 text-center text-sm text-ink-muted">None yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-xl border border-line-strong">
            {inquiries.map((q) => (
              <li key={q.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 px-5 py-4 text-sm">
                <span className="w-[170px] font-mono text-[13px] text-ink-muted">#{inquiryReference(q.id)}</span>
                <span className="min-w-0 flex-1">
                  <Link href={`/products/${q.product.id}`} className="font-medium hover:underline">
                    {q.product.title}
                  </Link>
                  <span className="block text-xs text-ink-muted">
                    {q.kind === "SAMPLE" ? "Sample" : "Quote"} · {q.product.supplier.name} · qty {q.quantity}
                  </span>
                </span>
                <span className="text-xs text-ink-muted">{day(q.createdAt)}</span>
                <span className="rounded-full bg-well px-3 py-1 text-xs font-medium">{INQUIRY_STATUS[q.status] ?? q.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="details" className="mt-12 scroll-mt-24 rounded-xl border border-line-strong p-6">
        <h2 className="text-xl font-semibold">My details</h2>
        <p className="mb-5 mt-1 text-sm text-ink-muted">Used to prefill your quote requests and so the team knows how to reach you.</p>
        <ProfileForm
          email={email}
          name={user.name ?? ""}
          phone={user.phone ?? ""}
          company={user.brandProfile?.companyName ?? ""}
          website={user.brandProfile?.website ?? ""}
        />
      </section>
    </div>
  );
}
