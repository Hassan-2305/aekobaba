import Link from "next/link";

import { TierBadge } from "@/components/catalog/tier-badge";
import { FilterTabs, WorkspaceShell } from "@/components/workspace/shell";
import { LeadItemActions } from "./lead-item-actions";
import type { InboxLeadGroup, InboxLeadItem } from "@/lib/supplier/inbox";
import type { SupplierStatusValue } from "@/lib/catalog/view-models";

// Supplier lead inbox — presentational. Requests arrive as cards: the brand's
// brief on the left (when it was sent, when it is needed by, artwork notes),
// the requested line items on the right with quantity checked against the
// published minimum, the listed price, and the answer actions. Open requests
// sort to the top of the attention order via the Open tab.
//
// The page (src/app/supplier/inbox/page.tsx) owns auth and queries.

export type InboxView = "all" | "open" | "answered";

export interface SupplierInboxProps {
  supplier: { name: string; status: SupplierStatusValue; slug: string; responseTimeHours: number | null };
  groups: InboxLeadGroup[];
  view: InboxView;
  /** Injected for deterministic deadline maths in tests. */
  now: Date;
}

const DAY = 24 * 60 * 60 * 1000;

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function priceLine(product: InboxLeadItem["product"]): string {
  if (product.priceType === "QUOTE_ONLY" || product.basePrice === null) return "Ask the supplier";
  return `$${product.basePrice.toFixed(2)}${product.priceBasis ? ` ${product.priceBasis}` : ""}`;
}

/** Deadline urgency from the brand's "needed by" date. */
export function deadlineState(deadline: Date | null, now: Date): { label: string; tone: "danger" | "warning" | "calm" } | null {
  if (!deadline) return null;
  const days = Math.ceil((deadline.getTime() - now.getTime()) / DAY);
  if (days < 0) return { label: `Overdue by ${-days} day${days === -1 ? "" : "s"}`, tone: "danger" };
  if (days === 0) return { label: "Due today", tone: "danger" };
  if (days <= 7) return { label: `Due in ${days} day${days === 1 ? "" : "s"}`, tone: "warning" };
  return { label: `Due in ${days} days`, tone: "calm" };
}

const isOpen = (group: InboxLeadGroup) => group.items.some((item) => item.status === "SENT");

export function SupplierInbox({ supplier, groups, view, now }: SupplierInboxProps) {
  const items = groups.flatMap((g) => g.items);
  const openItems = items.filter((i) => i.status === "SENT").length;
  const quoted = items.filter((i) => i.status === "QUOTED").length;
  const declined = items.filter((i) => i.status === "DECLINED").length;
  const openGroups = groups.filter(isOpen);
  const answeredGroups = groups.filter((g) => !isOpen(g));
  const visible = view === "open" ? openGroups : view === "answered" ? answeredGroups : groups;

  const kpis = [
    { label: "Open line items", value: String(openItems), signal: openItems > 0 },
    { label: "Requests received", value: String(groups.length), signal: false },
    { label: "Quoted / declined", value: `${quoted} / ${declined}`, signal: false },
    {
      label: "Median first response",
      value: supplier.responseTimeHours === null ? "—" : `${supplier.responseTimeHours} h`,
      signal: false,
    },
  ];

  return (
    <WorkspaceShell
      area="supplier"
      active="inbox"
      title="Lead inbox"
      subtitle={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link href={`/suppliers/${supplier.slug}`} className="text-ink underline decoration-ink/20 underline-offset-4 hover:decoration-orange">
            {supplier.name}
          </Link>
          <TierBadge status={supplier.status} />
        </span>
      }
    >
      <dl data-testid="inbox-kpis" className="grid grid-cols-2 border border-line bg-card lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <div
            key={kpi.label}
            className={`p-5 ${i % 2 === 1 ? "border-l border-line" : ""} ${i >= 2 ? "border-t border-line lg:border-t-0" : ""} ${
              i === 2 ? "lg:border-l" : ""
            }`}
          >
            <dt className="tag text-ink-faint">{kpi.label}</dt>
            <dd
              className={`mt-3 font-semiwide text-3xl font-light tabular-nums tracking-tight ${
                kpi.signal ? "text-orange-ink" : "text-ink"
              }`}
            >
              {kpi.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-10">
        <FilterTabs
          tabs={[
            { href: "/supplier/inbox", label: "All requests", count: groups.length, active: view === "all" },
            { href: "/supplier/inbox?view=open", label: "Needs an answer", count: openGroups.length, active: view === "open" },
            { href: "/supplier/inbox?view=answered", label: "Answered", count: answeredGroups.length, active: view === "answered" },
          ]}
        />
      </div>

      {visible.length === 0 ? (
        <div data-testid="inbox-empty" className="mt-8 border border-dashed border-line px-8 py-14 text-center">
          <p className="font-semiwide text-xl font-light text-ink">
            {groups.length === 0 ? "No leads yet" : view === "open" ? "Everything is answered" : "Nothing here yet"}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            {groups.length === 0
              ? "When a brand adds your products to a quote request, it arrives here grouped by that request."
              : "Switch tabs to see the rest of your requests."}
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-5">
          {visible.map((group) => {
            const due = deadlineState(group.request.deadline, now);
            const open = isOpen(group);
            return (
              <article
                key={group.request.id}
                data-testid="inbox-request"
                className={`grid border bg-card lg:grid-cols-[260px_minmax(0,1fr)] ${open ? "border-line" : "border-line opacity-90"}`}
              >
                <header className="relative border-b border-line bg-paper/60 p-5 lg:border-b-0 lg:border-r">
                  {open ? <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-orange" /> : null}
                  <p className="tag text-ink-faint">Quote request</p>
                  <p className="mt-2 font-mono text-sm text-ink" title={group.request.id}>
                    #{group.request.id.slice(-8).toUpperCase()}
                  </p>
                  <dl className="mt-5 space-y-3 text-sm">
                    <div>
                      <dt className="text-xs text-ink-faint">Received</dt>
                      <dd className="text-ink tabular-nums">{formatDate(group.request.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-faint">Needed by</dt>
                      <dd className="flex flex-wrap items-center gap-2 text-ink tabular-nums">
                        {formatDate(group.request.deadline)}
                        {due ? (
                          <span
                            className={`tag px-1.5 py-1 ${
                              due.tone === "danger"
                                ? "bg-danger-tint text-danger-ink"
                                : due.tone === "warning"
                                  ? "bg-warning-tint text-warning-ink"
                                  : "bg-paper text-ink-muted"
                            }`}
                          >
                            {due.label}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                  </dl>
                  {group.request.artworkNotes ? (
                    <blockquote className="mt-5 border-l-2 border-line pl-3 text-xs leading-relaxed text-ink-muted">
                      <span className="tag mb-1 block text-ink-faint">Artwork notes</span>
                      {group.request.artworkNotes}
                    </blockquote>
                  ) : null}
                </header>

                <ul className="divide-y divide-line">
                  {group.items.map((item) => {
                    const belowMoq = item.product.moq !== null && item.quantity < item.product.moq;
                    return (
                      <li
                        key={item.id}
                        data-testid="inbox-item"
                        className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-snug text-ink">{item.product.title}</p>
                          <p className="mt-1 text-xs text-ink-faint">{item.product.material}</p>
                          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs">
                            <div>
                              <dt className="tag text-ink-faint">Quantity</dt>
                              <dd className="mt-1 text-sm text-ink tabular-nums">{item.quantity.toLocaleString("en-US")}</dd>
                            </div>
                            <div>
                              <dt className="tag text-ink-faint">Your MOQ</dt>
                              <dd className="mt-1 text-sm text-ink tabular-nums">
                                {item.product.moq === null ? "—" : item.product.moq.toLocaleString("en-US")}
                              </dd>
                            </div>
                            <div>
                              <dt className="tag text-ink-faint">Listed price</dt>
                              <dd className="mt-1 text-sm text-ink tabular-nums">{priceLine(item.product)}</dd>
                            </div>
                          </dl>
                          {belowMoq ? (
                            <p className="mt-3 inline-block bg-warning-tint px-2 py-1 text-xs text-warning-ink">
                              Requested quantity is below your published minimum.
                            </p>
                          ) : null}
                        </div>
                        <div className="md:justify-self-end">
                          {item.status === "SENT" ? (
                            <LeadItemActions itemId={item.id} />
                          ) : (
                            <span
                              className={`tag inline-flex items-center gap-1.5 px-2 py-1.5 ${
                                item.status === "QUOTED" ? "bg-success-tint text-success-ink" : "bg-paper text-ink-muted"
                              }`}
                            >
                              {item.status === "QUOTED" ? "Quoted" : item.status === "DECLINED" ? "Declined" : item.status}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </article>
            );
          })}
        </div>
      )}
    </WorkspaceShell>
  );
}

/** Shown to a signed-in supplier user who does not own a listing yet. */
export function SupplierInboxUnclaimed() {
  return (
    <WorkspaceShell area="supplier" active="inbox" title="Lead inbox" subtitle="Quote leads from brands arrive here once you own a listing.">
      <div className="grid gap-8 border border-line bg-card p-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="font-semiwide text-2xl font-light text-ink">Claim your company to start receiving leads</p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
            Brands are already browsing listings built from your public product pages. Claim yours to answer their
            quote requests, keep prices current and earn a verified tier.
          </p>
        </div>
        <Link
          href="/supplier/claim"
          className="inline-flex h-11 items-center justify-center bg-orange px-6 text-sm font-medium text-on-orange transition-colors hover:bg-orange-hi"
        >
          Claim a listing
        </Link>
      </div>
    </WorkspaceShell>
  );
}
