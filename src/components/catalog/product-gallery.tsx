"use client";

import Image from "next/image";
import { useState } from "react";

import type { ProductImageVM } from "@/lib/catalog/view-models";

// Product gallery (spec art_AjaTUf9x): renders the product's actual Image
// rows — no views are invented here. The seed writes three representative
// views per product (studio, detail, dark studio — all derived from one
// generated packshot); real supplier photography lands as more rows and the
// gallery grows with the data. The visible "Representative image" caption is
// the honesty rule.
//
// Interaction: thumbnails, previous/next, arrow keys on the stage, and an
// inspect mode that magnifies 2.2x under the pointer.

const isDarkView = (url: string) => /-dark\.(webp|png|jpe?g)$/.test(url);

export function ProductGallery({ images, title }: { images: ProductImageVM[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [inspect, setInspect] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");

  if (images.length === 0) return null;

  const count = images.length;
  const current = images[Math.min(index, count - 1)];
  const altFor = (image: ProductImageVM) => image.alt ?? `${title} — representative packaging image`;
  const go = (delta: number) => {
    setInspect(false);
    setIndex((i) => (i + delta + count) % count);
  };
  const dark = isDarkView(current.url);

  return (
    <figure data-testid="product-gallery">
      <div
        role="group"
        aria-roledescription="carousel"
        aria-label={`${title} images`}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") go(1);
          if (event.key === "ArrowLeft") go(-1);
          if (event.key === "Escape") setInspect(false);
        }}
        className={`relative aspect-square overflow-hidden ${dark ? "bg-[#080a0d]" : "bg-well"}`}
      >
        <div
          className={`absolute inset-0 ${inspect ? "cursor-zoom-out" : "cursor-zoom-in"}`}
          onClick={() => setInspect((v) => !v)}
          onMouseMove={(event) => {
            if (!inspect) return;
            const rect = event.currentTarget.getBoundingClientRect();
            setOrigin(
              `${(((event.clientX - rect.left) / rect.width) * 100).toFixed(1)}% ${(((event.clientY - rect.top) / rect.height) * 100).toFixed(1)}%`,
            );
          }}
        >
          <Image
            key={current.url}
            src={current.url}
            alt={altFor(current)}
            fill
            priority={index === 0}
            sizes="(min-width: 1024px) 680px, 100vw"
            style={{ transformOrigin: origin }}
            className={`transition-transform duration-300 ease-out ${inspect ? "scale-[2.2]" : "scale-100"} ${
              dark ? "object-cover" : `packshot object-contain ${index === 0 ? "p-10 sm:p-16" : "p-0"}`
            }`}
          />
        </div>

        <span className={`tag pointer-events-none absolute left-4 top-4 ${dark ? "text-white/70" : "text-well-ink-muted"}`}>
          View {index + 1} / {count}
        </span>

        {count > 1 ? (
          <div className="absolute bottom-4 right-4 flex gap-1.5">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous image"
              className="flex h-10 w-10 items-center justify-center border border-black/10 bg-white/85 text-[#0b0e12] transition-colors hover:border-orange hover:bg-orange"
            >
              <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M20 12H5M11 6l-6 6 6 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next image"
              className="flex h-10 w-10 items-center justify-center border border-black/10 bg-white/85 text-[#0b0e12] transition-colors hover:border-orange hover:bg-orange"
            >
              <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setInspect((v) => !v)}
          aria-pressed={inspect}
          className={`absolute bottom-4 left-4 h-10 border px-3 text-xs font-medium transition-colors ${
            inspect
              ? "border-orange bg-orange text-on-orange"
              : "border-black/10 bg-white/85 text-[#0b0e12] hover:border-orange"
          }`}
        >
          {inspect ? "Exit inspect" : "Inspect"}
        </button>
      </div>

      {count > 1 ? (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6" data-testid="gallery-thumbs">
          {images.map((image, i) => (
            <button
              key={image.url}
              type="button"
              onClick={() => {
                setInspect(false);
                setIndex(i);
              }}
              aria-label={`Show image ${i + 1} of ${count}`}
              aria-current={i === index ? "true" : undefined}
              className={`relative aspect-square overflow-hidden border-2 transition-colors ${
                isDarkView(image.url) ? "bg-[#080a0d]" : "bg-well"
              } ${i === index ? "border-orange" : "border-transparent hover:border-line"}`}
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="96px"
                className={isDarkView(image.url) ? "object-cover" : "packshot object-contain"}
              />
            </button>
          ))}
        </div>
      ) : null}

      <figcaption data-testid="representative-image-caption" className="mt-3 text-xs text-ink-faint">
        Representative image — generated illustration, not a photo of the supplier&rsquo;s actual stock. Ask the
        supplier for production photos or a sample.
      </figcaption>
    </figure>
  );
}
