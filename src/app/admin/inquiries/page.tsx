import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { InquiryStatusSelect } from "@/components/admin/inquiry-status";
import { FilterTabs, WorkspaceShell } from "@/components/workspace/shell";
import { getServerSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { DESIGN_STATUS_LABEL, inquiryReference } from "@/lib/inquiries/validation";

export const metadata: Metadata = { title: "Inquiries · Admin" };
export const dynamic = "force-dynamic";

// Admin inbox for "Get a quote" / "Get a sample" requests from product pages.
// Middleware restricts /admin/* to ADMIN; the session check here redirects
// signed-out visitors. File bytes are never loaded in the list.

const VIEWS = ["NEW", "CONTACTED", "CLOSED"] as const;
type View = (typeof VIEWS)[number] | "ALL";

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSessionUser();
  if (!session) redirect("/auth/sign-in?next=%2Fadmin%2Finquiries");

  const params = await searchParams;
  const requested = typeof params.status === "string" ? params.status.toUpperCase() : "NEW";
  const view: View = (VIEWS as readonly string[]).includes(requested)
    ? (requested as View)
    : requested === "ALL"
      ? "ALL"
      : "NEW";

  const [inquiries, counts] = await Promise.all([
    db.inquiry.findMany({
      where: view === "ALL" ? {} : { status: view },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        product: { select: { id: true, title: true, supplier: { select: { name: true } } } },
        file: { select: { name: true, size: true } },
      },
    }),
    db.inquiry.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const total = counts.reduce((sum, c) => sum + c._count._all, 0);

  return (
    <WorkspaceShell
      area="admin"
      active="inquiries"
      title="Inquiries"
      subtitle="Quote and sample requests from product pages. Reply by email, then move them along."
    >
      <FilterTabs
        tabs={[
          {
            href: "/admin/inquiries?status=new",
            label: "New",
            count: countOf("NEW"),
            active: view === "NEW",
          },
          {
            href: "/admin/inquiries?status=contacted",
            label: "Contacted",
            count: countOf("CONTACTED"),
            active: view === "CONTACTED",
          },
          {
            href: "/admin/inquiries?status=closed",
            label: "Closed",
            count: countOf("CLOSED"),
            active: view === "CLOSED",
          },
          {
            href: "/admin/inquiries?status=all",
            label: "All",
            count: total,
            active: view === "ALL",
          },
        ]}
      />

      {inquiries.length === 0 ? (
        <p className="mt-8 border border-dashed border-line px-6 py-12 text-center text-sm text-ink-muted">
          No inquiries here yet.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {inquiries.map((q) => (
            <li key={q.id} className="border border-line bg-card" data-testid="inquiry-row">
              <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto]">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`tag px-1.5 py-1 ${q.kind === "SAMPLE" ? "bg-warning-tint text-warning-ink" : "bg-orange-tint text-orange-ink"}`}
                    >
                      {q.kind === "SAMPLE" ? "Sample" : "Quote"}
                    </span>
                    <span className="font-mono text-xs text-ink-faint">
                      #{inquiryReference(q.id)}
                    </span>
                  </div>
                  <p className="mt-2 text-base font-medium text-ink">{q.name}</p>
                  <p className="text-sm">
                    <a
                      href={`mailto:${q.email}`}
                      className="text-ink underline decoration-ink/20 underline-offset-4 hover:decoration-orange"
                    >
                      {q.email}
                    </a>
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {[q.company, q.phone].filter(Boolean).join(" · ")}
                    {q.website ? (
                      <>
                        {q.company || q.phone ? " · " : ""}
                        <a
                          href={q.website}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="hover:text-ink hover:underline"
                        >
                          {q.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      </>
                    ) : null}
                  </p>
                  <p className="mt-2 text-xs text-ink-faint">
                    {q.createdAt.toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>

                <div className="min-w-0 text-sm">
                  <Link
                    href={`/products/${q.product.id}`}
                    className="font-medium text-ink hover:underline"
                  >
                    {q.product.title}
                  </Link>
                  <p className="text-xs text-ink-faint">{q.product.supplier.name}</p>
                  <dl className="mt-3 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1.5 text-xs">
                    <dt className="tag self-center text-ink-faint">Quantity</dt>
                    <dd className="text-ink">{q.quantity}</dd>
                    {q.packagingType ? (
                      <>
                        <dt className="tag self-center text-ink-faint">Type</dt>
                        <dd className="text-ink">{q.packagingType}</dd>
                      </>
                    ) : null}
                    {q.format ? (
                      <>
                        <dt className="tag self-center text-ink-faint">Format</dt>
                        <dd className="text-ink">{q.format}</dd>
                      </>
                    ) : null}
                    <dt className="tag self-center text-ink-faint">Design</dt>
                    <dd className="text-ink">{DESIGN_STATUS_LABEL[q.designStatus]}</dd>
                  </dl>
                  <p className="mt-3 whitespace-pre-line border-l-2 border-line pl-3 text-sm leading-relaxed text-ink-muted">
                    {q.description}
                  </p>
                  {q.file ? (
                    <a
                      href={`/api/admin/inquiries/${q.id}/file`}
                      className="mt-3 inline-flex items-center gap-2 border border-line px-3 py-1.5 text-xs text-ink transition-colors hover:border-ink"
                    >
                      Download design · {q.file.name} ({Math.max(1, Math.round(q.file.size / 1024))}{" "}
                      KB)
                    </a>
                  ) : null}
                </div>

                <div className="lg:justify-self-end">
                  <InquiryStatusSelect inquiryId={q.id} current={q.status} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </WorkspaceShell>
  );
}
