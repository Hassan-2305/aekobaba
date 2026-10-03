"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { InquiryDialog, type InquiryDialogHandle } from "@/components/catalog/inquiry-dialog";
import { cutoutFor, isRepresentativeImage } from "@/components/catalog/product-picture";
import { formatCaptureDate, formatMoney, formatMoq } from "@/lib/catalog/format";
import type { PartnerProfile } from "@/lib/catalog/partners";
import type { ProductVM } from "@/lib/catalog/view-models";

// The Packaging Stage, vertical — everything in one screen, no scrolling to
// reach the details.
//
//   | runway (photo tiles) | stage: products on a vertical arc | details |
//
// The hero sits at the centre of the stage; its neighbours wait above and
// below on a gentle arc, smaller and dimmer. Choosing a product moves the
// whole column (spring-eased translate + scale + opacity) until it is the
// hero; its blueprint (orange anchors + leaders) draws in, and the detail
// panel on the right rebuilds — the price counts to its new value. Tiles,
// arrows, ↑ ↓ keys and vertical swipes all move it.

const IDLE_ADVANCE_MS = 8000;

// Orbit slots relative to the hero (0): x/y as % of stage, scale, opacity.
// Vertical arc: the hero sits left of centre; neighbours rise and fall on
// an arc to its right, smaller and dimmer the further they are. x/y in % of
// the stage (container units), scale, opacity, brightness, stacking.
const SLOTS: Record<number, { x: number; y: number; s: number; o: number; b: number; z: number }> =
  {
    [-3]: { x: 40, y: -56, s: 0.18, o: 0, b: 0.5, z: 0 },
    [-2]: { x: 37, y: -36, s: 0.28, o: 0.4, b: 0.6, z: 1 },
    [-1]: { x: 30, y: -17, s: 0.4, o: 0.75, b: 0.78, z: 2 },
    [0]: { x: 2, y: 2, s: 1, o: 1, b: 1, z: 3 },
    [1]: { x: 30, y: 21, s: 0.4, o: 0.75, b: 0.78, z: 2 },
    [2]: { x: 37, y: 40, s: 0.28, o: 0.4, b: 0.6, z: 1 },
    [3]: { x: 40, y: 58, s: 0.18, o: 0, b: 0.5, z: 0 },
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
  const drag = useRef<{ y: number; moved: boolean } | null>(null);
  const holdTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!idle || reduced || n < 2) return;
    const timer = window.setInterval(() => setCur((c) => (c + 1) % n), IDLE_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [idle, reduced, n]);

  const go = (next: (c: number) => number) => {
    setIdle(false);
    setCur((c) => ((next(c) % n) + n) % n);
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => setIdle(true), 20000);
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
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          e.preventDefault();
          go((c) => c + 1);
        }
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
          e.preventDefault();
          go((c) => c - 1);
        }
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(28% 50% at 38% 50%, rgba(255,224,196,.13), transparent 70%), radial-gradient(40% 60% at 80% 50%, rgba(245,102,22,.08), transparent 70%)",
        }}
      />

      <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 gap-8 px-5 py-10 sm:px-8 lg:h-[clamp(600px,calc(100vh-77px),760px)] lg:grid-cols-[88px_minmax(0,1fr)_minmax(340px,420px)] lg:gap-10 lg:px-[var(--edge)] lg:py-12">
        {/* Runway — the collection as real photo tiles. */}
        <div className="order-3 flex min-w-0 flex-col lg:order-none lg:min-h-0">
          <p className="tag hidden text-on-dark-muted lg:block">
            {String(cur + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
          </p>
          <div className="relative mt-0 flex-1 lg:mt-4 lg:min-h-0">
            <div
              aria-hidden
              className="absolute bottom-0 left-[27px] top-0 hidden w-px bg-on-dark/15 lg:block"
            />
            <div
              role="tablist"
              aria-label="Products on stage"
              aria-orientation="vertical"
              className="relative flex gap-2 overflow-x-auto pb-1 lg:h-full lg:flex-col lg:justify-between lg:overflow-visible lg:pb-0"
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
                    onClick={() => go(() => i)}
                    className={`relative h-14 w-14 shrink-0 overflow-hidden border bg-white transition-all duration-500 ${
                      active
                        ? "border-orange shadow-[0_0_0_2px_var(--orange)] lg:translate-x-2"
                        : "border-transparent opacity-55 hover:opacity-100"
                    }`}
                  >
                    {product.primaryImage ? (
                      <Image
                        src={product.primaryImage.url}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-contain p-1"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stage — the vertical arc. */}
        <div
          role="group"
          aria-roledescription="product stage"
          aria-label={`${profile.name} products`}
          className="relative h-[420px] min-w-0 touch-pan-x select-none [container-type:size] lg:h-auto lg:min-h-0"
          style={{ ["--hero" as string]: "min(70cqh, 56cqw)" }}
          onPointerDown={(e) => {
            drag.current = { y: e.clientY, moved: false };
          }}
          onPointerMove={(e) => {
            if (!drag.current || drag.current.moved) return;
            const dy = e.clientY - drag.current.y;
            if (Math.abs(dy) > 40) {
              drag.current.moved = true;
              go((c) => c + (dy < 0 ? 1 : -1));
            }
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        >
          <div
            aria-hidden
            className="absolute left-[52%] top-[84%] h-[8%] w-[40%] -translate-x-1/2 rounded-[50%]"
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
                  else go(() => i);
                }}
                aria-label={
                  hero
                    ? `Get a quote for ${shortTitle(product.title).name}`
                    : `Show ${shortTitle(product.title).name}`
                }
                tabIndex={Math.abs(rel) <= 1 ? 0 : -1}
                className={`absolute left-1/2 top-1/2 block transition-[transform,opacity,filter] duration-[950ms] ease-[cubic-bezier(.22,1.15,.36,1)] motion-reduce:transition-none ${
                  hero ? "cursor-zoom-in" : "cursor-pointer"
                }`}
                style={{
                  width: "var(--hero)",
                  height: "var(--hero)",
                  transform: `translate(calc(-50% + ${slot.x}cqw), calc(-50% + ${slot.y}cqh)) scale(${slot.s})`,
                  opacity: slot.o,
                  filter: `brightness(${slot.b})`,
                  zIndex: slot.z,
                  pointerEvents: slot.o === 0 ? "none" : undefined,
                }}
              >
                {src ? (
                  <Image
                    src={src}
                    alt={hero ? (product.primaryImage?.alt ?? product.title) : ""}
                    fill
                    priority={hero}
                    sizes="(min-width: 1024px) 30vw, 70vw"
                    className="object-contain object-bottom drop-shadow-[0_30px_26px_rgba(0,0,0,.5)]"
                  />
                ) : null}

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
                        points="50,8 30,-2 2,-2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                        className="stage-draw"
                        style={{ animationDelay: "250ms" }}
                      />
                      <polyline
                        points="34,60 14,60 2,60"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        vectorEffect="non-scaling-stroke"
                        className="stage-draw"
                        style={{ animationDelay: "550ms" }}
                      />
                    </svg>
                    <span
                      className="stage-pop absolute left-1/2 top-[8%] h-[8px] w-[8px] -translate-x-1/2 -translate-y-1/2 bg-orange"
                      style={{ animationDelay: "200ms" }}
                    />
                    <span
                      className="stage-pop absolute left-[34%] top-[60%] h-[8px] w-[8px] -translate-x-1/2 -translate-y-1/2 bg-orange"
                      style={{ animationDelay: "500ms" }}
                    />
                    <span className="absolute right-[100%] top-[-2%] -translate-y-1/2 whitespace-nowrap pr-2 text-right">
                      <span className="stage-fade block" style={{ animationDelay: "500ms" }}>
                        <span className="tag block text-on-dark-muted">Cap</span>
                        <span className="mt-1 block text-[13px] text-on-dark">{closure}</span>
                      </span>
                    </span>
                    <span className="absolute right-[100%] top-[60%] -translate-y-1/2 whitespace-nowrap pr-2 text-right">
                      <span className="stage-fade block" style={{ animationDelay: "800ms" }}>
                        <span className="tag block text-on-dark-muted">
                          {cap ? "Capacity · material" : "Material"}
                        </span>
                        <span className="mt-1 block text-[13px] text-on-dark">
                          {[cap, material].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </span>
                  </span>
                ) : null}
              </button>
            );
          })}

          <div className="absolute bottom-0 right-0 z-10 flex flex-col gap-2 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2">
            <button
              type="button"
              onClick={() => go((c) => c - 1)}
              aria-label="Previous product"
              className="flex h-10 w-10 items-center justify-center border border-on-dark/20 bg-navy/60 text-on-dark/70 transition-colors hover:border-orange hover:text-on-dark"
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
                <path d="M12 20V5M6 11l6-6 6 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => go((c) => c + 1)}
              aria-label="Next product"
              className="flex h-10 w-10 items-center justify-center border border-on-dark/20 bg-navy/60 text-on-dark/70 transition-colors hover:border-orange hover:text-on-dark"
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
                <path d="M12 4v15M6 13l6 6 6-6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Details — always in view. */}
        <div className="flex min-w-0 flex-col lg:min-h-0 lg:border-l lg:border-line-dark lg:pl-10">
          <div>
            <p className="tag flex items-center gap-2 text-[12px] tracking-[0.12em] text-on-dark-muted">
              <span aria-hidden className="h-[9px] w-[9px] bg-orange" />
              Supplier spotlight
            </p>
            <div className="mt-4 flex items-center gap-4">
              {/* Partner's own mark (supplied with their photography). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/partners/${profile.slug}/logo.svg`}
                alt={`${profile.name} logo`}
                width={72}
                height={58}
                className="h-[58px] w-auto shrink-0 shadow-[0_10px_24px_-10px_rgba(0,0,0,.6)]"
              />
              <div className="min-w-0">
                <h2
                  id="partner-showcase-title"
                  className="text-3xl font-extrabold leading-none tracking-[-0.04em] text-on-dark"
                >
                  {profile.name}
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-on-dark-muted">{profile.tagline}</p>
              </div>
            </div>
            <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-on-dark-muted">
              <span className="inline-flex items-center gap-1.5 border border-on-dark/20 px-2 py-1 text-on-dark">
                <svg
                  aria-hidden
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>
                Official Aekobaba partner
              </span>
              <span>Photos and prices from {profile.name}</span>
            </p>
          </div>

          <div
            key={current.id}
            className="mt-6 flex flex-1 flex-col border-t border-line-dark pt-6"
            aria-live="polite"
          >
            <p className="stage-fade tag text-on-dark-muted">
              {current.categoryName}
              {sku ? (
                <span className="ml-2 font-mono normal-case tracking-normal text-on-dark">
                  #{sku}
                </span>
              ) : null}
            </p>
            <Link
              href={`/products/${current.id}`}
              className="stage-fade mt-2 block text-xl font-semibold leading-snug text-on-dark hover:underline"
              style={{ animationDelay: "80ms" }}
            >
              {name}
            </Link>

            <div
              className="stage-fade mt-5 flex items-baseline gap-3"
              style={{ animationDelay: "160ms" }}
            >
              <p className="text-[2.6rem] font-semibold leading-none tracking-tight text-on-dark tabular-nums">
                {shownPrice === null ? "Ask" : formatMoney(shownPrice)}
              </p>
              <p className="text-xs leading-snug text-on-dark-muted">
                {current.basePrice === null
                  ? "the supplier — no web price shown"
                  : current.priceBasis}
              </p>
            </div>

            <dl
              className="stage-fade mt-5 grid grid-cols-2 border-y border-line-dark text-sm"
              style={{ animationDelay: "240ms" }}
            >
              <div className="py-3 pr-3">
                <dt className="tag text-on-dark-muted">MOQ</dt>
                <dd className="mt-1 text-on-dark tabular-nums">
                  {formatMoq(current.moq, current.moqUnit)}
                </dd>
              </div>
              <div className="border-l border-line-dark py-3 pl-3">
                <dt className="tag text-on-dark-muted">Cap</dt>
                <dd className="mt-1 text-on-dark">{closure}</dd>
              </div>
              <div className="border-t border-line-dark py-3 pr-3">
                <dt className="tag text-on-dark-muted">Material</dt>
                <dd className="mt-1 text-on-dark">{material}</dd>
              </div>
              <div className="border-l border-t border-line-dark py-3 pl-3">
                <dt className="tag text-on-dark-muted">Capacity</dt>
                <dd className="mt-1 text-on-dark">{cap ?? "See listing"}</dd>
              </div>
            </dl>

            <div
              className="stage-fade mt-5 flex flex-wrap gap-2"
              style={{ animationDelay: "320ms" }}
            >
              <button
                type="button"
                onClick={() => dialog.current?.open("QUOTE")}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 bg-orange px-5 text-sm font-medium text-white transition-colors hover:bg-orange-hi"
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
                className="inline-flex h-11 flex-1 items-center justify-center border border-on-dark/30 px-5 text-sm font-medium text-on-dark transition-colors hover:border-on-dark"
              >
                Get a sample
              </button>
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
              on {formatCaptureDate(current.sourceCapturedAt)} ·{" "}
              {real ? "Supplier photo" : "Representative image"}
            </p>

            <div className="mt-auto pt-6">
              <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-on-dark-muted">
                {profile.facts.map((fact) => (
                  <li key={fact.label}>
                    <a
                      href={fact.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={fact.sourceName}
                      className="hover:text-on-dark"
                    >
                      <span className="font-semibold text-on-dark tabular-nums">{fact.value}</span>{" "}
                      {fact.label}
                    </a>
                  </li>
                ))}
              </ul>
              <Link
                href={`/suppliers/${profile.slug}`}
                className="mt-3 inline-block text-xs text-on-dark underline decoration-orange underline-offset-4 hover:text-orange-ink"
              >
                All {profile.name} listings →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <InquiryDialog ref={dialog} product={current} />
    </section>
  );
}
