import Image from "next/image";
import Link from "next/link";

import type { CategoryVM } from "@/lib/catalog/view-models";

// Light-theme hero still life — composed from separate objects, never one
// picture. Studio light is CSS (a soft white key, a warm floor fill, warm
// fall-off to the right) that fades into the hero background with no edge;
// travertine plinths are drawn elements; each packaging item is its own
// cut-out with three shadows of its own: a cast silhouette lying back-right
// on the stone, a soft wall shadow, and a contact shadow at the base.
//
// The stage keeps the composition's proportions (1350 × 1000 units) and is
// contained in the column, anchored bottom-right; when the column is
// width-bound it grows 6% past the column line so the set breaks the grid
// edge. Every object links into its category. Imagery is representative.

const STAGE_ASPECT = 1350 / 1000;

interface StillObject {
  slug: string;
  src: string;
  label: string;
  /** Percent of stage: left, top, width, height (width already aspect-true). */
  left: number;
  top: number;
  width: number;
  height: number;
  z: number;
  /** Back-row objects sit slightly further from the key light. */
  depth: "back" | "front";
  chip: boolean;
  delay: number;
  /** Per-object exposure correction (white objects were graded for dark). */
  tone?: string;
}

const OBJECTS: StillObject[] = [
  {
    slug: "pouches-bags",
    src: "/hero/coffee-valve-pouch.webp",
    label: "Black stand-up pouch",
    left: 19.85,
    top: 25,
    width: 26.3,
    height: 62,
    z: 2,
    depth: "back",
    chip: false,
    delay: 60,
  },
  {
    slug: "labels",
    src: "/hero/label-roll.webp",
    label: "Roll of labels",
    left: 78,
    top: 51.5,
    width: 16,
    height: 19,
    z: 2,
    depth: "front",
    chip: true,
    delay: 120,
    tone: "brightness-[1.13]",
  },
  {
    slug: "glass-jars",
    src: "/hero/glass-jar.webp",
    label: "Clear glass jar",
    left: 61.85,
    top: 55,
    width: 14.3,
    height: 35,
    z: 4,
    depth: "front",
    chip: true,
    delay: 180,
    tone: "brightness-[1.06]",
  },
  {
    slug: "pouches-bags",
    src: "/hero/kraft-pouch.webp",
    label: "Kraft stand-up pouch",
    left: 8.2,
    top: 46.5,
    width: 20.57,
    height: 44,
    z: 5,
    depth: "front",
    chip: true,
    delay: 240,
  },
  {
    slug: "glass-bottles",
    src: "/hero/glass-bottle-amber.webp",
    label: "Amber Boston round bottle",
    left: 42.1,
    top: 41.5,
    width: 15.8,
    height: 49,
    z: 5,
    depth: "front",
    chip: false,
    delay: 300,
  },
  {
    slug: "droppers-vials",
    src: "/hero/dropper-vial.webp",
    label: "Amber dropper bottle",
    left: 57.4,
    top: 65.5,
    width: 6.13,
    height: 26,
    z: 6,
    depth: "front",
    chip: true,
    delay: 360,
  },
];

const ANNOTATIONS = [
  { slug: "pouches-bags", ax: 21.6, ay: 29, lx: 12, ly: 9.5 },
  { slug: "glass-bottles", ax: 50, ay: 43.8, lx: 63, ly: 23.5 },
] as const;

// Plinths in stage percent: a raised block for the label roll, and the main
// slab, which emerges out of the light on the left (masked fade, so the
// stone never draws a hard edge mid-page) and bleeds off right and bottom.
const PLINTHS = [
  { left: 72, width: 40, top: 70.5, topDepth: 3.6, bottom: 100, z: 1, fade: false },
  { left: -4, width: 116, top: 86, topDepth: 4.8, bottom: 104, z: 3, fade: true },
];

const href = (slug: string) => `/results?category=${encodeURIComponent(slug)}`;

function Plinth({ p }: { p: (typeof PLINTHS)[number] }) {
  return (
    <div
      aria-hidden
      className="absolute dark:brightness-[0.36] dark:saturate-[0.8]"
      style={{
        left: `${p.left}%`,
        width: `${p.width}%`,
        top: `${p.top}%`,
        height: `${p.bottom - p.top}%`,
        zIndex: p.z,
        ...(p.fade
          ? {
              maskImage: "linear-gradient(to right, transparent, #000 14%)",
              WebkitMaskImage: "linear-gradient(to right, transparent, #000 14%)",
            }
          : {}),
      }}
    >
      {/* Shadow the block throws on the wall behind it. */}
      <span
        className="absolute -top-[18%] left-[3%] h-[40%] w-[100%]"
        style={{
          background: "radial-gradient(60% 60% at 50% 100%, rgba(120,98,74,.18), transparent 75%)",
        }}
      />
      {/* Top face — lit. */}
      <span
        className="absolute inset-x-0 top-0 block"
        style={{
          height: `${(p.topDepth / (p.bottom - p.top)) * 100}%`,
          backgroundImage:
            "linear-gradient(to bottom, rgba(255,255,255,.35), rgba(255,255,255,0)), url(/hero/stone-top.webp)",
          backgroundSize: "auto, 320px auto",
        }}
      />
      {/* Front face — turned away from the key light. */}
      <span
        className="absolute inset-x-0 bottom-0 block border-t border-white/70"
        style={{
          top: `${(p.topDepth / (p.bottom - p.top)) * 100}%`,
          backgroundImage:
            "linear-gradient(to bottom, rgba(110,90,66,.16), rgba(110,90,66,.04) 35%, rgba(110,90,66,.1)), url(/hero/stone-front.webp)",
          backgroundSize: "auto, 320px auto",
        }}
      />
    </div>
  );
}

export function StudioStill({ categories }: { categories: CategoryVM[] }) {
  const live = new Map(categories.filter((c) => c.productCount > 0).map((c) => [c.slug, c]));

  return (
    <div
      data-testid="studio-still"
      className="relative h-[400px] [container-type:size] sm:h-[500px] lg:h-auto"
    >
      {/* Studio light — gradients only, fading into the hero: no edge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-[35%] right-0"
        style={{
          background: [
            "radial-gradient(38% 58% at 64% 42%, var(--still-key), transparent 72%)",
            "radial-gradient(45% 38% at 66% 86%, var(--still-floor), transparent 72%)",
            "radial-gradient(30% 75% at 100% 40%, var(--still-edge), transparent 70%)",
          ].join(","),
        }}
      />
      {/* Window light through leaves, falling on the wall. */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 aspect-[1100/800] w-[90%] opacity-75 mix-blend-multiply dark:opacity-[0.14] dark:mix-blend-screen dark:[filter:brightness(4)_sepia(0.5)]"
        style={{ backgroundImage: "url(/hero/leaf-shadow.webp)", backgroundSize: "100% 100%" }}
      />

      <div
        className="absolute bottom-0 right-0"
        style={{
          width: `min(106cqw, calc(100cqh * ${STAGE_ASPECT}))`,
          aspectRatio: `${STAGE_ASPECT}`,
        }}
      >
        {PLINTHS.map((p, i) => (
          <Plinth key={i} p={p} />
        ))}

        {OBJECTS.map((o) => {
          const category = live.get(o.slug);
          const box = {
            left: `${o.left}%`,
            top: `${o.top}%`,
            width: `${o.width}%`,
            height: `${o.height}%`,
            zIndex: o.z,
            animationDelay: `${o.delay}ms`,
          };
          const body = (
            <>
              {/* Cast shadow: the object's own silhouette, laid back-right. */}
              <Image
                src={o.src}
                alt=""
                aria-hidden
                fill
                sizes="(min-width: 1024px) 14vw, 30vw"
                className="pointer-events-none object-contain object-bottom opacity-[0.17] dark:opacity-[0.45]"
                style={{
                  filter: "brightness(0) blur(5px)",
                  transform: "skewX(-40deg) scaleY(0.38)",
                  transformOrigin: "50% 100%",
                }}
              />
              {/* Contact shadow. */}
              <span
                aria-hidden
                className="absolute -bottom-[2.5%] left-[-6%] h-[7%] w-[112%] transition-opacity duration-300 group-hover:opacity-50"
                style={{
                  background: "radial-gradient(closest-side, var(--still-contact), transparent)",
                }}
              />
              <span
                className={`absolute inset-0 ${o.depth === "back" ? "brightness-[0.96]" : ""} ${o.tone ?? ""}`}
              >
                <Image
                  src={o.src}
                  alt={`${o.label} — representative image`}
                  fill
                  sizes="(min-width: 1024px) 18vw, 40vw"
                  className="object-contain object-bottom transition-transform duration-300 ease-out [filter:drop-shadow(var(--still-rim))_drop-shadow(14px_8px_12px_var(--still-shadow))] group-hover:-translate-y-[3%] group-focus-visible:-translate-y-[3%]"
                />
              </span>
              {category && o.chip ? (
                <span className="pointer-events-none absolute -top-9 left-1/2 hidden -translate-x-1/2 translate-y-1 whitespace-nowrap bg-[var(--still-ink)] px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-paper opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:opacity-100 sm:block">
                  {category.name} · {category.productCount}
                </span>
              ) : null}
            </>
          );
          return category ? (
            <Link
              key={o.label}
              href={href(o.slug)}
              aria-label={`${category.name} — ${category.productCount} products`}
              className="hero-rise group absolute block outline-offset-4"
              style={box}
            >
              {body}
            </Link>
          ) : (
            <div key={o.label} className="hero-rise absolute" style={box}>
              {body}
            </div>
          );
        })}

        {/* Annotations — thin technical leaders to the actual objects. */}
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full text-[var(--still-ink)] opacity-55 sm:block"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {ANNOTATIONS.filter((a) => live.has(a.slug)).map((a) => (
            <polyline
              key={a.slug}
              points={`${a.ax},${a.ay} ${a.lx - 2.2},${a.ly + 1.6} ${a.lx - 0.6},${a.ly + 1.6}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              className="hero-draw"
              style={{ animationDelay: "600ms" }}
            />
          ))}
        </svg>
        {ANNOTATIONS.map((a) => {
          const category = live.get(a.slug);
          if (!category) return null;
          return (
            <div key={a.slug} className="hidden sm:block">
              <span
                aria-hidden
                className="absolute z-20 h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 bg-orange"
                style={{ left: `${a.ax}%`, top: `${a.ay}%` }}
              />
              <Link
                href={href(a.slug)}
                tabIndex={-1}
                aria-hidden
                className="hero-rise absolute z-20 block whitespace-nowrap text-[var(--still-ink)] transition-colors hover:text-orange-ink"
                style={{ left: `${a.lx}%`, top: `${a.ly}%`, animationDelay: "800ms" }}
              >
                <span className="block text-[13px] font-semibold uppercase leading-none tracking-[0.02em]">
                  {category.name}
                </span>
                <span className="mt-[7px] block text-[13px] leading-none text-[var(--still-ink-muted)] tabular-nums">
                  {category.productCount} product{category.productCount === 1 ? "" : "s"}
                </span>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
