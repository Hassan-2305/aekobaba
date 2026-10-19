import type { Metadata } from "next";
import Link from "next/link";

import { RfqChip } from "@/components/admin/rfq-chip";
import { FilterTabs, WorkspaceShell } from "@/components/workspace/shell";
import { requireAdminPage } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { APPLICATION_TYPES, label, type ApplicationType } from "@/lib/rfq/statuses";

export const metadata: Metadata = { title: "Supplier applications · Admin" };
export const dynamic = "force-dynamic";

// New-company listings, product-fetch requests and partnership requests.

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdminPage("/admin/applications");
  const params = await searchParams;
  const type = (APPLICATION_TYPES as readonly string[]).includes(String(params.type)) ? (params.type as ApplicationType) : null;

  const [rows, counts] = await Promise.all([
    db.supplierApplication.findMany({
      where: type ? { type } : {},
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { meeting: true },
    }),
    db.supplierApplication.groupBy({ by: ["type"], where: { status: "PENDING" }, _count: { _all: true } }),
  ]);
  const pending = (t: string) => counts.find((c) => c.type === t)?._count._all ?? 0;

  return (
    <WorkspaceShell area="admin" active="applications" title="Supplier applications" subtitle="Companies asking to be listed, to have products fetched, or to partner.">
      <FilterTabs
        tabs={[
          { href: "/admin/applications", label: "All", active: type === null },
          ...APPLICATION_TYPES.map((t) => ({ href: `/admin/applications?type=${t}`, label: label(t), count: pending(t), active: type === t })),
        ]}
      />
      {rows.length === 0 ? (
        <p className="mt-6 rounded-md border border-dashed border-line px-6 py-10 text-center text-sm text-ink-muted">No applications yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-muted">
                <th className="py-2 pr-3 font-medium">Reference</th>
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 font-medium">Company</th>
                <th className="py-2 pr-3 font-medium">Contact</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium">Received</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-b border-line align-top">
                  <td className="py-3 pr-3">
                    <Link href={`/admin/applications/${a.id}`} className="font-mono text-[13px] text-orange-ink hover:underline">
                      {a.reference}
                    </Link>
                  </td>
                  <td className="py-3 pr-3 text-xs">{label(a.type)}</td>
                  <td className="py-3 pr-3">
                    <span className="block font-medium">{a.companyName}</span>
                    <a href={a.website} target="_blank" rel="noopener noreferrer" className="text-xs text-ink-muted underline">
                      {a.website.replace(/^https?:\/\//, "")}
                    </a>
                  </td>
                  <td className="py-3 pr-3 text-xs">
                    {a.contactName}
                    <span className="block text-ink-muted">{a.contactEmail}</span>
                  </td>
                  <td className="py-3 pr-3">
                    <RfqChip value={a.status} />
                    {a.meeting ? <span className="ml-1"><RfqChip value={a.meeting.status} prefix="Meeting" /></span> : null}
                  </td>
                  <td className="py-3 text-xs text-ink-muted">{a.createdAt.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </WorkspaceShell>
  );
}
