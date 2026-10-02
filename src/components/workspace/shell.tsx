import Link from "next/link";
import type { ReactNode } from "react";

// Shell for the supplier and admin workspaces: an operational layout — a
// left rail naming the area and its sections (active section marked with the
// orange signal rule), then the work surface. It sits under the global site
// header, so it carries no wordmark of its own. Built entirely on theme
// tokens, so it follows the light / dark switch.

type Area = "supplier" | "admin";

export type WorkspaceSection = "inbox" | "claim" | "suppliers" | "categories";

const NAV: Record<Area, { id: WorkspaceSection; href: string; label: string; hint: string }[]> = {
  supplier: [
    { id: "inbox", href: "/supplier/inbox", label: "Lead inbox", hint: "Quote requests from brands" },
    { id: "claim", href: "/supplier/claim", label: "Claim a listing", hint: "Take ownership of your profile" },
  ],
  admin: [
    { id: "suppliers", href: "/admin/suppliers", label: "Supplier verification", hint: "Gates and tiers" },
    { id: "categories", href: "/admin/categories", label: "Categories", hint: "The browse taxonomy" },
  ],
};

const AREA_LABEL: Record<Area, string> = {
  supplier: "Supplier workspace",
  admin: "Admin console",
};

export function WorkspaceShell({
  area,
  active,
  title,
  subtitle,
  actions,
  children,
}: {
  area: Area;
  active?: WorkspaceSection;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="bg-paper">
      <div className="mx-auto grid max-w-[1400px] lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="border-b border-line lg:min-h-[calc(100vh-57px)] lg:border-b-0 lg:border-r">
          <div className="lg:sticky lg:top-0 lg:px-5 lg:py-8">
            <p className="tag hidden px-3 text-ink-faint lg:block">{AREA_LABEL[area]}</p>
            <nav aria-label={AREA_LABEL[area]} className="flex overflow-x-auto px-5 lg:mt-4 lg:flex-col lg:px-0">
              {NAV[area].map((item) => {
                const isActive = item.id === active;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative shrink-0 px-3 py-3 transition-colors lg:py-2.5 ${
                      isActive ? "text-ink lg:bg-card" : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {isActive ? (
                      <span
                        aria-hidden
                        className="absolute inset-x-3 bottom-0 h-0.5 bg-orange lg:inset-x-auto lg:inset-y-0 lg:left-0 lg:h-auto lg:w-0.5"
                      />
                    ) : null}
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="hidden text-xs text-ink-faint lg:block">{item.hint}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="hidden border-t border-line px-3 pt-5 lg:mt-8 lg:block">
              <Link href="/" className="text-xs text-ink-muted underline decoration-ink/20 underline-offset-4 hover:text-ink">
                View the marketplace
              </Link>
            </div>
          </div>
        </aside>

        <main className="min-w-0 px-5 pb-24 pt-8 sm:px-8 lg:px-12 lg:pt-10">
          <div className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-6">
            <div className="min-w-0">
              <p className="tag text-ink-faint lg:hidden">{AREA_LABEL[area]}</p>
              <h1 className="mt-2 font-semiwide text-3xl font-light leading-[1.05] tracking-[-0.025em] text-ink sm:text-4xl lg:mt-0">
                {title}
              </h1>
              {subtitle ? <div className="mt-2 text-sm text-ink-muted">{subtitle}</div> : null}
            </div>
            {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
          </div>
          <div className="mt-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

/** Status chip shared by queue rows and badges. */
export function StatusChip({
  tone,
  children,
}: {
  tone: "pending" | "listed" | "recommended" | "quote_only" | "quoteonly" | "disabled";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    pending: "border-warning-ink/30 bg-warning-tint text-warning-ink",
    listed: "border-line bg-card text-ink",
    recommended: "border-orange/40 bg-orange-tint text-orange-ink",
    quote_only: "border-line bg-paper text-ink-muted",
    quoteonly: "border-line bg-paper text-ink-muted",
    disabled: "border-danger-ink/30 bg-danger-tint text-danger-ink",
  };
  return (
    <span className={`tag inline-flex items-center border px-2 py-1.5 ${tones[tone] ?? tones.listed}`}>{children}</span>
  );
}

/** Underlined tab strip for server-side (URL) filters. */
export function FilterTabs({
  tabs,
}: {
  tabs: { href: string; label: string; count?: number; active: boolean }[];
}) {
  return (
    <nav aria-label="Filter" className="flex gap-6 overflow-x-auto border-b border-line text-sm">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.active ? "true" : undefined}
          className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 py-3 transition-colors ${
            tab.active ? "border-orange text-ink" : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          {tab.label}
          {tab.count !== undefined ? (
            <span className="text-xs text-ink-faint tabular-nums">{tab.count}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
