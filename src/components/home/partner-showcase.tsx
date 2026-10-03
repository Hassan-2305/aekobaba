"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { InquiryDialog, type InquiryDialogHandle } from "@/components/catalog/inquiry-dialog";
import { cutoutFor, isRepresentativeImage } from "@/components/catalog/product-picture";
import { formatCaptureDate, formatMoney, formatMoq } from "@/lib/catalog/format";
import type { PartnerProfile } from "@/lib/catalog/partners";
import type { ProductVM } from "@/lib/catalog/view-models";

// The Packaging Stage — an interactive product showcase, not a carousel.
//
// One product is the hero at centre; its neighbours wait in a shallow
// perspective orbit, smaller and dimmer. Choosing another product moves the
// whole collection around the stage (spring-eased translate + scale +
// opacity — no 3D spins) until that product is the hero. As it settles, its
// technical blueprint emerges: orange anchors, thin leader lines, and the
// facts we verified on the supplier's page. The spec plate below rebuilds —
// the price counts to the new value. A thin runway at the bottom shows the
// collection; click, drag, arrows and keyboard all move it.

const IDLE_ADVANCE_MS = 8000;

// Orbit slots relative to the hero (0): x/y as % of stage, scale, opacity.
const SLOTS: Record<number, { x: number; y: number; s: number; o: number; b: number; z: number }> =
  {
    [-3]: { x: -56, y: 8, s: 0.28, o: 0, b: 0.5, z: 0 },
    [-2]: { x: -40, y: 7, s: 0.44, o: 0.4, b: 0.62, z: 1 },
    [-1]: { x: -22, y: 4, s: 0.64, o: 0.7, b: 0.78, z: 2 },
    [0]: { x: 0, y: 0, s: 1, o: 1, b: 1, z: 3 },
    [1]: { x: 22, y: 4, s: 0.64, o: 0.7, b: 0.78, z: 2 },
    [2]: { x: 40, y: 7, s: 0.44, o: 0.4, b: 0.62, z: 1 },
    [3]: { x: 56, y: 8, s: 0.28, o: 0, b: 0.5, z: 0 },
  };

function shortTitle(title: string): { name: string; sku: string | null } {
  const [name, sku] = title.split(" — ");
  return { name: name ?? title, sku: sku ?? null };
}

/** What we can state about the closure from the supplier's own wording. */
function closureNote(product: ProductVM): string {
  const text = `${product.title} ${product.description ?? ""}`;
  const finish = /(\d{2}-\d{3})/.exec(text)?.[1];
  if (/cap not included|sold separately/i.test(text))
    return finish ? `${finish} · sold separately` : "Sold separately";
  if (/includes .*cap|cap\)|\(.*cap\)/i.test(text)) return "Included";
  return "Ask the supplier";
}

function capacity(product: ProductVM): string | null {
  return /(\d+(?:\.\d+)?\s?(?:oz|ml|l)\b)/i.exec(product.title)?.[1]?.replace(/\s+/g, " ") ?? null;
}

function materialShort(product: ProductVM): string {
  return (
    product.material
      .split(/[,(]/)[0]
      .replace(/\bplastic\b/i, "")
      .trim() || product.material
  );
}

/** Price that counts to its new value when the hero changes. */
function useCountingPrice(value: number | null, reduced: boolean): number | null {
  const [shown, setShown] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (value === null || from === null || reduced) {
      setShown(value);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 650);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(from + (value - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);
  return shown;
}

export function PartnerShowcase({
  profile,
  products,
}: {
  profile: PartnerProfile;
  products: ProductVM[];
}) {
  const n = products.length;
  const [cur, setCur] = useState(0);
  const [idle, setIdle] = useState(true);
  const [reduced, setReduced] = useState(false);
  const dialog = useRef<InquiryDialogHandle>(null);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Gentle idle advance; any interaction holds it for a while.
  useEffect(() => {
    if (!idle || reduced || n < 2) return;
    const timer = window.setInterval(() => setCur((c) => (c + 1) % n), IDLE_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [idle, reduced, n]);
  const touch = (next: (c: number) => number) => {
    setIdle(false);
    setCur((c) => ((next(c) % n) + n) % n);
    window.clearTimeout((touch as unknown as { t?: number }).t);
    (touch as unknown as { t?: number }).t = window.setTimeout(() => setIdle(true), 20000);
  };

  const current = products[cur] ?? products[0];
  const shownPrice = useCountingPrice(current?.basePrice ?? null, reduced);
  if (n === 0) return null;

  const { name, sku } = shortTitle(current.title);
  const cap = capacity(current);
  const material = materialShort(current);
  const real = current.primaryImage ? !isRepresentativeImage(current.primaryImage.url) : false;
  const closure = closureNote(current);

  return (
    <section
      data-testid="partner-showcase"
      aria-labelledby="partner-showcase-title"
      className="tone-dark relative overflow-hidden border-b border-line-dark bg-navy text-on-dark"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") touch((c) => c + 1);
        if (e.key === "ArrowLeft") touch((c) => c - 1);
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(40% 50% at 50% 42%, rgba(255,224,196,.13), transparent 70%), radial-gradient(55% 35% at 50% 100%, rgba(245,102,22,.12), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-[1400px] px-5 pb-10 pt-10 sm:px-8 lg:px-[var(--edge)] lg:pt-12">
        {/* Header line */}
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="tag flex items-center gap-2 text-[12px] tracking-[0.12em] text-on-dark-muted">
              <span aria-hidden className="h-[9px] w-[9px] bg-orange" />
              Supplier spotlight
            </p>
            <h2
              id="partner-showcase-title"
              className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-on-dark sm:text-4xl"
            >
              {profile.name}
            </h2>
            <span aria-hidden className="mt-3 block h-[2px] w-16 bg-orange" />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-on-dark-muted">
              A closer look at one of our packaging partners.
            </p>
          </div>
          <p
            className="shrink-0 font-mono text-sm text-on-dark-muted tabular-nums"
            aria-live="polite"
          >
            {String(cur + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
          </p>
        </div>

        {/* The stage */}
        <div
          role="group"
          aria-roledescription="product stage"
          aria-label={`${profile.name} products`}
          className="relative mt-2 h-[clamp(320px,36vw,520px)] touch-pan-y select-none [container-type:size]"
          style={{ ["--hero" as string]: "clamp(190px, 23vw, 350px)" }}
          onPointerDown={(e) => {
            drag.current = { x: e.clientX, moved: false };
          }}
          onPointerMove={(e) => {
            if (!drag.current || drag.current.moved) return;
            const dx = e.clientX - drag.current.x;
            if (Math.abs(dx) > 48) {
              drag.current.moved = true;
              touch((c) => c + (dx < 0 ? 1 : -1));
            }
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        >
          {/* Floor line + spot */}
          <div
            aria-hidden
            className="absolute inset-x-[8%] top-[86%] h-px bg-gradient-to-r from-transparent via-on-dark/25 to-transparent"
          />
          <div
            aria-hidden
            className="absolute left-1/2 top-[81%] h-[10%] w-[30%] -translate-x-1/2 rounded-[50%]"
            style={{
              background: "radial-gradient(closest-side, rgba(255,234,210,.22), transparent)",
            }}
          />

          {products.map((product, i) => {
            let rel = i - cur;
            if (rel > n / 2) rel -= n;
            if (rel < -n / 2) rel += n;
            const slot = SLOTS[Math.max(-3, Math.min(3, rel))];
            const hero = rel === 0;
            const src = product.primaryImage
              ? (cutoutFor(product.primaryImage.url) ?? product.primaryImage.url)
              : null;
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => {
                  if (drag.current?.moved) return;
                  if (hero) dialog.current?.open("QUOTE");
                  else touch(() => i);
                }}
                aria-label={
                  hero
                    ? `Get a quote for ${shortTitle(product.title).name}`
                    : `Show ${shortTitle(product.title).name}`
                }
                tabIndex={Math.abs(rel) <= 2 ? 0 : -1}
                className={`absolute left-1/2 top-[46%] block transition-[transform,opacity,filter] duration-[950ms] ease-[cubic-bezier(.22,1.15,.36,1)] motion-reduce:transition-none ${
                  hero ? "cursor-zoom-in" : "cursor-pointer"
                }`}
                style={{
                  width: "var(--hero)",
                  height: "var(--hero)",
                  transform: `translate(calc(-50% + ${slot.x}cqw), calc(-50% + ${slot.y}cqh)) scale(${slot.s})`,
                  opacity: slot.o,
                  filter: `brightness(${slot.b})`,
                  zIndex: slot.z,
                }}
              >
                {src ? (
                  <Image
                    src={src}
                    alt={hero ? (product.primaryImage?.alt ?? product.title) : ""}
                    fill
                    priority={hero}
                    sizes="(min-width: 1024px) 24vw, 60vw"
                    className="object-contain object-bottom drop-shadow-[0_30px_26px_rgba(0,0,0,.5)]"
                  />
                ) : null}

                {/* Blueprint: anchors and leaders, drawn when this product is the hero. */}
                {hero ? (
                  <span
                    key={product.id}
                    aria-hidden
                    className="pointer-events-none absolute inset-0 hidden sm:block"
                  >
                    <svg
                      className="absolute inset-0 h-full w-full overflow-visible text-on-dark/60"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      <polyline
                        points="52,9 70,-6 118,-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                        className="stage-draw"
                        style={{ animationDelay: "250ms" }}
                      />
                      <polyline
                        points="34,56 14,56 -24,56"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                        className="stage-draw"
                        style={{ animationDelay: "550ms" }}
                      />
                      <polyline
                        points="50,96 50,112"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                        className="stage-draw"
                        style={{ animationDelay: "850ms" }}
                      />
                    </svg>
                    <span
                      className="stage-pop absolute left-[52%] top-[9%] h-[8px] w-[8px] -translate-x-1/2 -translate-y-1/2 bg-orange"
                      style={{ animationDelay: "200ms" }}
                    />
                    <span
                      className="stage-pop absolute left-[34%] top-[56%] h-[8px] w-[8px] -translate-x-1/2 -translate-y-1/2 bg-orange"
                      style={{ animationDelay: "500ms" }}
                    />
                    <span
                      className="stage-pop absolute left-1/2 top-[96%] h-[8px] w-[8px] -translate-x-1/2 -translate-y-1/2 bg-orange"
                      style={{ animationDelay: "800ms" }}
                    />
                    <span className="absolute left-[120%] top-[-6%] -translate-y-1/2 whitespace-nowrap text-left">
                      <span className="stage-fade block" style={{ animationDelay: "500ms" }}>
                        <span className="tag block text-on-dark-muted">Cap</span>
                        <span className="mt-1 block text-[13px] text-on-dark">{closure}</span>
                      </span>
                    </span>
                    <span className="absolute right-[134%] top-[56%] -translate-y-1/2 whitespace-nowrap text-right">
                      <span className="stage-fade block" style={{ animationDelay: "800ms" }}>
                        <span className="tag block text-on-dark-muted">
                          {cap ? "Capacity · material" : "Material"}
                        </span>
                        <span className="mt-1 block text-[13px] text-on-dark">
                          {[cap, material].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </span>
                    <span className="absolute left-1/2 top-[114%] -translate-x-1/2 whitespace-nowrap text-center">
                      <span className="stage-fade block" style={{ animationDelay: "1100ms" }}>
                        <span className="tag block text-on-dark-muted">Web price</span>
                        <span className="mt-1 block text-[13px] text-on-dark tabular-nums">
                          {product.basePrice === null
                            ? "Ask the supplier"
                            : `${formatMoney(product.basePrice)} / unit`}
                        </span>
                      </span>
                    </span>
                  </span>
                ) : null}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => touch((c) => c - 1)}
            aria-label="Previous product"
            className="absolute left-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-on-dark/20 text-on-dark/70 transition-colors hover:border-orange hover:text-on-dark"
          >
            <svg
              aria-hidden
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M20 12H5M11 6l-6 6 6 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => touch((c) => c + 1)}
            aria-label="Next product"
            className="absolute right-0 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-on-dark/20 text-on-dark/70 transition-colors hover:border-orange hover:text-on-dark"
          >
            <svg
              aria-hidden
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M4 12h15M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>

        {/* Spec plate — rebuilds for the hero. */}
        <div
          key={current.id}
          className="stage-fade mx-auto mt-4 max-w-[640px] text-center"
          aria-live="polite"
        >
          <p className="tag text-on-dark-muted">
            {material} · {current.categoryName} · {profile.name}
            {sku ? (
              <span className="ml-2 font-mono normal-case tracking-normal text-on-dark">
                #{sku}
              </span>
            ) : null}
          </p>
          <Link
            href={`/products/${current.id}`}
            className="mt-2 block text-xl font-semibold leading-snug text-on-dark hover:underline sm:text-2xl"
          >
            {name}
          </Link>
          <p className="mt-4 text-4xl font-semibold tracking-tight text-on-dark tabular-nums">
            {shownPrice === null ? "Ask the supplier" : formatMoney(shownPrice)}
          </p>
          <p className="mt-1 text-xs text-on-dark-muted">
            {current.basePrice === null ? "No web price shown" : current.priceBasis}
          </p>

          <dl className="mx-auto mt-5 grid max-w-[360px] grid-cols-2 border-y border-line-dark">
            <div className="py-3 pr-4">
              <dt className="tag text-on-dark-muted">MOQ</dt>
              <dd className="mt-1 text-sm text-on-dark tabular-nums">
                {formatMoq(current.moq, current.moqUnit)}
              </dd>
            </div>
            <div className="border-l border-line-dark py-3 pl-4">
              <dt className="tag text-on-dark-muted">Cap</dt>
              <dd className="mt-1 text-sm text-on-dark">{closure}</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => dialog.current?.open("QUOTE")}
              className="inline-flex h-11 items-center gap-2 bg-orange px-6 text-sm font-medium text-white transition-colors hover:bg-orange-hi"
            >
              Get a quote
              <svg
                aria-hidden
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => dialog.current?.open("SAMPLE")}
              className="inline-flex h-11 items-center border border-on-dark/30 px-5 text-sm font-medium text-on-dark transition-colors hover:border-on-dark"
            >
              Get a sample
            </button>
          </div>
          <p className="mt-4 text-[11px] text-on-dark-muted">
            Verified from{" "}
            <a
              href={current.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-on-dark underline decoration-on-dark/30 underline-offset-2"
            >
              {profile.name}&rsquo;s page
            </a>{" "}
            on {formatCaptureDate(current.sourceCapturedAt)} ·{" "}
            {real ? "Supplier photo" : "Representative image"}
          </p>
        </div>

        {/* Runway */}
        <div className="relative mx-auto mt-8 max-w-[640px]">
          <div aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-on-dark/20" />
          <div
            role="tablist"
            aria-label="Products on stage"
            className="relative flex justify-between"
          >
            {products.map((product, i) => {
              const active = i === cur;
              return (
                <button
                  key={product.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={shortTitle(product.title).name}
                  onClick={() => touch(() => i)}
                  className="group relative flex h-8 w-8 items-center justify-center"
                >
                  <span
                    className={`block transition-all duration-500 ${
                      active
                        ? "h-3 w-3 -translate-y-px bg-orange"
                        : "h-2 w-2 border border-on-dark/50 bg-navy group-hover:border-orange"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Partner line */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-line-dark pt-5 text-xs text-on-dark-muted">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {profile.facts.map((fact) => (
              <li key={fact.label} className="flex items-baseline gap-1.5">
                <span className="font-semibold text-on-dark tabular-nums">{fact.value}</span>
                <span>{fact.label}</span>
                <a
                  href={fact.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={fact.sourceName}
                  className="text-[10px] uppercase tracking-[0.1em] text-on-dark-muted/60 hover:text-on-dark hover:underline"
                >
                  src
                </a>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-5">
            {profile.services[0] ? (
              <a
                href={profile.services[0].sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-on-dark"
              >
                {profile.services[0].title}: design at no charge in exchange for packaging business
              </a>
            ) : null}
            <Link
              href={`/suppliers/${profile.slug}`}
              className="text-on-dark underline decoration-orange underline-offset-4 hover:text-orange-ink"
            >
              All {profile.name} listings →
            </Link>
          </div>
        </div>
      </div>

      <InquiryDialog ref={dialog} product={current} />
    </section>
  );
}
