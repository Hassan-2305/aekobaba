"use client";

import Image from "next/image";
import { useState } from "react";

import { cutoutFor, isRepresentativeImage, ProductPicture } from "./product-picture";
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
/** Crops of the white studio sweep (detail views) stay on a light plate in both themes. */
const isLightPlate = (url: string) => !isDarkView(url) && !cutoutFor(url);
const plateFor = (url: string) =>
  isDarkView(url) ? "bg-[#080a0d]" : isLightPlate(url) ? "bg-[#ecebe6]" : "bg-well";

export function ProductGallery({ images, title }: { images: ProductImageVM[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [inspect, setInspect] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");

  if (images.length === 0) return null;

  const count = images.length;
  const current = images[Math.min(index, count - 1)];
  const altFor = (image: ProductImageVM) =>
    image.alt ?? `${title} — representative packaging image`;
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
        className={`relative aspect-square overflow-hidden ${plateFor(current.url)}`}
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
          <div
            key={current.url}
            // The plate colour lives on the transformed layer too: a transform
            // isolates blending, and the packshot must multiply into its plate.
            className={`absolute inset-0 transition-transform duration-300 ease-out ${plateFor(current.url)} ${inspect ? "scale-[2.2]" : "scale-100"}`}
            style={{ transformOrigin: origin }}
          >
            {dark ? (
              <Image
                src={current.url}
                alt={altFor(current)}
                fill
                sizes="(min-width: 1024px) 680px, 100vw"
                className="object-cover"
              />
            ) : cutoutFor(current.url) ? (
              <ProductPicture
                src={current.url}
                alt={altFor(current)}
                priority={index === 0}
                sizes="(min-width: 1024px) 680px, 100vw"
                className="p-10 sm:p-16"
              />
            ) : (
              <Image
                src={current.url}
                alt={altFor(current)}
                fill
                sizes="(min-width: 1024px) 680px, 100vw"
                className="packshot object-contain"
              />
            )}
          </div>
        </div>

        <span
          className={`tag pointer-events-none absolute left-4 top-4 ${
            dark ? "text-white/70" : isLightPlate(current.url) ? "text-[#555d66]" : "text-ink-muted"
          }`}
        >
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
              <svg
                aria-hidden
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M20 12H5M11 6l-6 6 6 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next image"
              className="flex h-10 w-10 items-center justify-center border border-black/10 bg-white/85 text-[#0b0e12] transition-colors hover:border-orange hover:bg-orange"
            >
              <svg
                aria-hidden
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
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
              className={`relative aspect-square overflow-hidden border-2 transition-colors ${plateFor(
                image.url,
              )} ${i === index ? "border-orange" : "border-transparent hover:border-line"}`}
            >
              {cutoutFor(image.url) ? (
                <ProductPicture src={image.url} alt="" sizes="96px" />
              ) : (
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="96px"
                  className={isDarkView(image.url) ? "object-cover" : "packshot object-contain"}
                />
              )}
            </button>
          ))}
        </div>
      ) : null}

      {isRepresentativeImage(current.url) ? (
        <figcaption
          data-testid="representative-image-caption"
          className="mt-3 text-xs text-ink-faint"
        >
          Illustrative image — a generated picture of this packaging type, not the supplier&rsquo;s own
          photo. Ask the supplier for production photos or a sample.
        </figcaption>
      ) : (
        <figcaption data-testid="supplier-photo-caption" className="mt-3 text-xs text-ink-faint">
          Supplier product photo
          {current.alt?.includes(" — ") ? ` · ${current.alt.split(" — ").pop()}` : ""}.
        </figcaption>
      )}
    </figure>
  );
}
