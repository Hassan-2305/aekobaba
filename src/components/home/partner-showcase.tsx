"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { InquiryDialog, type InquiryDialogHandle } from "@/components/catalog/inquiry-dialog";
import { cutoutFor, isRepresentativeImage } from "@/components/catalog/product-picture";
import { formatCaptureDate, formatMoney } from "@/lib/catalog/format";
import type { PartnerProfile } from "@/lib/catalog/partners";
import type { ProductVM } from "@/lib/catalog/view-models";

// Featured partner stage — a cinematic, full-bleed section right after the
// hero. The partner's real product photography (cut out, with reflections)
// stands on a slowly turning 3D ring under a warm spotlight; the product in
// front gets its spec plate (SKU, price, basis, capture date) and a quote
// button. Arrows, the filmstrip and keyboard keys move it; hover pauses;
// reduced-motion users get a still ring they can step through.

const STEP_MS = 3600;

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
  const n = products.length;
  const [cur, setCur] = useState(0);
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
    if (paused || reduced || n < 2) return;
    const timer = window.setInterval(() => setCur((c) => c + 1), STEP_MS);
    return () => window.clearInterval(timer);
  }, [paused, reduced, n]);

  if (n === 0) return null;
  const step = 360 / n;
  const index = ((cur % n) + n) % n;
  const current = products[index];
  const { name, sku } = shortTitle(current.title);
  const hasRealPhotos = products.some(
    (p) => p.primaryImage && !isRepresentativeImage(p.primaryImage.url),
  );

  return (
    <section
      data-testid="partner-showcase"
      aria-labelledby="partner-showcase-title"
      className="tone-dark relative overflow-hidden border-b border-line-dark bg-navy text-on-dark"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") setCur((c) => c + 1);
        if (e.key === "ArrowLeft") setCur((c) => c - 1);
      }}
    >
      {/* Stage lighting and a perspective floor. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(42% 55% at 50% 38%, rgba(255,222,190,.14), transparent 70%), radial-gradient(60% 40% at 50% 100%, rgba(245,102,22,.14), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] opacity-[0.35] [mask-image:linear-gradient(to_top,black,transparent)]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(244,244,240,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(244,244,240,.14) 1px, transparent 1px)",
          backgroundSize: "120px 60px",
          transform: "perspective(600px) rotateX(55deg)",
          transformOrigin: "50% 100%",
        }}
      />

      {/* Top line: partner mark + sourced facts. */}
      <div className="relative mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-8 gap-y-4 px-5 pt-10 sm:px-8 lg:px-[var(--edge)]">
        <div className="flex items-center gap-5">
          <span className="tag flex items-center gap-2 text-[12px] tracking-[0.12em] text-on-dark">
            <span aria-hidden className="h-[9px] w-[9px] bg-orange" />
            Featured partner
          </span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/partners/${profile.slug}/logo.svg`}
            alt={`${profile.name} logo`}
            className="h-9 w-auto"
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
          />
        </div>
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-on-dark-muted">
          {profile.facts.map((fact) => (
            <li key={fact.label} className="flex items-baseline gap-1.5">
              <span className="font-semibold text-on-dark tabular-nums">{fact.value}</span>
              <span>{fact.label}</span>
              <a
                href={fact.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] uppercase tracking-[0.1em] text-on-dark-muted/60 underline-offset-2 hover:text-on-dark hover:underline"
                title={fact.sourceName}
              >
                src
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* The ring. */}
      <div
        className="relative mx-auto mt-6 max-w-[1400px] px-5 sm:px-8 lg:px-[var(--edge)]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div
          className="relative h-[clamp(300px,34vw,520px)] [perspective:1500px]"
          style={{
            ["--r" as string]: "clamp(170px, 24vw, 430px)",
            ["--w" as string]: "clamp(120px, 15vw, 240px)",
          }}
          role="group"
          aria-roledescription="carousel"
          aria-label={`${profile.name} products`}
        >
          <div
            className="absolute left-1/2 top-[52%] h-0 w-0 [transform-style:preserve-3d] transition-transform duration-[900ms] ease-[cubic-bezier(.2,.7,.1,1)]"
            style={{ transform: `rotateY(${-cur * step}deg)` }}
          >
            {products.map((product, i) => {
              const d =
                Math.min((((i - index) % n) + n) % n, (((index - i) % n) + n) % n) /
                Math.max(1, n / 2);
              const front = i === index;
              const src = product.primaryImage
                ? (cutoutFor(product.primaryImage.url) ?? product.primaryImage.url)
                : null;
              return (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  aria-hidden={!front}
                  tabIndex={front ? 0 : -1}
                  className="absolute left-0 top-0 block [transform-style:preserve-3d] transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(.2,.7,.1,1)]"
                  style={{
                    width: "var(--w)",
                    height: "var(--w)",
                    marginLeft: "calc(var(--w) / -2)",
                    marginTop: "calc(var(--w) / -2)",
                    transform: `rotateY(${i * step}deg) translateZ(var(--r)) rotateY(${(cur % n) * step - i * step}deg) scale(${front ? 1.18 : 1 - d * 0.32})`,
                    opacity: front ? 1 : 0.92 - d * 0.6,
                    filter: front ? "none" : `brightness(${1 - d * 0.45})`,
                  }}
                >
                  {src ? (
                    <>
                      <Image
                        src={src}
                        alt={product.primaryImage?.alt ?? product.title}
                        fill
                        sizes="(min-width: 1024px) 18vw, 40vw"
                        className="object-contain object-bottom drop-shadow-[0_26px_26px_rgba(0,0,0,.55)]"
                        priority={front}
                      />
                      {/* Reflection on the floor. */}
                      <span
                        aria-hidden
                        className="absolute inset-x-0 top-full h-[55%] origin-top scale-y-[-1] opacity-30 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]"
                      >
                        <Image
                          src={src}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 18vw, 40vw"
                          className="object-contain object-bottom"
                        />
                      </span>
                    </>
                  ) : null}
                </Link>
              );
            })}
          </div>

          {/* Spot on the floor under the front product. */}
          <div
            aria-hidden
            className="absolute left-1/2 top-[78%] h-[12%] w-[34%] -translate-x-1/2 rounded-[50%]"
            style={{
              background: "radial-gradient(closest-side, rgba(255,235,210,.22), transparent)",
            }}
          />

          <button
            type="button"
            onClick={() => setCur((c) => c - 1)}
            aria-label="Previous product"
            className="absolute left-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-on-dark/25 text-on-dark transition-colors hover:border-orange hover:bg-orange"
          >
            <svg
              aria-hidden
              width="16"
              height="16"
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
            onClick={() => setCur((c) => c + 1)}
            aria-label="Next product"
            className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-on-dark/25 text-on-dark transition-colors hover:border-orange hover:bg-orange"
          >
            <svg
              aria-hidden
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M4 12h15M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>

        {/* Spec plate for the product in front. */}
        <div className="relative mx-auto -mt-2 max-w-[760px]" aria-live="polite">
          <div className="grid gap-4 border-t border-line-dark pt-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="min-w-0">
              <p className="tag text-on-dark-muted">
                {current.categoryName}
                {sku ? (
                  <span className="ml-2 font-mono normal-case tracking-normal text-on-dark">
                    #{sku}
                  </span>
                ) : null}
              </p>
              <Link
                href={`/products/${current.id}`}
                className="mt-2 block text-lg font-semibold leading-snug text-on-dark hover:underline sm:text-xl"
              >
                {name}
              </Link>
              <p className="mt-1.5 text-xs text-on-dark-muted">
                Verified from{" "}
                <a
                  href={current.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-on-dark underline decoration-on-dark/30 underline-offset-2"
                >
                  {profile.name}&rsquo;s page
                </a>{" "}
                on {formatCaptureDate(current.sourceCapturedAt)}
                {current.primaryImage && !isRepresentativeImage(current.primaryImage.url)
                  ? " · Supplier photo"
                  : " · Representative image"}
              </p>
            </div>
            <div className="flex items-end gap-5 sm:justify-end">
              <div className="text-right">
                <p className="text-3xl font-semibold tracking-tight text-on-dark tabular-nums">
                  {current.basePrice === null ? "Ask" : formatMoney(current.basePrice)}
                </p>
                <p className="mt-1 max-w-[12rem] text-[11px] leading-snug text-on-dark-muted">
                  {current.basePrice === null ? "the supplier" : current.priceBasis}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dialog.current?.open("QUOTE")}
                className="h-11 shrink-0 bg-orange px-5 text-sm font-medium text-white transition-colors hover:bg-orange-hi"
              >
                Get a quote
              </button>
            </div>
          </div>

          {/* Filmstrip — real photos on white tiles. */}
          <div
            className="mt-5 flex gap-2 overflow-x-auto pb-2"
            role="tablist"
            aria-label="Choose a product"
          >
            {products.map((product, i) => {
              const active = i === index;
              return (
                <button
                  key={product.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={shortTitle(product.title).name}
                  onClick={() => setCur(i)}
                  className={`relative h-14 w-14 shrink-0 overflow-hidden border-2 bg-white transition-all ${
                    active ? "border-orange" : "border-transparent opacity-70 hover:opacity-100"
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

      {/* Story row. */}
      <div className="relative mx-auto grid max-w-[1400px] gap-10 px-5 pb-14 pt-12 sm:px-8 lg:grid-cols-12 lg:px-[var(--edge)]">
        <div className="lg:col-span-6">
          <p className="tag flex items-center gap-[18px] text-[12.5px] tracking-[0.12em] text-on-dark-muted">
            <span aria-hidden className="h-[1.5px] w-[30px] bg-orange" />
            {profile.tagline}
          </p>
          <h2
            id="partner-showcase-title"
            className="mt-4 text-[clamp(2.4rem,4.4vw,5rem)] font-extrabold leading-[0.95] tracking-[-0.045em] text-on-dark"
          >
            {profile.name}
          </h2>
          <p className="mt-4 max-w-[560px] text-[clamp(1rem,1.05vw,1.15rem)] leading-[1.5] text-on-dark-muted">
            {profile.summary}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href={`/suppliers/${profile.slug}`}
              className="inline-flex h-12 items-center gap-2 bg-orange px-6 text-sm font-medium text-white transition-colors hover:bg-orange-hi"
            >
              Explore all {profile.name} listings
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
            {profile.perks.map((perk) => (
              <span key={perk.text} className="text-xs text-on-dark-muted">
                {perk.text} ·{" "}
                <a
                  href={perk.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-on-dark/20 underline-offset-2 hover:text-on-dark"
                >
                  source
                </a>
              </span>
            ))}
          </div>
        </div>
        <ul className="grid gap-6 sm:grid-cols-2 lg:col-span-5 lg:col-start-8 lg:self-end">
          {profile.services.map((service) => (
            <li key={service.title} className="border-l-2 border-orange pl-4">
              <p className="text-sm font-semibold text-on-dark">{service.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-on-dark-muted">{service.body}</p>
            </li>
          ))}
        </ul>
      </div>
      {!hasRealPhotos ? (
        <p className="sr-only">Product images are representative illustrations.</p>
      ) : null}

      <InquiryDialog ref={dialog} product={current} />
    </section>
  );
}
