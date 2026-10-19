"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { SponsoredTag } from "@/components/catalog/tier-badge";
import { cutoutFor } from "@/components/catalog/product-picture";
import { useBasketHydrated } from "@/lib/basket/use-basket";
import { useQuoteBasketStore } from "@/lib/basket/store";
import { formatCaptureDate, formatMoqShort, formatUnitMoney, unitPrice } from "@/lib/catalog/format";
import type { ProductVM } from "@/lib/catalog/view-models";

// Client islands for the v12 home: tab switchers (panels are server-rendered
// and passed in) and the partner spotlight carousel.

/** Pill tabs over server-rendered panels. */
export function TabbedPanels({
  tabs,
  panels,
  variant = "pills",
  testId,
}: {
  tabs: string[];
  panels: React.ReactNode[];
  variant?: "pills" | "segmented";
  testId?: string;
}) {
  const [active, setActive] = useState(0);
  return (
    <div data-testid={testId}>
      <div
        role="tablist"
        className={
          variant === "segmented"
            ? "inline-flex gap-1 rounded-[9px] bg-well p-[3px]"
            : "no-scrollbar flex justify-start gap-1 overflow-x-auto p-2 sm:justify-center"
        }
      >
        {tabs.map((t, i) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => setActive(i)}
            className={
              variant === "segmented"
                ? `h-[34px] flex-none rounded-[7px] px-3.5 text-[13px] font-medium ${i === active ? "bg-paper shadow-[0_0_0_1px_#DCDFE5,0_1px_2px_rgba(24,26,33,.08)]" : ""}`
                : `h-9 flex-none rounded-full px-3.5 text-sm font-medium ${i === active ? "bg-ink text-paper" : "text-ink hover:bg-well"}`
            }
          >
            {t}
          </button>
        ))}
      </div>
      {panels.map((panel, i) => (
        <div key={i} role="tabpanel" hidden={i !== active}>
          {panel}
        </div>
      ))}
    </div>
  );
}

/** Segmented tabs whose labels sit in the section header (popular products). */
export function HeaderTabs({ tabs, panels, aside }: { tabs: string[]; panels: React.ReactNode[]; aside?: React.ReactNode }) {
  const [active, setActive] = useState(0);
  return (
    <>
      <div className="flex flex-col items-start gap-2.5 lg:items-end">
        <div role="tablist" className="inline-flex gap-1 rounded-[9px] bg-well p-[3px]">
          {tabs.map((t, i) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={`h-[34px] flex-none rounded-[7px] px-3.5 text-[13px] font-medium ${i === active ? "bg-paper shadow-[0_0_0_1px_#DCDFE5,0_1px_2px_rgba(24,26,33,.08)]" : ""}`}
            >
              {t}
            </button>
          ))}
        </div>
        {aside}
      </div>
      <div className="w-full basis-full">
        {panels.map((panel, i) => (
          <div key={i} role="tabpanel" hidden={i !== active}>
            {panel}
          </div>
        ))}
      </div>
    </>
  );
}

/** Partner spotlight (sponsored, labelled): one partner product at a time. */
export function SpotlightCarousel({
  products,
  partnerName,
  partnerSlug,
  logoUrl,
}: {
  products: ProductVM[];
  partnerName: string;
  partnerSlug: string;
  logoUrl: string;
}) {
  const [i, setI] = useState(0);
  const basketReady = useBasketHydrated();
  const basket = useQuoteBasketStore((s) => s.items);
  const addProduct = useQuoteBasketStore((s) => s.addProduct);
  if (products.length === 0) return null;
  const p = products[i % products.length];
  const u = unitPrice(p);
  const img = p.primaryImage ? (cutoutFor(p.primaryImage.url) ?? p.primaryImage.url) : null;
  const line = basketReady ? basket.find((b) => b.product.id === p.id) : undefined;
  const go = (d: number) => setI((x) => (x + d + products.length) % products.length);

  return (
    <div
      data-testid="partner-spotlight"
      className="grid grid-cols-1 overflow-hidden rounded-[18px] border border-[#E8DDC4] border-t-[3px] border-t-partner-accent bg-partner-tint lg:grid-cols-2"
    >
      <div className="flex flex-col p-6 lg:p-10">
        <div className="flex flex-wrap items-center gap-2.5">
          <SponsoredTag />
          <span className="text-[13px] text-ink-body">Partner spotlight · paid placement</span>
          <span className="ml-auto font-mono text-xs text-ink-muted">
            {i + 1} / {products.length}
          </span>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center border border-[#E8DDC4] bg-paper p-[5px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt={`${partnerName} logo`} className="max-h-full max-w-full" />
          </span>
          <span className="text-[15px] font-semibold">{partnerName}</span>
        </div>
        <h3 className="mt-[18px] text-2xl font-semibold leading-tight tracking-[-0.03em] lg:text-[30px]">
          <Link href={`/products/${p.id}`} className="hover:underline">
            {p.title}
          </Link>
        </h3>
        <div className="mt-4 flex flex-wrap items-baseline gap-2">
          {u ? (
            <>
              <b className="text-[34px] tracking-[-0.04em]">{formatUnitMoney(u.amount, u.currency)}</b>
              <span className="text-ink-muted">
                / {u.unit} · {u.currency} · published {formatCaptureDate(p.sourceCapturedAt).replace(/ \d{4}$/, "")}
              </span>
            </>
          ) : (
            <b className="text-2xl">Ask the supplier</b>
          )}
        </div>
        <p className="mt-1.5 text-sm text-ink-body">
          Minimum order {p.moq === null ? "not published" : formatMoqShort(p.moq, p.moqUnit)} · {p.material}
        </p>
        <div className="mt-auto flex flex-wrap gap-2.5 pt-7">
          <button
            type="button"
            onClick={() => addProduct(p)}
            className={`h-12 rounded-[10px] border-[1.5px] px-5 text-[15px] font-semibold ${line ? "border-[#9ED3B5] bg-success-tint text-success-deep" : "border-ink bg-ink text-paper"}`}
          >
            {line ? `✓ In Quote Basket · ${line.quantity.toLocaleString("en-US")}` : "Add to Quote Basket"}
          </button>
          <Link href={`/suppliers/${partnerSlug}`} className="flex h-12 items-center rounded-[10px] border border-ink px-[18px] text-[15px] font-medium">
            View storefront
          </Link>
          <span className="ml-auto flex gap-1.5">
            <button type="button" onClick={() => go(-1)} aria-label="Previous" className="h-12 w-12 rounded-[10px] border border-line-strong bg-paper text-lg">‹</button>
            <button type="button" onClick={() => go(1)} aria-label="Next" className="h-12 w-12 rounded-[10px] border border-line-strong bg-paper text-lg">›</button>
          </span>
        </div>
        <p className="mt-4 text-[13px] text-ink-body">Sponsored placement never changes tiers, prices or organic ranking.</p>
      </div>
      <div className="relative flex min-h-[300px] items-center justify-center bg-[#F3EDE0] lg:min-h-[420px]">
        {img ? (
          <span className="relative block h-[260px] w-[70%] lg:h-[300px]">
            <Image src={img} alt={p.primaryImage?.alt ?? p.title} fill sizes="(min-width: 1024px) 40vw, 80vw" className="object-contain drop-shadow-[0_24px_22px_rgba(24,26,33,.2)]" />
          </span>
        ) : null}
      </div>
    </div>
  );
}
