import type { Metadata } from "next";
import Link from "next/link";

import { AdminCard, AdminShell } from "@/components/admin/admin-shell";
import { RfqChip } from "@/components/admin/rfq-chip";
import { requireAdminPage } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { inquiryReference } from "@/lib/inquiries/validation";

export const metadata: Metadata = { title: "Search · Admin" };
export const dynamic = "force-dynamic";

// Admin search (top bar, Ctrl/⌘ K): quote requests by reference or customer,
// product-page requests by reference/customer, supplier applications,
// suppliers and products — each group links straight to its page.

export default async function AdminSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage("/admin/search");
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw ?? "").trim().slice(0, 100);
  const has = { contains: q, mode: "insensitive" as const };

  const [requests, inquiries, applications, suppliers, products] = q
    ? await Promise.all([
        db.quoteRequest.findMany({
          where: { OR: [{ reference: has }, { contactEmail: has }, { contactName: has }, { companyName: has }] },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, reference: true, contactName: true, companyName: true, contactEmail: true, stage: true, createdAt: true },
        }),
        db.inquiry.findMany({
          where: { OR: [{ email: has }, { name: has }, { company: has }, { id: { endsWith: q.toLowerCase().replace(/^#/, "") } }] },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, name: true, company: true, email: true, status: true, createdAt: true, product: { select: { title: true } } },
        }),
        db.supplierApplication.findMany({
          where: { OR: [{ reference: has }, { companyName: has }, { contactEmail: has }, { website: has }] },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, reference: true, companyName: true, type: true, status: true },
        }),
        db.supplier.findMany({
          where: { OR: [{ name: has }, { website: has }, { slug: has }] },
          take: 10,
          select: { id: true, slug: true, name: true, status: true, _count: { select: { products: true } } },
        }),
        db.product.findMany({
          where: { OR: [{ title: has }, { material: has }] },
          take: 12,
          select: { id: true, title: true, supplier: { select: { name: true } } },
        }),
      ])
    : [[], [], [], [], []];
  const total = requests.length + inquiries.length + applications.length + suppliers.length + products.length;

  return (
    <AdminShell
      active="dashboard"
      eyebrow="Search"
      title={q ? `Results for “${q}”` : "Search"}
      subtitle={q ? `${total} match${total === 1 ? "" : "es"}` : "Find requests, customers, suppliers and products. Press Ctrl K anywhere."}
      searchQuery={q}
    >
      {q && total === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#e2ddd6] px-6 py-12 text-center text-sm text-ink-muted">Nothing matches “{q}”.</p>
      ) : null}
      <div className="grid gap-5 xl:grid-cols-2">
        {requests.length ? (
          <AdminCard title="Basket requests">
            <ul className="divide-y divide-[#f0ede8]">
              {requests.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <Link href={`/admin/quotes/${r.id}`} className="font-mono text-[13px] font-medium text-orange-ink hover:underline">
                    {r.reference ?? r.id.slice(0, 8)}
                  </Link>
                  <span className="min-w-0 flex-1 truncate">
                    {r.companyName || r.contactName} <span className="text-ink-muted">· {r.contactEmail}</span>
                  </span>
                  <RfqChip value={r.stage} />
                </li>
              ))}
            </ul>
          </AdminCard>
        ) : null}
        {inquiries.length ? (
          <AdminCard title="Product-page requests">
            <ul className="divide-y divide-[#f0ede8]">
              {inquiries.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <Link href="/admin/inquiries?status=ALL" className="font-mono text-[13px] font-medium text-orange-ink hover:underline">
                    #{inquiryReference(i.id)}
                  </Link>
                  <span className="min-w-0 flex-1 truncate">
                    {i.company || i.name} <span className="text-ink-muted">· {i.product.title}</span>
                  </span>
                  <RfqChip value={i.status === "NEW" ? "NEW" : i.status === "CONTACTED" ? "IN_PROGRESS" : "COMPLETED"} />
                </li>
              ))}
            </ul>
          </AdminCard>
        ) : null}
        {applications.length ? (
          <AdminCard title="Supplier applications">
            <ul className="divide-y divide-[#f0ede8]">
              {applications.map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <Link href={`/admin/applications/${a.id}`} className="font-mono text-[13px] font-medium text-orange-ink hover:underline">
                    {a.reference}
                  </Link>
                  <span className="min-w-0 flex-1 truncate">{a.companyName}</span>
                  <RfqChip value={a.status} />
                </li>
              ))}
            </ul>
          </AdminCard>
        ) : null}
        {suppliers.length ? (
          <AdminCard title="Suppliers">
            <ul className="divide-y divide-[#f0ede8]">
              {suppliers.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <Link href={`/suppliers/${s.slug}`} className="min-w-0 flex-1 truncate font-medium hover:underline">
                    {s.name}
                  </Link>
                  <span className="text-xs text-ink-muted">{s._count.products} products</span>
                  <span className="text-xs text-ink-muted">{s.status}</span>
                </li>
              ))}
            </ul>
          </AdminCard>
        ) : null}
        {products.length ? (
          <AdminCard title="Products">
            <ul className="divide-y divide-[#f0ede8]">
              {products.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <Link href={`/products/${p.id}`} className="min-w-0 flex-1 truncate hover:underline">
                    {p.title}
                  </Link>
                  <span className="flex-none text-xs text-ink-muted">{p.supplier.name}</span>
                </li>
              ))}
            </ul>
          </AdminCard>
        ) : null}
      </div>
    </AdminShell>
  );
}
