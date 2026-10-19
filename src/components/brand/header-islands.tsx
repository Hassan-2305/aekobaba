"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { groupBasketBySupplier, useBasketHydrated } from "@/lib/basket/use-basket";
import { useQuoteBasketStore } from "@/lib/basket/store";
import { groupedMenu } from "@/lib/catalog/menu";
import { formatUnitMoney, unitPrice } from "@/lib/catalog/format";
import { useCompareHydrated, useCompareStore } from "@/lib/compare/store";

// Interactive pieces of the v12 header: the "Browse packaging" mega menu,
// the Compare count, the Quote Basket popover and the mobile drawer. The
// rest of the header is server-rendered.

type MenuCounts = { counts: Record<string, number>; products: number | null; suppliers: number | null };

let countsPromise: Promise<MenuCounts> | null = null;
function loadCounts(): Promise<MenuCounts> {
  countsPromise ??= fetch("/api/catalog/menu")
    .then((r) => r.json() as Promise<MenuCounts>)
    .catch(() => ({ counts: {}, products: null, suppliers: null }));
  return countsPromise;
}

/** Close on outside click / Escape. */
function useDismiss(open: boolean, close: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, ref]);
}

const SUGGESTIONS = ["jar", "pouch", "mailer", "label"];

export function MegaMenu() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), ref);

  useEffect(() => {
    if (open) void loadCounts().then((d) => setCounts(d.counts));
  }, [open]);

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return groupedMenu()
      .map(({ group, entries }) => ({
        group,
        entries: entries.filter(
          (e) => !needle || e.name.toLowerCase().includes(needle) || group.name.toLowerCase().includes(needle),
        ),
      }))
      .filter((g) => g.entries.length > 0);
  }, [q]);
  const matches = groups.reduce((n, g) => n + g.entries.length, 0);
  // Four columns: Containers | Closures + Flexible | Paper + Labels | Shipping + Specialty
  const columns = [["containers"], ["closures", "flexible"], ["paper", "labels"], ["shipping", "specialty"]].map((ids) =>
    groups.filter((g) => ids.includes(g.group.id)),
  );

  return (
    <div ref={ref} className="static">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-testid="mega-menu-button"
        className={`flex h-10 flex-none items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-[15px] font-semibold text-ink transition-colors hover:bg-well ${open ? "bg-well" : ""}`}
      >
        Browse packaging
        <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <div
          data-testid="mega-menu"
          className="absolute inset-x-0 top-full z-40 border-b border-line-strong bg-paper px-5 pb-7 pt-6 shadow-[0_28px_48px_-16px_rgba(24,26,33,.22)] lg:px-14"
        >
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex h-[46px] w-full max-w-[440px] items-center gap-2.5 rounded-[10px] border-[1.5px] border-ink px-3.5">
              <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <span className="sr-only">Filter categories</span>
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filter categories…"
                className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none"
              />
            </label>
            <span className="text-sm text-ink-muted">{q ? `${matches} matches` : "Type to filter, or pick below"}</span>
            <Link href="/results" onClick={() => setOpen(false)} className="ml-auto text-sm font-medium text-orange-ink hover:text-orange">
              Browse all products →
            </Link>
          </div>
          {matches === 0 ? (
            <div className="mt-5 flex flex-wrap items-center gap-6 rounded-xl border-[1.5px] border-dashed border-line-strong p-7">
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold tracking-[-0.01em]">No categories match &ldquo;{q}&rdquo;</p>
                <p className="mt-1 text-sm text-ink-muted">Categories use broad names. Try one of these, or search every product for your term.</p>
                <div className="mt-3.5 flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => setQ(s)} className="h-8 rounded-[6px] border border-line-strong bg-paper px-3 text-[13px] font-medium">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <Link
                href={`/results?q=${encodeURIComponent(q)}`}
                onClick={() => setOpen(false)}
                className="flex h-11 items-center rounded-md bg-ink px-[18px] text-sm font-medium text-paper"
              >
                Search products for &ldquo;{q}&rdquo; →
              </Link>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {columns.map((col, i) => (
                <div key={i} className="flex flex-col gap-5">
                  {col.map(({ group, entries }) => (
                    <div key={group.id}>
                      <p className="tag text-ink-muted">{group.name}</p>
                      <div className="mt-2 flex flex-col border-t-[1.5px] border-ink">
                        {entries.map((e) => (
                          <Link
                            key={e.slug}
                            href={`/results?category=${encodeURIComponent(e.slug)}`}
                            onClick={() => setOpen(false)}
                            className="flex items-baseline justify-between gap-3 border-b border-line py-[9px] text-sm text-ink hover:text-orange-ink"
                          >
                            <span>{e.name}</span>
                            <span className="flex-none font-mono text-xs text-ink-muted">
                              {counts[e.slug] === undefined ? "" : counts[e.slug] || "Soon"}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function CompareLink() {
  const hydrated = useCompareHydrated();
  const count = useCompareStore((s) => s.items.length);
  const setOpen = useCompareStore((s) => s.setOpen);
  return (
    <button
      type="button"
      onClick={() => count >= 2 && setOpen(true)}
      data-testid="compare-link"
      className="hidden h-10 items-center gap-2 rounded-md pl-3 pr-2.5 text-sm font-medium text-ink hover:bg-well md:flex"
    >
      Compare
      <span className="inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full border border-line-strong bg-paper px-1.5 text-xs font-bold tabular-nums">
        {hydrated ? count : 0}
      </span>
    </button>
  );
}

export function BasketButton({ compact = false }: { compact?: boolean }) {
  const hydrated = useBasketHydrated();
  const items = useQuoteBasketStore((s) => s.items);
  const setQuantity = useQuoteBasketStore((s) => s.setQuantity);
  const removeItem = useQuoteBasketStore((s) => s.removeItem);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), ref);
  const shown = hydrated ? items : [];
  const groups = groupBasketBySupplier(shown);
  const supWord = `${groups.length} supplier${groups.length === 1 ? "" : "s"}`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-testid="basket-link"
        className={`flex items-center gap-2.5 whitespace-nowrap rounded-[10px] bg-ink text-[15px] font-semibold text-paper ${compact ? "h-11 pl-3 pr-1.5 text-sm" : "h-11 pl-3.5 pr-2"}`}
      >
        <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 9h14l-1.4 10.2a1 1 0 0 1-1 .8H7.4a1 1 0 0 1-1-.8z" /><path d="M9 9V7a3 3 0 0 1 6 0v2" /></svg>
        <span className={compact ? "hidden min-[400px]:inline" : ""}>Quote Basket</span>
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-[7px] bg-orange px-[7px] text-sm font-bold text-on-orange tabular-nums">
          {shown.length}
        </span>
      </button>
      {open ? (
        <div
          data-testid="basket-popover"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(460px,calc(100vw-24px))] overflow-hidden rounded-[14px] border border-line-strong bg-paper shadow-[0_24px_48px_-12px_rgba(24,26,33,.3)]"
        >
          <div className="flex items-center gap-2.5 border-b border-line px-[18px] py-4">
            <div>
              <p className="text-[17px] font-semibold">Quote Basket</p>
              <p className="mt-0.5 text-[13px] text-ink-muted">
                {shown.length ? `${shown.length} product${shown.length === 1 ? "" : "s"} · ${supWord}` : "Nothing added yet"}
              </p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="ml-auto h-9 w-9 rounded-md bg-well text-base">
              ×
            </button>
          </div>
          {shown.length === 0 ? (
            <p className="px-[18px] py-7 text-center text-sm leading-relaxed text-ink-muted">
              Your basket is empty. Add products from any category and supplier; we&rsquo;ll send each supplier only their own items.
            </p>
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              {groups.map((g) => (
                <div key={g.supplierSlug} className="border-b border-line px-[18px] pb-3.5 pt-3">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    {g.supplierName}
                    <span className="text-xs text-success-deep">✓ Verified</span>
                    <span className="ml-auto text-xs font-medium text-ink-muted">
                      Gets {g.items.length} product{g.items.length === 1 ? "" : "s"}
                    </span>
                  </p>
                  {g.items.map(({ product, quantity }) => {
                    const u = unitPrice(product);
                    return (
                      <div key={product.id} className="mt-2.5 grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2.5">
                        <div className="min-w-0">
                          <Link href={`/products/${product.id}`} className="block truncate text-sm font-medium leading-tight hover:underline">
                            {product.title}
                          </Link>
                          <p className="text-xs text-ink-muted">
                            {u ? `${formatUnitMoney(u.amount, u.currency)} / ${u.unit} published` : "Price on request"}
                          </p>
                        </div>
                        <input
                          value={quantity}
                          onChange={(e) => setQuantity(product.id, Number(e.target.value.replace(/[^0-9]/g, "")) || 1)}
                          inputMode="numeric"
                          aria-label={`Quantity for ${product.title}`}
                          className="h-9 w-[76px] rounded-[6px] border-[1.5px] border-line-strong px-2 text-right text-sm font-medium tabular-nums"
                        />
                        <button type="button" onClick={() => removeItem(product.id)} aria-label="Remove from basket" className="h-8 w-8 rounded-[6px] text-base text-ink-muted hover:bg-well">
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-line bg-[#FAFAFB] px-[18px] py-3.5">
            <p className="text-[13px] leading-snug text-ink-muted">
              One form. Each supplier gets only their own products. Published prices exclude shipping and setup.
            </p>
            <div className="mt-3 flex gap-2">
              <Link href="/basket" onClick={() => setOpen(false)} className="flex h-11 flex-1 items-center justify-center rounded-md border border-ink text-sm font-medium">
                Open basket
              </Link>
              <Link
                href="/basket"
                onClick={() => setOpen(false)}
                aria-disabled={!groups.length}
                className={`flex h-11 flex-[1.7] items-center justify-center rounded-md bg-orange text-sm font-semibold text-on-orange ${groups.length ? "" : "pointer-events-none opacity-40"}`}
              >
                {groups.length ? `Request quotes from ${supWord}` : "Request quotes"} →
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function MobileMenu({ links }: { links: { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(true)} className="flex h-11 w-11 items-center justify-center lg:hidden">
        <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[min(360px,90vw)] flex-col overflow-y-auto bg-paper p-5">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Menu</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="h-10 w-10 rounded-md bg-well text-lg">×</button>
            </div>
            <form action="/results" role="search" className="mt-4 flex h-12 items-center gap-2 rounded-[10px] border-2 border-ink px-3" onSubmit={() => setOpen(false)}>
              <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <label htmlFor="mobile-search" className="sr-only">Search packaging</label>
              <input id="mobile-search" name="q" type="search" placeholder="Search packaging" className="min-w-0 flex-1 bg-transparent text-base outline-none" />
            </form>
            <nav className="mt-4 flex flex-col">
              {links.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="border-b border-line py-3 text-base font-medium">
                  {l.label}
                </Link>
              ))}
            </nav>
            <p className="tag mt-6 text-ink-muted">Browse packaging</p>
            {groupedMenu().map(({ group, entries }) => (
              <details key={group.id} className="border-b border-line py-2">
                <summary className="cursor-pointer list-none py-1.5 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">{group.name}</summary>
                <div className="flex flex-col pb-1">
                  {entries.map((e) => (
                    <Link key={e.slug} href={`/results?category=${encodeURIComponent(e.slug)}`} onClick={() => setOpen(false)} className="py-1.5 pl-2 text-sm text-ink-muted">
                      {e.name}
                    </Link>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
