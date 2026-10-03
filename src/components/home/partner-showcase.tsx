"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { InquiryDialog, type InquiryDialogHandle } from "@/components/catalog/inquiry-dialog";
import { ProductPicture } from "@/components/catalog/product-picture";
import { formatCaptureDate, formatMoney } from "@/lib/catalog/format";
import type { PartnerProfile } from "@/lib/catalog/partners";
import type { ProductVM } from "@/lib/catalog/view-models";

// Featured partner showcase — the first section after the hero. A deep-navy
// band on the hero's grid: the partner's sourced facts and services on the
// left, and a spotlight turntable on the right that cycles through their
// real listings (price, basis, capture date) every few seconds. Hover or
// focus pauses it; reduced-motion users get a still, steppable display.

const ADVANCE_MS = 4200;

function shortTitle(title: string): { name: string; sku: string | null } {
  const [name, sku] = title.split(" — ");
  return { name: name ?? title, sku: sku ?? null };
}

export function PartnerShowcase({
  profile,
  products,
}: {
  profile: PartnerProfile;
  products: ProductVM[];
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const dialog = useRef<InquiryDialogHandle>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (paused || reduced || products.length < 2) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % products.length), ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [paused, reduced, products.length]);

  if (products.length === 0) return null;
  const current = products[index % products.length];
  const { name, sku } = shortTitle(current.title);

  return (
    <section
      data-testid="partner-showcase"
      aria-labelledby="partner-showcase-title"
      className="tone-dark relative overflow-hidden border-b border-line-dark bg-navy text-on-dark lg:grid lg:grid-cols-[var(--rail-w)_minmax(0,max(38.6vw,500px))_minmax(0,1fr)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(40% 60% at 78% 45%, rgba(245,102,22,.16), transparent 70%)",
        }}
      />

      {/* Rail */}
      <aside className="relative hidden border-r border-line-dark lg:block">
        <div className="flex flex-col pl-[var(--edge)] pr-3 pt-[30px]">
          <span aria-hidden className="block h-10 w-px bg-on-dark/40" />
          <p className="tag mt-[31px] flex items-center gap-2 text-[12.5px] tracking-[0.12em] text-on-dark">
            <span aria-hidden className="h-[9px] w-[9px] bg-orange" />
            Featured partner
          </p>
          <p className="mt-4 max-w-[10rem] text-[13.5px] leading-[1.4] text-on-dark-muted">
            One of the first suppliers to join Aekobaba.
          </p>
        </div>
      </aside>

      {/* Story */}
      <div className="relative px-5 py-14 sm:px-8 lg:py-[4.2vw] lg:pl-[max(32px,3.4vw)] lg:pr-[2vw]">
        <p className="tag flex items-center gap-[18px] text-[12.5px] tracking-[0.12em] text-on-dark-muted lg:hidden">
          <span aria-hidden className="h-[1.5px] w-[30px] bg-orange" />
          Featured partner
        </p>
        <p className="tag flex items-center gap-[18px] text-[12.5px] tracking-[0.12em] text-on-dark-muted max-lg:mt-4">
          <span aria-hidden className="hidden h-[1.5px] w-[30px] bg-orange lg:inline-block" />
          {profile.tagline}
        </p>
        <h2
          id="partner-showcase-title"
          className="mt-5 text-[clamp(2.6rem,5vw,6rem)] font-extrabold leading-[0.92] tracking-[-0.045em] text-on-dark"
        >
          {profile.name}
        </h2>
        <p className="mt-5 max-w-[540px] text-[clamp(1rem,1.05vw,1.15rem)] leading-[1.5] text-on-dark-muted">
          {profile.summary}
        </p>

        <dl className="mt-9 grid max-w-[560px] grid-cols-3 border-y border-line-dark">
          {profile.facts.map((fact, i) => (
            <div
              key={fact.label}
              className={`py-4 ${i > 0 ? "border-l border-line-dark pl-4" : "pr-4"}`}
            >
              <dt className="sr-only">{fact.label}</dt>
              <dd>
                <span className="block text-[clamp(1.6rem,2.2vw,2.4rem)] font-semibold leading-none tracking-[-0.03em] text-on-dark tabular-nums">
                  {fact.value}
                </span>
                <span className="mt-2 block text-xs leading-snug text-on-dark-muted">
                  {fact.label}
                </span>
                <a
                  href={fact.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-block text-[11px] text-on-dark-muted/70 underline decoration-on-dark/20 underline-offset-2 hover:text-on-dark"
                >
                  {fact.sourceName}
                </a>
              </dd>
            </div>
          ))}
        </dl>

        <ul className="mt-7 grid max-w-[560px] gap-4 sm:grid-cols-2">
          {profile.services.map((service) => (
            <li key={service.title} className="border-l-2 border-orange pl-4">
              <p className="text-sm font-semibold text-on-dark">{service.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-on-dark-muted">{service.body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link
            href={`/suppliers/${profile.slug}`}
            className="inline-flex h-12 items-center gap-2 bg-orange px-6 text-sm font-medium text-white transition-colors hover:bg-orange-hi"
          >
            Explore {profile.name}
            <svg
              aria-hidden
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            >
              <path d="M4 12h15M13 6l6 6-6 6" />
            </svg>
          </Link>
          <button
            type="button"
            onClick={() => dialog.current?.open("QUOTE")}
            className="inline-flex h-12 items-center border border-on-dark/30 px-6 text-sm font-medium text-on-dark transition-colors hover:border-on-dark"
          >
            Get a quote
          </button>
        </div>
        {profile.perks.map((perk) => (
          <p key={perk.text} className="mt-4 text-xs text-on-dark-muted">
            {perk.text} ·{" "}
            <a
              href={perk.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-on-dark/20 underline-offset-2 hover:text-on-dark"
            >
              source
            </a>
          </p>
        ))}
      </div>

      {/* Spotlight turntable */}
      <div
        className="relative flex min-h-[460px] flex-col px-5 pb-8 sm:px-8 lg:min-h-0 lg:py-[3vw] lg:pr-[var(--edge)]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div className="relative min-h-[300px] flex-1" aria-live="polite">
          {/* Spot + plinth disc. */}
          <div
            aria-hidden
            className="absolute inset-x-[8%] bottom-[6%] top-[4%]"
            style={{
              background:
                "radial-gradient(45% 55% at 50% 45%, rgba(255,236,214,.16), transparent 72%)",
            }}
          />
          <div
            aria-hidden
            className="absolute bottom-[5%] left-1/2 h-[9%] w-[58%] -translate-x-1/2 rounded-[50%]"
            style={{
              background:
                "radial-gradient(closest-side, rgba(255,255,255,.12), rgba(255,255,255,.03) 70%, transparent)",
            }}
          />
          {products.map((product, i) => {
            const active = i === index % products.length;
            return (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                aria-hidden={!active}
                tabIndex={active ? 0 : -1}
                className={`absolute inset-x-[14%] bottom-[8%] top-[2%] block transition-[opacity,transform] duration-700 ease-out ${
                  active
                    ? "translate-y-0 scale-100 opacity-100"
                    : "pointer-events-none translate-y-4 scale-95 opacity-0"
                }`}
              >
                {product.primaryImage ? (
                  <ProductPicture
                    src={product.primaryImage.url}
                    alt={`${product.title} — representative image`}
                    sizes="(min-width: 1024px) 30vw, 80vw"
                    className="object-bottom"
                  />
                ) : null}
              </Link>
            );
          })}
        </div>

        {/* Spec plate for the product in the light. */}
        <div className="relative mt-4 border border-line-dark bg-surface/70 p-5 backdrop-blur-[2px]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="tag text-on-dark-muted">
                {current.categoryName}
                {sku ? (
                  <span className="ml-2 font-mono normal-case tracking-normal">#{sku}</span>
                ) : null}
              </p>
              <Link
                href={`/products/${current.id}`}
                className="mt-2 block text-base font-medium leading-snug text-on-dark hover:underline"
              >
                {name}
              </Link>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-2xl font-semibold tracking-tight text-on-dark tabular-nums">
                {current.basePrice === null ? "Ask" : formatMoney(current.basePrice)}
              </p>
              <p className="mt-1 max-w-[11rem] text-[11px] leading-snug text-on-dark-muted">
                {current.basePrice === null ? "the supplier" : current.priceBasis}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-on-dark-muted">
            Verified from{" "}
            <a
              href={current.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-on-dark underline decoration-on-dark/30 underline-offset-2"
            >
              {profile.name}&rsquo;s page
            </a>{" "}
            on {formatCaptureDate(current.sourceCapturedAt)} · Representative image
          </p>
        </div>

        {/* Steps */}
        <div
          className="mt-4 flex items-center gap-1.5"
          role="tablist"
          aria-label={`${profile.name} products`}
        >
          {products.map((product, i) => {
            const active = i === index % products.length;
            return (
              <button
                key={product.id}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={shortTitle(product.title).name}
                onClick={() => setIndex(i)}
                className="group relative h-6 flex-1"
              >
                <span
                  className={`absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 ${active ? "bg-orange" : "bg-on-dark/20 group-hover:bg-on-dark/50"}`}
                />
              </button>
            );
          })}
        </div>
      </div>

      <InquiryDialog ref={dialog} product={current} />
    </section>
  );
}
