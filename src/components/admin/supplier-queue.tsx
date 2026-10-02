import Link from "next/link";

import { TierSelect } from "./tier-select";
import { FilterTabs, StatusChip, WorkspaceShell } from "@/components/workspace/shell";
import type { GateResult } from "@/lib/admin/gates";

// Admin verification queue — presentational. Each supplier is one row: who
// they are, a four-cell gate scorecard readable at a glance, the current
// tier and the tier control. The evidence behind every verdict expands in
// place; the scorecard is the evidence, the tier is still the admin's call.
//
// The page (src/app/admin/suppliers/page.tsx) owns auth, queries and gates.

export const QUEUE_STATUSES = ["PENDING", "QUOTE_ONLY", "LISTED", "RECOMMENDED", "DISABLED"] as const;
export type QueueStatus = (typeof QUEUE_STATUSES)[number];

const STATUS_LABEL: Record<QueueStatus, string> = {
  PENDING: "Pending",
  QUOTE_ONLY: "Quote only",
  LISTED: "Listed",
  RECOMMENDED: "Recommended",
  DISABLED: "Disabled",
};

export interface QueueRow {
  id: string;
  slug: string;
  name: string;
  location: string;
  website: string | null;
  status: QueueStatus;
  lastVerifiedAt: Date | null;
  gates: GateResult[];
  passed: number;
}

const GATE_STYLE: Record<GateResult["status"], { cell: string; word: string }> = {
  pass: { cell: "bg-success-tint text-success-ink border-success-ink/25", word: "Pass" },
  fail: { cell: "bg-danger-tint text-danger-ink border-danger-ink/25", word: "Fail" },
  manual: { cell: "bg-warning-tint text-warning-ink border-warning-ink/25", word: "Review" },
};

function host(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function SupplierQueue({ rows, filter }: { rows: QueueRow[]; filter: QueueStatus | "ALL" }) {
  const countBy = (status: QueueStatus) => rows.filter((r) => r.status === status).length;
  const visible = filter === "ALL" ? rows : rows.filter((r) => r.status === filter);
  const pending = countBy("PENDING");

  return (
    <WorkspaceShell
      area="admin"
      active="suppliers"
      title="Supplier verification"
      subtitle={
        pending === 0
          ? "No suppliers are waiting for verification."
          : `${pending} supplier${pending === 1 ? "" : "s"} pending verification.`
      }
    >
      <FilterTabs
        tabs={[
          { href: "/admin/suppliers", label: "All", count: rows.length, active: filter === "ALL" },
          ...QUEUE_STATUSES.map((status) => ({
            href: `/admin/suppliers?status=${status.toLowerCase()}`,
            label: STATUS_LABEL[status],
            count: countBy(status),
            active: filter === status,
          })),
        ]}
      />

      <div className="mt-4 hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-6 px-5 py-2 lg:grid">
        <span className="tag text-ink-faint">Supplier</span>
        <span className="tag text-ink-faint">Verification gates</span>
        <span className="tag w-[280px] text-ink-faint">Tier</span>
      </div>

      {visible.length === 0 ? (
        <p className="mt-6 border border-dashed border-line px-6 py-12 text-center text-sm text-ink-muted">
          No suppliers with this status.
        </p>
      ) : (
        <ul className="space-y-3 lg:mt-0">
          {visible.map((row) => (
            <li key={row.id} data-testid="queue-row" className="border border-line bg-card">
              <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] lg:items-center lg:gap-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href={`/suppliers/${row.slug}`}
                      className="truncate text-base font-medium text-ink underline decoration-transparent underline-offset-4 hover:decoration-orange"
                    >
                      {row.name}
                    </Link>
                    <StatusChip tone={row.status.toLowerCase() as never}>{STATUS_LABEL[row.status]}</StatusChip>
                  </div>
                  <p className="mt-1.5 text-xs text-ink-muted">
                    {row.location}
                    {row.website ? (
                      <>
                        {" · "}
                        <a href={row.website} target="_blank" rel="noopener noreferrer" className="hover:text-ink hover:underline">
                          {host(row.website)}
                        </a>
                      </>
                    ) : null}
                    {row.lastVerifiedAt
                      ? ` · verified ${row.lastVerifiedAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`
                      : " · never verified"}
                  </p>
                </div>

                <div>
                  <ol className="grid grid-cols-4 gap-1" aria-label={`${row.passed} gates pass`}>
                    {row.gates.map((gate) => (
                      <li
                        key={gate.number}
                        title={`Gate ${gate.number}: ${gate.name} — ${GATE_STYLE[gate.status].word}`}
                        className={`border px-2 py-1.5 ${GATE_STYLE[gate.status].cell}`}
                      >
                        <span className="tag block">G{gate.number}</span>
                        <span className="mt-1 block text-xs">{GATE_STYLE[gate.status].word}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-1.5 text-xs text-ink-faint tabular-nums">{row.passed} of 3 assessable gates pass</p>
                </div>

                <div className="lg:w-[280px]">
                  <TierSelect supplierId={row.id} currentTier={row.status} />
                </div>
              </div>

              <details className="group border-t border-line">
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-2.5 text-xs text-ink-muted hover:text-ink [&::-webkit-details-marker]:hidden">
                  Gate evidence
                  <span aria-hidden className="transition-transform group-open:rotate-180">
                    ▾
                  </span>
                </summary>
                <dl className="grid gap-px border-t border-line bg-line md:grid-cols-2">
                  {row.gates.map((gate) => (
                    <div key={gate.number} className="bg-card px-5 py-3">
                      <dt className="flex items-center justify-between gap-3 text-sm text-ink">
                        <span>
                          <span className="tag mr-2 text-ink-faint">G{gate.number}</span>
                          {gate.name}
                        </span>
                        <span className={`tag shrink-0 border px-1.5 py-1 ${GATE_STYLE[gate.status].cell}`}>
                          {GATE_STYLE[gate.status].word}
                        </span>
                      </dt>
                      <dd className="mt-1.5 text-xs leading-relaxed text-ink-muted">{gate.evidence}</dd>
                    </div>
                  ))}
                </dl>
              </details>
              <p className="sr-only">Tier assignment is the admin&apos;s call; this scorecard is the evidence, not the decision.</p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs text-ink-faint">
        Tier assignment is the admin&rsquo;s call — the scorecard is the evidence, not the decision.
      </p>
    </WorkspaceShell>
  );
}
