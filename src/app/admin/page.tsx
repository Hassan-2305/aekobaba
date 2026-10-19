import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { RangeSelect } from "@/components/admin/admin-chrome";
import { AdminCard, AdminShell } from "@/components/admin/admin-shell";
import { AdminIcon, type AdminIconName } from "@/components/admin/icons";
import { RfqChip } from "@/components/admin/rfq-chip";
import { RANGES } from "@/lib/admin/ranges";
import { requireAdminPage } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { inquiryReference } from "@/lib/inquiries/validation";
import { MAX_ATTEMPTS, emailConfigured } from "@/lib/notify/outbox";

export const metadata: Metadata = { title: "Dashboard · Admin" };
export const dynamic = "force-dynamic";

// The team's home: what needs attention now (KPIs with trends over the chosen
// range), every request waiting on the team, the recent activity feed, the
// marketplace at a glance and the latest product-page requests. Live data only.

const DAY = 24 * 60 * 60 * 1000;
const TABS = ["all", "basket", "product", "applications"] as const;
type Tab = (typeof TABS)[number];

const day = (d: Date) => d.toISOString().slice(0, 10);

function ago(d: Date, now: Date): string {
  const s = Math.max(0, Math.round((now.getTime() - d.getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return day(d);
}

/** Daily counts over the range, folded into at most 30 buckets. */
function buckets(dates: Date[], since: Date, rangeDays: number): number[] {
  const n = Math.min(30, rangeDays);
  const width = (rangeDays * DAY) / n;
  const out = new Array<number>(n).fill(0);
  for (const d of dates) {
    const i = Math.floor((d.getTime() - since.getTime()) / width);
    if (i >= 0 && i < n) out[i]++;
  }
  return out;
}

function Sparkline({ values, tone }: { values: number[]; tone: "orange" | "grey" }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const w = 160;
  const h = 34;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 3 - (v / max) * (h - 8)]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg aria-hidden viewBox={`0 0 ${w} ${h}`} className="mt-3 h-[34px] w-full" preserveAspectRatio="none">
      <path d={d} fill="none" stroke={tone === "orange" ? "#f76808" : "#b9b4ad"} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function TypeChip({ icon, label }: { icon: AdminIconName; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-orange/25 bg-orange-tint px-2 py-1 text-xs font-medium text-orange-ink">
      <AdminIcon name={icon} size={14} />
      {label}
    </span>
  );
}

function OpenLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} aria-label={label} className="inline-flex text-ink-muted hover:text-ink">
      <AdminIcon name="chevronRight" size={18} />
    </Link>
  );
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage("/admin");
  const params = await searchParams;
  const range = (RANGES as readonly number[]).includes(Number(params.range)) ? Number(params.range) : 30;
  const tab: Tab = (TABS as readonly string[]).includes(String(params.tab)) ? (params.tab as Tab) : "all";
  const now = new Date();
  const since = new Date(now.getTime() - range * DAY);
  const endOfToday = new Date(now);
  endOfToday.setUTCHours(23, 59, 59, 999);

  const openStages = { notIn: ["COMPLETED", "CANCELLED"] as ("COMPLETED" | "CANCELLED")[] };
  // A basket request needs the team when it's new or a supplier line is waiting on us.
  const basketAttention = {
    stage: openStages,
    OR: [
      { stage: "NEW" as const },
      {
        suppliers: {
          some: {
            OR: [
              { outreachStatus: { in: ["NOT_CONTACTED", "FOLLOW_UP_NEEDED", "REPLIED"] as ("NOT_CONTACTED" | "FOLLOW_UP_NEEDED" | "REPLIED")[] } },
              { commercialStatus: { in: ["QUOTE_RECEIVED", "REVIEWING"] as ("QUOTE_RECEIVED" | "REVIEWING")[] } },
            ],
          },
        },
      },
    ],
  };

  const [
    newBasket,
    newInquiries,
    notContacted,
    toReview,
    followUps,
    samples,
    basketDates,
    inquiryDates,
    basketCount,
    pendingApps,
    basketRows,
    inquiryRows,
    appRows,
    activity,
    recentInquiries,
    recentApps,
    sentMail,
    productCount,
    supplierCount,
    partnerCount,
    buyerCount,
    latestInquiries,
    undelivered,
  ] = await Promise.all([
    db.quoteRequest.count({ where: { stage: "NEW" } }),
    db.inquiry.count({ where: { status: "NEW" } }),
    db.quoteRequestSupplier.count({ where: { outreachStatus: "NOT_CONTACTED", quoteRequest: { stage: openStages } } }),
    db.quoteRequestSupplier.count({ where: { commercialStatus: { in: ["QUOTE_RECEIVED", "REVIEWING"] } } }),
    db.quoteRequestSupplier.count({ where: { nextActionDue: { lte: endOfToday }, quoteRequest: { stage: openStages } } }),
    db.quoteRequestItem.count({ where: { sampleStatus: { in: ["REQUESTED", "APPROVED", "DISPATCHED"] } } }),
    db.quoteRequest.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    db.inquiry.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    db.quoteRequest.count({ where: basketAttention }),
    db.supplierApplication.count({ where: { status: "PENDING" } }),
    tab === "all" || tab === "basket"
      ? db.quoteRequest.findMany({
          where: basketAttention,
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            _count: { select: { items: true } },
            suppliers: { select: { outreachStatus: true, supplier: { select: { name: true } } } },
          },
        })
      : Promise.resolve([]),
    tab === "all" || tab === "product"
      ? db.inquiry.findMany({
          where: { status: "NEW" },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            name: true,
            company: true,
            email: true,
            kind: true,
            createdAt: true,
            product: { select: { title: true, supplier: { select: { name: true } } } },
          },
        })
      : Promise.resolve([]),
    tab === "all" || tab === "applications"
      ? db.supplierApplication.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 10 })
      : Promise.resolve([]),
    db.quoteActivity.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { quoteRequest: { select: { id: true, reference: true } } },
    }),
    db.inquiry.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, createdAt: true, product: { select: { title: true } } } }),
    db.supplierApplication.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, createdAt: true, companyName: true, type: true } }),
    db.notificationOutbox.findMany({ where: { status: "SENT" }, orderBy: { sentAt: "desc" }, take: 6, select: { id: true, sentAt: true, subject: true } }),
    db.product.count({ where: { supplier: { status: { not: "DISABLED" } } } }),
    db.supplier.count({ where: { status: { not: "DISABLED" } } }),
    db.supplier.count({ where: { isPartner: true, status: { not: "DISABLED" } } }),
    db.user.count({ where: { role: "BRAND" } }),
    db.inquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        status: true,
        createdAt: true,
        product: {
          select: {
            id: true,
            title: true,
            category: { select: { name: true } },
            images: { take: 1, orderBy: { sortOrder: "asc" }, select: { url: true } },
          },
        },
      },
    }),
    db.notificationOutbox.count({ where: { status: { in: ["PENDING", "FAILED", "SENDING"] }, attempts: { lt: MAX_ATTEMPTS } } }),
  ]);

  const kpis: { label: string; n: number; icon: AdminIconName; href: string; spark?: number[]; highlight?: boolean }[] = [
    {
      label: "New basket requests",
      n: newBasket,
      icon: "cart",
      href: "/admin/quotes",
      spark: buckets(basketDates.map((d) => d.createdAt), since, range),
      highlight: true,
    },
    {
      label: "New product-page requests",
      n: newInquiries,
      icon: "box",
      href: "/admin/inquiries",
      spark: buckets(inquiryDates.map((d) => d.createdAt), since, range),
    },
    { label: "Suppliers not contacted", n: notContacted, icon: "users", href: "/admin/quotes?view=suppliers" },
    { label: "Quotes to review", n: toReview, icon: "message", href: "/admin/quotes?view=outreach" },
    { label: "Follow-ups due today", n: followUps, icon: "clock", href: "/admin/quotes?view=outreach" },
    { label: "Samples in progress", n: samples, icon: "file", href: "/admin/quotes?view=samples" },
  ];

  const td = "py-3.5 pr-3";
  type Row = { key: string; date: Date; node: React.ReactNode };
  const rows: Row[] = [
    ...basketRows.map((r) => ({
      key: `b-${r.id}`,
      date: r.createdAt,
      node: (
        <>
          <td className={td}>
            <Link href={`/admin/quotes/${r.id}`} className="font-mono text-[13px] font-medium text-orange-ink hover:underline">
              {r.reference ?? r.id.slice(0, 8)}
            </Link>
            <span className="block text-xs text-ink-muted">
              {r._count.items} item{r._count.items === 1 ? "" : "s"}
            </span>
          </td>
          <td className={td}>
            <TypeChip icon="cart" label="Basket" />
          </td>
          <td className={td}>
            <span className="block font-medium text-ink">{r.companyName || r.contactName || "—"}</span>
            <span className="block text-xs text-ink-muted">{r.contactEmail}</span>
          </td>
          <td className={`${td} text-xs`}>
            {r.suppliers.slice(0, 2).map((s) => (
              <span key={s.supplier.name} className="mb-1 block">
                <span className="block text-[13px] text-ink">{s.supplier.name}</span>
                <RfqChip value={s.outreachStatus} />
              </span>
            ))}
            {r.suppliers.length > 2 ? <span className="text-ink-muted">+{r.suppliers.length - 2} more</span> : null}
          </td>
          <td className={td}>
            <RfqChip value={r.stage} />
          </td>
          <td className={`${td} text-xs text-ink-muted`}>{day(r.createdAt)}</td>
          <td className="py-3.5 text-right">
            <OpenLink href={`/admin/quotes/${r.id}`} label="Open request" />
          </td>
        </>
      ),
    })),
    ...inquiryRows.map((q) => ({
      key: `p-${q.id}`,
      date: q.createdAt,
      node: (
        <>
          <td className={td}>
            <Link href="/admin/inquiries" className="font-mono text-[13px] font-medium text-orange-ink hover:underline">
              #{inquiryReference(q.id)}
            </Link>
            <span className="block text-xs text-ink-muted">{q.kind === "SAMPLE" ? "Sample" : "1 product"}</span>
          </td>
          <td className={td}>
            <TypeChip icon="box" label="Product" />
          </td>
          <td className={td}>
            <span className="block font-medium text-ink">{q.company || q.name}</span>
            <span className="block text-xs text-ink-muted">{q.email}</span>
          </td>
          <td className={`${td} text-[13px]`}>
            {q.product.supplier.name}
            <span className="block max-w-[220px] truncate text-xs text-ink-muted">{q.product.title}</span>
          </td>
          <td className={td}>
            <RfqChip value="NEW" />
          </td>
          <td className={`${td} text-xs text-ink-muted`}>{day(q.createdAt)}</td>
          <td className="py-3.5 text-right">
            <OpenLink href="/admin/inquiries" label="Open product requests" />
          </td>
        </>
      ),
    })),
    ...appRows.map((a) => ({
      key: `a-${a.id}`,
      date: a.createdAt,
      node: (
        <>
          <td className={td}>
            <Link href={`/admin/applications/${a.id}`} className="font-mono text-[13px] font-medium text-orange-ink hover:underline">
              {a.reference}
            </Link>
            <span className="block text-xs text-ink-muted">
              {a.type === "PRODUCT_FETCH" ? "Fetch products" : a.type === "PARTNERSHIP" ? "Partnership" : "Listing"}
            </span>
          </td>
          <td className={td}>
            <TypeChip icon="user" label="Supplier" />
          </td>
          <td className={td}>
            <span className="block font-medium text-ink">{a.companyName}</span>
            <span className="block text-xs text-ink-muted">{a.contactEmail}</span>
          </td>
          <td className={`${td} text-xs text-ink-muted`}>{a.website.replace(/^https?:\/\/(www\.)?/, "")}</td>
          <td className={td}>
            <RfqChip value="PENDING" />
          </td>
          <td className={`${td} text-xs text-ink-muted`}>{day(a.createdAt)}</td>
          <td className="py-3.5 text-right">
            <OpenLink href={`/admin/applications/${a.id}`} label="Open application" />
          </td>
        </>
      ),
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10);

  const activityKind = (kind: string): [AdminIconName, string] => {
    if (kind === "request.created") return ["cart", "New basket request"];
    if (kind.startsWith("outreach")) return ["send", "Supplier outreach"];
    if (kind.startsWith("quote")) return ["message", "Quote recorded"];
    if (kind.startsWith("item")) return ["sample", "Sample update"];
    return ["quote", "Request updated"];
  };
  const feed = [
    ...activity.map((a) => {
      const [icon, action] = activityKind(a.kind);
      return {
        id: `q-${a.id}`,
        at: a.createdAt,
        icon,
        action,
        details:
          a.quoteRequest.reference && !a.message.includes(a.quoteRequest.reference)
            ? `${a.quoteRequest.reference} · ${a.message}`
            : a.message,
        href: `/admin/quotes/${a.quoteRequest.id}`,
      };
    }),
    ...recentInquiries.map((q) => ({
      id: `i-${q.id}`,
      at: q.createdAt,
      icon: "box" as AdminIconName,
      action: "New product-page request",
      details: q.product.title,
      href: "/admin/inquiries",
    })),
    ...recentApps.map((a) => ({
      id: `a-${a.id}`,
      at: a.createdAt,
      icon: "users" as AdminIconName,
      action: a.type === "PARTNERSHIP" ? "Partnership request" : a.type === "PRODUCT_FETCH" ? "Product fetch request" : "Supplier application",
      details: a.companyName,
      href: `/admin/applications/${a.id}`,
    })),
    ...sentMail
      .filter((m) => m.sentAt)
      .map((m) => ({ id: `m-${m.id}`, at: m.sentAt!, icon: "mail" as AdminIconName, action: "Email sent", details: m.subject, href: "/admin/notifications" })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 8);

  const tabHref = (t: Tab) => {
    const qs = new URLSearchParams();
    if (range !== 30) qs.set("range", String(range));
    if (t !== "all") qs.set("tab", t);
    const s = qs.toString();
    return `/admin${s ? `?${s}` : ""}#attention`;
  };
  const tabCounts: Record<Tab, number> = {
    all: basketCount + newInquiries + pendingApps,
    basket: basketCount,
    product: newInquiries,
    applications: pendingApps,
  };
  const viewAll = (href: string) => (
    <Link href={href} className="flex items-center gap-1.5 text-sm font-semibold text-orange-ink hover:text-orange">
      View all <AdminIcon name="arrowRight" size={16} />
    </Link>
  );

  return (
    <AdminShell active="dashboard" title="Dashboard" hideHeader>
      {/* Welcome band */}
      <div className="relative -mx-4 -mt-8 mb-6 min-h-[190px] overflow-hidden px-4 pb-6 pt-8 sm:-mx-8 sm:px-8">
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-[52%] md:block">
          <div className="absolute inset-0 bg-[radial-gradient(80%_120%_at_65%_45%,#efe5d8_0%,#f6f4f1_72%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#f6f4f1_0%,rgba(246,244,241,0)_30%)]" />
          <span className="absolute bottom-0 left-[18%] block h-[84%] w-[16%]">
            <Image src="/hero/still-glass-bottle.webp" alt="" fill sizes="140px" className="object-contain object-bottom opacity-90" />
          </span>
          <span className="absolute bottom-0 left-[31%] block h-[62%] w-[20%]">
            <Image src="/hero/still-amber-jar.webp" alt="" fill sizes="180px" className="object-contain object-bottom drop-shadow-[0_18px_18px_rgba(120,60,10,.25)]" />
          </span>
          <span className="absolute bottom-0 left-[47%] block h-[80%] w-[24%]">
            <Image src="/hero/kraft-pouch.webp" alt="" fill sizes="200px" className="object-contain object-bottom" />
          </span>
          <p className="absolute bottom-7 right-[5%] max-w-[150px] font-serif text-[15px] leading-snug text-ink-body">
            More packaging opportunities for real brands.
          </p>
        </div>
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">Dashboard</p>
            <h1 className="mt-2 font-serif text-[40px] leading-[1.05] tracking-[-0.01em] text-ink sm:text-[46px]">Welcome back, Team</h1>
            <p className="mt-2 font-serif text-[19px] text-ink-body">Here&rsquo;s what&rsquo;s happening on Aekobaba.</p>
          </div>
          <div className="relative z-10">
            <RangeSelect value={range} />
          </div>
        </div>
      </div>

      {undelivered > 0 ? (
        <p className="mb-5 rounded-xl border border-orange/40 bg-orange-tint px-4 py-3 text-sm text-orange-ink">
          {undelivered} team email{undelivered === 1 ? "" : "s"} waiting to be sent
          {emailConfigured() ? "" : " — email sending isn't set up yet (RESEND_API_KEY and EMAIL_FROM)"}.{" "}
          <Link href="/admin/notifications" className="font-medium underline">
            Email outbox
          </Link>
        </p>
      ) : null}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6">
        {kpis.map((k) => (
          <Link
            key={k.label}
            href={k.href}
            className={`group flex flex-col rounded-2xl border p-5 transition-shadow hover:shadow-[0_8px_24px_-12px_rgba(24,26,33,.25)] ${
              k.highlight ? "border-orange/30 bg-[linear-gradient(160deg,#fff1e5_0%,#fff8f2_100%)]" : "border-[#ebe7e1] bg-white"
            }`}
          >
            <span className="flex items-center justify-between">
              <AdminIcon name={k.icon} size={24} className={k.highlight ? "text-orange" : "text-ink"} />
              <AdminIcon name="chevronRight" size={18} className="text-ink-muted transition-transform group-hover:translate-x-0.5" />
            </span>
            <span className="mt-5 text-[28px] font-semibold tabular-nums leading-none tracking-tight text-ink">{k.n}</span>
            <span className="mt-2 text-sm text-ink-body">{k.label}</span>
            {k.spark ? <Sparkline values={k.spark} tone={k.highlight ? "orange" : "grey"} /> : null}
          </Link>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-5">
          <AdminCard id="attention" title="Requests needing attention" action={viewAll("/admin/quotes")}>
            <nav aria-label="Request types" className="-mt-1 flex gap-6 overflow-x-auto border-b border-[#ebe7e1] text-sm">
              {(
                [
                  ["all", "All"],
                  ["basket", "Basket requests"],
                  ["product", "Product requests"],
                  ["applications", "Supplier applications"],
                ] as [Tab, string][]
              ).map(([t, text]) => (
                <Link
                  key={t}
                  href={tabHref(t)}
                  aria-current={tab === t ? "page" : undefined}
                  className={`-mb-px flex flex-none items-center gap-2 border-b-2 pb-3 ${
                    tab === t ? "border-orange font-medium text-orange-ink" : "border-transparent text-ink-body hover:text-ink"
                  }`}
                >
                  {text}
                  <span
                    className={`rounded-md px-1.5 text-[11px] font-semibold ${tab === t ? "bg-orange-tint text-orange-ink" : "bg-[#f3f1ee] text-ink-muted"}`}
                  >
                    {tabCounts[t]}
                  </span>
                </Link>
              ))}
            </nav>
            {rows.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-muted">All caught up — nothing is waiting on the team.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ink-muted">
                      <th className="py-3 pr-3 font-medium">Reference</th>
                      <th className="py-3 pr-3 font-medium">Type</th>
                      <th className="py-3 pr-3 font-medium">Customer</th>
                      <th className="py-3 pr-3 font-medium">Suppliers</th>
                      <th className="py-3 pr-3 font-medium">Status</th>
                      <th className="py-3 pr-3 font-medium">Received</th>
                      <th className="py-3">
                        <span className="sr-only">Open</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ede8] border-t border-[#f0ede8]">
                    {rows.map((r) => (
                      <tr key={r.key} className="align-top hover:bg-[#fbfaf8]">
                        {r.node}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>

          <AdminCard title="Recent activity" action={viewAll("/admin/quotes?view=activity")}>
            {feed.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-muted">No activity yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ink-muted">
                      <th className="w-[90px] py-2.5 pr-3 font-medium">Time</th>
                      <th className="w-[250px] py-2.5 pr-3 font-medium">Action</th>
                      <th className="py-2.5 font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ede8] border-t border-[#f0ede8]">
                    {feed.map((f) => (
                      <tr key={f.id} className="hover:bg-[#fbfaf8]">
                        <td className="py-3 pr-3 text-xs text-ink-muted">{ago(f.at, now)}</td>
                        <td className="py-3 pr-3">
                          <Link href={f.href} className="flex items-center gap-2.5 text-ink hover:underline">
                            <AdminIcon name={f.icon} size={18} className={f.icon === "cart" ? "text-orange" : "text-ink"} />
                            {f.action}
                          </Link>
                        </td>
                        <td className="max-w-[420px] truncate py-3 text-ink-body">{f.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>
        </div>

        <div className="min-w-0 space-y-5">
          <AdminCard
            title="Marketplace overview"
            action={
              <Link href="/admin/suppliers" aria-label="Supplier verification" className="text-ink-muted hover:text-ink">
                <AdminIcon name="arrowRight" size={18} />
              </Link>
            }
          >
            <div className="grid grid-cols-[minmax(0,140px)_1fr] gap-4">
              <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-[radial-gradient(90%_90%_at_40%_30%,#f3ece3_0%,#e5dacb_100%)]">
                <span className="absolute bottom-2 left-[4%] block h-[82%] w-[42%]">
                  <Image src="/hero/still-glass-bottle.webp" alt="" fill sizes="70px" className="object-contain object-bottom" />
                </span>
                <span className="absolute bottom-2 right-[2%] block h-[62%] w-[58%]">
                  <Image src="/hero/kraft-pouch.webp" alt="" fill sizes="90px" className="object-contain object-bottom" />
                </span>
              </div>
              <div className="grid grid-cols-2 content-center gap-x-3 gap-y-6">
                {(
                  [
                    ["box", productCount, "Live products", "/results"],
                    ["building", supplierCount, "Suppliers", "/admin/suppliers"],
                    ["link", partnerCount, "Partners", "/partners"],
                    ["users", buyerCount, "Buyer accounts", "/admin/quotes"],
                  ] as [AdminIconName, number, string, string][]
                ).map(([icon, n, text, href]) => (
                  <Link key={text} href={href} className="flex gap-2.5 hover:opacity-80">
                    <AdminIcon name={icon} size={20} className="mt-1 flex-none text-ink" />
                    <span>
                      <span className="block text-2xl font-semibold tabular-nums leading-none tracking-tight text-ink">{n.toLocaleString("en-US")}</span>
                      <span className="mt-1.5 block text-xs text-ink-muted">{text}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </AdminCard>

          <AdminCard title="Latest product-page requests" action={viewAll("/admin/inquiries?status=ALL")}>
            {latestInquiries.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">None yet.</p>
            ) : (
              <ul className="divide-y divide-[#f0ede8]">
                {latestInquiries.map((q) => {
                  const img = q.product.images[0]?.url ?? null;
                  return (
                    <li key={q.id} className="flex items-center gap-3 py-3">
                      <span className="relative flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-lg border border-[#ebe7e1] bg-[#f7f5f2]">
                        {img ? (
                          <Image src={img} alt="" fill sizes="48px" className="object-contain p-1 mix-blend-multiply" />
                        ) : (
                          <AdminIcon name="box" size={20} className="text-ink-muted" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <Link href={`/products/${q.product.id}`} className="block truncate text-sm font-medium text-ink hover:underline">
                          {q.product.title}
                        </Link>
                        <span className="block truncate text-xs text-ink-muted">{q.product.category.name}</span>
                      </span>
                      <RfqChip value={q.status === "NEW" ? "NEW" : q.status === "CONTACTED" ? "REVIEWING" : "COMPLETED"} />
                      <span className="hidden w-[76px] flex-none text-right text-xs text-ink-muted sm:block">{day(q.createdAt)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </AdminCard>
        </div>
      </div>
    </AdminShell>
  );
}
