import Image from "next/image";
import Link from "next/link";

import type { CategoryVM } from "@/lib/catalog/view-models";

// The hero "shelf": packaging treated as hero objects. Studio cutouts stand on
// a lit plane at true relative scale, front row overlapping back row, and each
// object is an entry point into its category. Technical annotations carry real
// catalog data (category name + live product count) — never decoration.
//
// Positions are percentages of a fixed-aspect stage so the composition holds
// from phone to wide desktop. Imagery is representative (generated packshots).

interface ShelfObject {
  slug: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  /** Percent of stage: left edge, bottom edge, object height. */
  left: number;
  bottom: number;
  h: number;
  z: number;
  delay: number;
}

const OBJECTS: ShelfObject[] = [
  {
    slug: "mailers",
    src: "/hero/mailer-kraft.webp",
    width: 745,
    height: 560,
    alt: "Kraft paper mailer envelope",
    left: 0,
    bottom: 31,
    h: 38,
    z: 0,
    delay: 80,
  },
  {
    slug: "corrugated",
    src: "/hero/corrugated-box.webp",
    width: 747,
    height: 599,
    alt: "Corrugated shipping box",
    left: 7,
    bottom: 23,
    h: 30,
    z: 1,
    delay: 140,
  },
  {
    slug: "pouches-bags",
    src: "/hero/coffee-valve-pouch.webp",
    width: 476,
    height: 830,
    alt: "Black flat-bottom pouch with degassing valve",
    left: 30,
    bottom: 26,
    h: 56,
    z: 2,
    delay: 200,
  },
  {
    slug: "labels",
    src: "/hero/label-roll.webp",
    width: 614,
    height: 538,
    alt: "Roll of blank product labels",
    left: 66,
    bottom: 27,
    h: 24,
    z: 1,
    delay: 260,
  },
  {
    slug: "pouches-bags",
    src: "/hero/kraft-pouch.webp",
    width: 486,
    height: 770,
    alt: "Kraft stand-up pouch with window",
    left: 14,
    bottom: 8,
    h: 43,
    z: 3,
    delay: 320,
  },
  {
    slug: "glass-bottles",
    src: "/hero/glass-bottle-amber.webp",
    width: 347,
    height: 797,
    alt: "Amber glass Boston round bottle",
    left: 47,
    bottom: 6,
    h: 63,
    z: 4,
    delay: 380,
  },
  {
    slug: "droppers-vials",
    src: "/hero/dropper-vial.webp",
    width: 254,
    height: 804,
    alt: "Amber glass dropper bottle",
    left: 68.5,
    bottom: 4,
    h: 31,
    z: 5,
    delay: 440,
  },
  {
    slug: "glass-jars",
    src: "/hero/glass-jar.webp",
    width: 444,
    height: 803,
    alt: "Clear glass mason jar",
    left: 77,
    bottom: 5,
    h: 37,
    z: 4,
    delay: 480,
  },
];

interface Annotation {
  slug: string;
  /** Anchor on the object and the label's corner, in stage percent. */
  ax: number;
  ay: number;
  lx: number;
  ly: number;
  align: "left" | "right";
}

const ANNOTATIONS: Annotation[] = [
  { slug: "mailers", ax: 12, ay: 40, lx: 2, ly: 16, align: "left" },
  { slug: "glass-bottles", ax: 58, ay: 31, lx: 66, ly: 9, align: "left" },
  { slug: "labels", ax: 84, ay: 52, lx: 100, ly: 33, align: "right" },
];

function categoryHref(slug: string) {
  return `/results?category=${encodeURIComponent(slug)}`;
}

export function HeroShelf({ categories }: { categories: CategoryVM[] }) {
  // Only categories with listings become links or annotations — an empty
  // category is never advertised.
  const bySlug = new Map(categories.filter((c) => c.productCount > 0).map((c) => [c.slug, c]));

  return (
    <div className="relative aspect-[720/560] w-full select-none" data-testid="hero-shelf">
      {/* Light: a warm key from below-centre and a cool wash from above. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-[20%]"
        style={{
          background:
            "radial-gradient(34% 32% at 52% 60%, var(--studio-warm), transparent 100%), radial-gradient(40% 34% at 52% 36%, var(--studio-key), transparent 100%)",
        }}
      />
      {/* The plane the objects stand on — feathered on every edge — and its
          horizon hairline. */}
      <div
        aria-hidden
        className="absolute inset-x-[-12%] bottom-[-10%] h-[50%]"
        style={{
          background: "radial-gradient(closest-side, rgba(244,244,240,.07), rgba(244,244,240,0))",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-[30%] h-px bg-gradient-to-r from-transparent via-on-dark/20 to-transparent"
      />

      {OBJECTS.map((object) => {
        const category = bySlug.get(object.slug);
        const widthPct = (object.h / 100) * (560 / 720) * (object.width / object.height) * 100;
        const style = {
          left: `${object.left}%`,
          bottom: `${object.bottom}%`,
          height: `${object.h}%`,
          width: `${widthPct}%`,
          zIndex: object.z,
          animationDelay: `${object.delay}ms`,
        };
        const picture = (
          <>
            <span
              aria-hidden
              className="absolute -bottom-[6%] left-[-8%] h-[14%] w-[116%]"
              style={{
                background: "radial-gradient(closest-side, var(--object-shadow), transparent)",
              }}
            />
            <Image
              src={object.src}
              alt={`${object.alt} — representative image`}
              fill
              priority
              sizes="(min-width: 1024px) 260px, 30vw"
              className="object-contain object-bottom drop-shadow-[0_20px_30px_var(--object-shadow)] transition-[filter] duration-300"
            />
          </>
        );
        return category ? (
          <Link
            key={object.src}
            href={categoryHref(object.slug)}
            aria-label={`${category.name} — ${category.productCount} products`}
            className="hero-rise group absolute block hover:[&_img]:brightness-110"
            style={style}
          >
            {picture}
          </Link>
        ) : (
          <div key={object.src} className="hero-rise absolute" style={style}>
            {picture}
          </div>
        );
      })}

      {/* Annotations — leader lines drawn in stage space, labels in HTML. */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full text-on-dark/45 sm:block"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {ANNOTATIONS.filter((a) => bySlug.has(a.slug)).map((a) => {
          const elbowX = a.align === "left" ? a.lx - 1.5 : a.lx + 1.5;
          const endX = a.align === "left" ? a.lx : a.lx - 0.5;
          return (
            <polyline
              key={a.slug}
              points={`${a.ax},${a.ay} ${elbowX},${a.ly + 1.2} ${endX},${a.ly + 1.2}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              className="hero-draw"
              style={{ animationDelay: "700ms" }}
            />
          );
        })}
      </svg>
      {ANNOTATIONS.map((a) => {
        const category = bySlug.get(a.slug);
        if (!category) return null;
        return (
          <div key={a.slug} className="hidden sm:block">
            <span
              aria-hidden
              className="absolute z-10 h-[6px] w-[6px] -translate-x-1/2 -translate-y-1/2 bg-orange"
              style={{ left: `${a.ax}%`, top: `${a.ay}%` }}
            />
            <Link
              href={categoryHref(a.slug)}
              tabIndex={-1}
              aria-hidden
              className={`hero-rise absolute z-20 block whitespace-nowrap transition-colors hover:text-orange-hi ${
                a.align === "left" ? "pl-2" : "pr-2 text-right"
              }`}
              style={{
                ...(a.align === "left" ? { left: `${a.lx}%` } : { right: `${100 - a.lx}%` }),
                top: `${a.ly}%`,
                animationDelay: "900ms",
              }}
            >
              <span className="tag block text-on-dark">{category.name}</span>
              <span className="mt-1.5 block text-xs text-on-dark-muted tabular-nums">
                {category.productCount} product{category.productCount === 1 ? "" : "s"}
              </span>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
