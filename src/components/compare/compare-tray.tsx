"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { SponsoredTag } from "@/components/catalog/tier-badge";
import { cutoutFor } from "@/components/catalog/product-picture";
import { useBasketHydrated } from "@/lib/basket/use-basket";
import { useQuoteBasketStore } from "@/lib/basket/store";
import { formatMoney, formatUnitMoney, priceCurrency, unitPrice } from "@/lib/catalog/format";
import { compareRows, missingCount } from "@/lib/compare/rows";
import { COMPARE_MAX, useCompareHydrated, useCompareStore } from "@/lib/compare/store";

// The compare tray (v12): appears once anything is selected. The dark bar
// shows the four slots and the two actions; "Compare selected" opens the
// side-by-side table above it. Lowest price is highlighted only within the
// same unit and currency; unpublished values are marked, never zero.

const STRIPE = "repeating-linear-gradient(135deg,#F3F4F7 0 6px,#FFFFFF 6px 12px)";

export function CompareTray() {
  const hydrated = useCompareHydrated();
  const basketReady = useBasketHydrated();
  const items = useCompareStore((s) => s.items);
  const open = useCompareStore((s) => s.open);
  const setOpen = useCompareStore((s) => s.setOpen);
  const remove = useCompareStore((s) => s.remove);
  const clearAll = useCompareStore((s) => s.clear);
  const basket = useQuoteBasketStore((s) => s.items);
  const addProduct = useQuoteBasketStore((s) => s.addProduct);
  const [diffOnly, setDiffOnly] = useState(false);

  const rows = useMemo(() => compareRows(items), [items]);
  if (!hydrated || items.length === 0) return null;

  const n = items.length;
  const inBasket = (id: string) => basketReady && basket.some((b) => b.product.id === id);
  const notInBasket = items.filter((p) => !inBasket(p.id));
  const suppliers = [...new Set(items.map((p) => p.supplier.name))];
  const showTable = open && n >= 2;
  const shown = diffOnly ? rows.filter((r) => r.differs) : rows;
  const totalMissing = items.reduce((a, _, i) => a + missingCount(rows, i), 0);
  const units = new Set(items.map((p) => `${unitPrice(p)?.unit}|${unitPrice(p)?.currency}`));
  const priceNote =
    units.size > 1
      ? "Units or currencies differ · prices ranked only within the same unit and currency"
      : items.some((p) => p.priceType === "FROM")
        ? "From-prices aren’t ranked against fixed prices"
        : "Same unit and currency · lowest price highlighted";
  const slots = [...items, ...Array.from({ length: COMPARE_MAX - n }, () => null)];
  const thumb = (url: string | undefined) => (url ? (cutoutFor(url) ?? url) : null);

  return (
    <div
      id="compare"
      data-testid="compare-tray"
      className="fixed inset-x-2 bottom-2 z-40 rounded-[14px] border border-line-strong bg-paper shadow-[0_18px_40px_-12px_rgba(24,26,33,.35)] md:inset-x-6 lg:inset-x-14 lg:bottom-4"
    >
      {showTable ? (
        <div data-testid="compare-table" className="max-h-[62vh] overflow-auto rounded-t-[13px]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b-[1.5px] border-ink px-4 py-3">
            <span className="tag text-ink-muted">Compare</span>
            <span className="text-[13px] text-ink-muted">
              {totalMissing} values not published · we&rsquo;ll ask for them in your request
            </span>
            <button
              type="button"
              aria-pressed={diffOnly}
              onClick={() => setDiffOnly((v) => !v)}
              className="flex h-[34px] items-center gap-2 rounded-md border border-line-strong px-3 text-[13px] font-medium"
            >
              <span aria-hidden className={`flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border-[1.5px] border-ink text-[11px] text-paper ${diffOnly ? "bg-ink" : "bg-paper"}`}>
                {diffOnly ? "✓" : ""}
              </span>
              Show differences only
            </button>
            <span className="ml-auto rounded-[6px] bg-orange-tint px-2.5 py-1 text-xs font-medium">{priceNote}</span>
          </div>
          <div className="min-w-[720px]" style={{ display: "grid", gridTemplateColumns: `170px repeat(${COMPARE_MAX}, minmax(0,1fr))` }}>
            <div className="sticky top-0 z-[3] flex items-end border-r border-line bg-paper px-4 py-3.5 shadow-[0_1.5px_0_#181A21]">
              <span className="tag text-ink-muted">Product</span>
            </div>
            {slots.map((p, i) => (
              <div
                key={p?.id ?? `empty-${i}`}
                className="sticky top-0 z-[3] flex min-h-[104px] flex-col gap-1.5 border-r border-line bg-paper p-3.5 shadow-[0_1.5px_0_#181A21]"
                style={{ borderTop: `3px solid ${p ? (p.supplier.isPartner ? "#C9A043" : "#181A21") : "#EAECF0"}` }}
              >
                {p ? (
                  <>
                    <div className="flex gap-2.5">
                      <div className="relative h-[52px] w-[52px] flex-none rounded-[6px] bg-well">
                        {thumb(p.primaryImage?.url) ? (
                          <Image src={thumb(p.primaryImage?.url)!} alt="" fill sizes="52px" className="object-contain p-1.5" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        {p.supplier.isPartner ? <div className="mb-1"><SponsoredTag size="sm" /></div> : null}
                        <Link href={`/products/${p.id}`} className="line-clamp-2 text-[13px] font-semibold leading-tight hover:underline">
                          {p.title}
                        </Link>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      {unitPrice(p) ? (
                        <>
                          <span className="text-base font-semibold">{formatUnitMoney(unitPrice(p)!.amount, unitPrice(p)!.currency)}</span>
                          <span className="text-[13px] text-ink-muted">/ {unitPrice(p)!.unit}</span>
                        </>
                      ) : p.basePrice !== null ? (
                        <span className="text-sm font-semibold">{formatMoney(p.basePrice, priceCurrency(p.priceBasis))} per pack</span>
                      ) : (
                        <span className="text-sm font-semibold">Ask the supplier</span>
                      )}
                      <span className={`ml-auto font-mono text-[11px] ${missingCount(rows, i) ? "text-orange-ink" : "text-success-ink"}`}>
                        {missingCount(rows, i) ? `${missingCount(rows, i)} missing` : "Complete"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => addProduct(p)}
                      className={`h-[34px] rounded-[7px] border text-[13px] font-semibold ${inBasket(p.id) ? "border-[#9ED3B5] bg-success-tint text-success-deep" : "border-ink bg-paper text-ink"}`}
                    >
                      {inBasket(p.id) ? "✓ In Quote Basket" : "+ Add to Quote Basket"}
                    </button>
                  </>
                ) : (
                  <div className="flex flex-1 items-center justify-center rounded-lg border-[1.5px] border-dashed border-line-strong text-[13px] text-ink-muted">
                    + Add a product
                  </div>
                )}
              </div>
            ))}
            {shown.map((row) => (
              <div key={row.key} className="contents">
                <div className={`flex items-center gap-2 border-r border-t border-line px-4 py-[13px] font-mono text-xs font-medium tracking-[0.04em] text-ink-body uppercase ${row.differs ? "bg-[#FFF8F2]" : "bg-[#FAFAFB]"}`}>
                  {row.label}
                  {row.differs ? <span title="Values differ" className="ml-auto h-2 w-2 rounded-full bg-orange" /> : null}
                </div>
                {slots.map((p, i) => {
                  const c = p ? row.cells[i] : null;
                  return (
                    <div
                      key={`${row.key}-${i}`}
                      className="border-r border-t border-line px-4 py-[13px]"
                      style={{
                        background: c?.missing ? STRIPE : c?.lowest ? "#FFF1E5" : "transparent",
                        boxShadow: c?.lowest ? "inset 0 0 0 1.5px #F5C9A6" : "none",
                      }}
                    >
                      {c ? (
                        <>
                          <div className={`flex items-center gap-1.5 ${row.key === "unit-price" ? "text-lg font-semibold" : "text-[15px]"} ${c.missing ? "text-sm text-ink-body" : "text-ink"}`}>
                            {c.missing ? (
                              <span aria-hidden className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border-[1.5px] border-orange-ink text-[11px] font-bold text-orange-ink">?</span>
                            ) : null}
                            {c.value}
                          </div>
                          {c.sub ? <div className={`mt-0.5 text-[13px] ${c.missing ? "text-orange-ink" : "text-ink-muted"}`}>{c.sub}</div> : null}
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
            {diffOnly && shown.length === 0 ? (
              <div className="col-span-full border-t border-line px-4 py-6 text-center text-sm text-ink-muted">
                These products match on every published field.
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line px-4 py-3 text-[13px] text-ink-muted">
            <span className="flex items-center gap-2">
              <span aria-hidden className="flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] border-orange-ink text-[10px] font-bold text-orange-ink">?</span>
              Missing or not included · never counted as zero
            </span>
            <span className="flex items-center gap-2">
              <span aria-hidden className="h-3 w-[18px] border border-[#F5C9A6] bg-orange-tint" />
              Lowest, same unit and currency
            </span>
            <span className="flex items-center gap-2">
              <span aria-hidden className="h-2 w-2 rounded-full bg-orange" />
              Values differ
            </span>
            <Link href="/#faq" className="ml-auto font-medium text-orange-ink">What &ldquo;verified&rdquo; means →</Link>
          </div>
        </div>
      ) : null}

      <div className={`flex flex-wrap items-center gap-3 bg-chrome px-4 py-3 text-on-chrome lg:flex-nowrap lg:gap-4 lg:py-3.5 ${showTable ? "rounded-b-[13px]" : "rounded-[13px]"}`}>
        <div className="min-w-0 flex-1 lg:w-[210px] lg:flex-none">
          <p className="text-[15px] font-semibold">
            {n} of {COMPARE_MAX} selected
          </p>
          <p className="mt-0.5 truncate text-xs text-on-chrome-muted">
            {n === 1 ? "Select 1 more to compare" : `From ${suppliers.length} supplier${suppliers.length === 1 ? "" : "s"}: ${suppliers.join(", ")}`}
          </p>
        </div>
        <div className="order-3 hidden w-full min-w-0 gap-2 md:flex lg:order-none lg:w-auto lg:flex-1">
          {slots.map((p, i) =>
            p ? (
              <div key={p.id} className="relative flex h-[50px] min-w-0 flex-1 items-center gap-2 rounded-lg bg-chrome-raised pl-1.5 pr-[30px]" style={{ borderTop: `2px solid ${p.supplier.isPartner ? "#C9A043" : "#181A21"}` }}>
                <span className="relative h-[38px] w-[38px] flex-none rounded-[5px] bg-paper">
                  {thumb(p.primaryImage?.url) ? <Image src={thumb(p.primaryImage?.url)!} alt="" fill sizes="38px" className="object-contain p-1" /> : null}
                </span>
                <span className="min-w-0 truncate text-xs font-medium">{p.title}</span>
                <button type="button" onClick={() => remove(p.id)} aria-label={`Remove ${p.title}`} className="absolute right-1.5 top-1/2 h-[22px] w-[22px] -translate-y-1/2 rounded-[5px] bg-[#3A3E48] text-[13px] leading-none">
                  ×
                </button>
              </div>
            ) : (
              <div key={`slot-${i}`} className="flex h-[50px] min-w-0 flex-1 items-center justify-center rounded-lg border-[1.5px] border-dashed border-[#4A4E59] text-xs text-on-chrome-muted">
                Empty slot
              </div>
            ),
          )}
        </div>
        <button
          type="button"
          onClick={() => clearAll()}
          aria-label="Clear the comparison"
          className="h-[46px] flex-none rounded-md px-3 text-sm font-medium text-on-chrome-muted underline-offset-4 hover:text-on-chrome hover:underline"
        >
          Clear
        </button>
        <button
          type="button"
          data-testid="compare-toggle"
          disabled={n < 2}
          onClick={() => setOpen(!showTable)}
          className="h-[46px] flex-none rounded-md border-[1.5px] border-on-chrome px-4 text-sm font-semibold disabled:opacity-40"
        >
          {showTable ? "Hide table" : `Compare selected (${n})`}
        </button>
        <button
          type="button"
          disabled={notInBasket.length === 0}
          onClick={() => notInBasket.forEach((p) => addProduct(p))}
          className="flex h-[46px] flex-none items-center gap-2 rounded-md bg-orange px-[18px] text-sm font-semibold text-on-orange disabled:opacity-50"
        >
          {notInBasket.length ? `Add ${notInBasket.length} to Quote Basket` : "✓ All in Quote Basket"}
        </button>
      </div>
    </div>
  );
}
