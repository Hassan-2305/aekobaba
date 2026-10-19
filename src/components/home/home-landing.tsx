import Image from "next/image";
import Link from "next/link";

import { ProductCard } from "@/components/catalog/product-card";
import { TierPill } from "@/components/catalog/tier-badge";
import { cutoutFor } from "@/components/catalog/product-picture";
import { categoryImageAsset } from "../../../data/image-mapping";
import {
  formatCaptureDate,
  formatMoney,
  formatMoqShort,
  formatUnitMoney,
  priceCurrency,
  shortBasis,
  unitPrice,
} from "@/lib/catalog/format";
import { CATEGORY_GROUPS, CATEGORY_MENU } from "@/lib/catalog/menu";
import { partnerFirst, type PartnerProfile } from "@/lib/catalog/partners";
import type { CategoryVM, ProductVM } from "@/lib/catalog/view-models";
import { HeaderTabs, SpotlightCarousel, TabbedPanels } from "./home-islands";

// Home — v12 marketplace design (Oct 2026). Sections, top to bottom:
//
//   hero            headline, pill search, category box (group tabs → tiles)
//   supplier strip  "Published prices from N verified suppliers, including…"
//   how it works    01 prices · 02 compare · 03 request (real listings)
//   category cards  glass bottles · pouches · labels · mailers
//   popular         tabbed product cards (partner listings first, sponsored)
//   suppliers       the verified suppliers, tiers earned
//   spotlight       partner, sponsored and labelled
//   FAQ · CTA band
//
// Presentational: data arrives as props (src/app/page.tsx owns queries).
// Every count, price and name is live — nothing hardcoded from the mockup.

interface HomeLandingProps {
  categories: CategoryVM[];
  products: ProductVM[];
  partner?: { profile: PartnerProfile; products: ProductVM[] } | null;
  /** Reference "now" for price ages (tests). */
  now?: Date;
}

const plural = (n: number, w: string) => `${n.toLocaleString("en-US")} ${w}${n === 1 ? "" : "s"}`;
const cutout = (path: string | null | undefined) => (path ? (cutoutFor(path) ?? path) : null);
const domainOf = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return null;
  }
};

const FAQ: [string, string][] = [
  ["Are these prices quotes?", "No. They are published prices taken from each supplier’s own product page, at the quantity shown, with the date we checked them. Shipping, tax and setup aren’t included. Suppliers reply to your request with a confirmed quote."],
  ["What does “verified” mean?", "A verified supplier is a registered business trading under the name shown and selling to brands. A verified price matches the supplier’s page on the date shown. The two checks are separate."],
  ["Why do some values say “Not published”?", "We only list what a supplier publishes. Anything missing is marked, never treated as zero, and added to your quote request as a question."],
  ["Can I request quotes from several suppliers at once?", "Yes. Add products from any category to your Quote Basket, set quantities, and send one request. Each supplier receives only their own items and replies to you directly."],
  ["How do sponsored listings work?", "Partners pay for labelled placement and a branded storefront. Payment never changes a supplier’s tier, prices or ranking in organic results."],
];

/** The product sets on the "Popular right now" tabs, by category group. */
const POPULAR_SETS: { label: string; groups: string[]; href: string }[] = [
  { label: "Containers", groups: ["containers", "closures"], href: "/results?group=containers" },
  { label: "Bags & mailers", groups: ["flexible", "shipping"], href: "/results?group=flexible" },
  { label: "Labels & cartons", groups: ["labels", "paper"], href: "/results?group=labels" },
];

const CATEGORY_CARDS = [
  { title: "Glass bottles", slugs: ["glass-bottles"], href: "/results?category=glass-bottles", img: "/products/glass-bottle.png", body: "Boston rounds, droppers and flint or amber glass, sold by the case." },
  { title: "Pouches & bags", slugs: ["pouches-bags", "rollstock"], href: "/results?group=flexible", img: "/hero/coffee-valve-pouch.webp", body: "Stand-up, flat-bottom and spout pouches, polybags and printed film." },
  { title: "Labels & stickers", slugs: ["labels", "brand-accessories"], href: "/results?group=labels", img: "/products/label-roll.png", body: "Custom die-cut stickers, labels, tissue and branded tape with low minimums." },
  { title: "Mailers & boxes", slugs: ["mailers", "corrugated"], href: "/results?group=shipping", img: "/products/corrugated-box.png", body: "Corrugated shippers and e-commerce mailers, stock and custom printed." },
];

/** Completeness for ordering: price, MOQ, image. */
const completeness = (p: ProductVM) =>
  Number(p.basePrice !== null) * 2 + Number(p.moq !== null) + Number(p.primaryImage !== null);

export function HomeLanding({ categories, products, partner, now = new Date() }: HomeLandingProps) {
  const totalProducts = products.length;
  const count = new Map(categories.map((c) => [c.slug, c.productCount]));
  const suppliers = [...new Map(products.map((p) => [p.supplier.slug, p.supplier])).values()];
  const supplierNames = partnerFirst(products)
    .map((p) => p.supplier.name)
    .filter((n, i, all) => all.indexOf(n) === i)
    .slice(0, 8);

  // Hero still life: two category packshots + two partner photos, and a real
  // price sticker from the first partner listing.
  const partnerShots = (partner?.products ?? []).filter((p) => p.primaryImage).slice(0, 2);
  const sticker = partner?.products.find((p) => p.basePrice !== null) ?? null;
  const stickerUnit = sticker ? unitPrice(sticker) : null;

  // How-it-works examples, all real listings.
  const priced = products.filter((p) => p.basePrice !== null && p.moq !== null);
  const priceExample =
    priced.find((p) => (unitPrice(p)?.packSize ?? 0) > 1 && p.specs.capacity) ?? priced[0] ?? null;
  // Compare example: the two most alike listings (same unit and currency,
  // closest capacity) from different suppliers.
  const withMl = products.filter((p) => p.basePrice !== null && p.specs.capacity && unitPrice(p));
  let pair: [ProductVM, ProductVM] | null = null;
  let best = Infinity;
  for (const a of withMl)
    for (const b of withMl) {
      if (a.id >= b.id || a.supplier.slug === b.supplier.slug) continue;
      const ua = unitPrice(a)!;
      const ub = unitPrice(b)!;
      if (ua.currency !== ub.currency || ua.unit !== ub.unit) continue;
      const ratio = Math.abs(Math.log(a.specs.capacity!.value / b.specs.capacity!.value));
      if (ratio < best) {
        best = ratio;
        pair = [a, b];
      }
    }
  const [cmpA, cmpB] = pair ?? [null, null];
  const basketExample = partnerFirst(priced)
    .filter((p, i, all) => all.findIndex((q) => q.supplier.slug === p.supplier.slug) === i)
    .slice(0, 3);

  // Category box: one tab per group, its categories as tiles.
  const groupTabs = CATEGORY_GROUPS.map((g) => ({
    label: g.name,
    tiles: g.slugs
      .map((slug) => ({ slug, name: CATEGORY_MENU.find((c) => c.slug === slug)?.name ?? slug, n: count.get(slug) ?? 0 }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 6),
  }));

  const setProducts = POPULAR_SETS.map((set) => {
    const slugs = new Set(CATEGORY_GROUPS.filter((g) => set.groups.includes(g.id)).flatMap((g) => g.slugs));
    const pool = products.filter((p) => slugs.has(p.categorySlug));
    const ranked = partnerFirst([...pool].sort((a, b) => completeness(b) - completeness(a)));
    // One per supplier first, so a set shows breadth.
    const picks = [
      ...ranked.filter((p, i, all) => all.findIndex((q) => q.supplier.slug === p.supplier.slug) === i),
      ...ranked,
    ].filter((p, i, all) => all.findIndex((q) => q.id === p.id) === i);
    return { ...set, items: picks.slice(0, 4), total: pool.length };
  });

  const supplierTiles = partnerFirst(products)
    .map((p) => p.supplier)
    .filter((s, i, all) => all.findIndex((x) => x.slug === s.slug) === i)
    .slice(0, 6);

  return (
    <div>
      {/* ─── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-line bg-well px-4 pb-10 pt-10 lg:px-14 lg:pt-[72px]">
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden xl:block">
          <span className="absolute left-[60px] top-14 block h-[300px] w-[140px]">
            <Image src={cutout("/products/glass-bottle.png")!} alt="" fill sizes="140px" className="object-contain drop-shadow-[0_22px_20px_rgba(24,26,33,.18)]" />
          </span>
          <span className="absolute left-[210px] top-[250px] block h-[150px] w-[120px]">
            <Image src={cutout("/products/plastic-jar.png")!} alt="" fill sizes="120px" className="object-contain drop-shadow-[0_22px_20px_rgba(24,26,33,.18)]" />
          </span>
          {partnerShots.map((p, i) => (
            <span key={p.id} className={`absolute block h-[200px] w-[150px] ${i === 0 ? "right-[200px] top-[60px]" : "right-[70px] top-[200px]"}`}>
              <Image src={cutout(p.primaryImage!.url)!} alt="" fill sizes="150px" className="object-contain drop-shadow-[0_22px_20px_rgba(24,26,33,.18)]" />
            </span>
          ))}
          {sticker && stickerUnit ? (
            <div className="absolute right-[230px] top-[280px] -rotate-3 rounded-[6px] bg-paper px-2.5 py-2 text-xs shadow-[0_8px_20px_-6px_rgba(24,26,33,.25)]">
              <div className="font-mono text-[10px] text-ink-muted">
                PUBLISHED · {formatCaptureDate(sticker.sourceCapturedAt).replace(/ \d{4}$/, "").toUpperCase()}
              </div>
              <b className="text-base">{formatUnitMoney(stickerUnit.amount, stickerUnit.currency)}</b> / {stickerUnit.unit}
            </div>
          ) : null}
        </div>

        <div className="relative mx-auto flex max-w-[760px] flex-col items-start text-left sm:items-center sm:text-center">
          <h1 className="text-[44px] font-bold leading-[0.96] tracking-[-0.05em] sm:text-6xl lg:text-[80px] lg:leading-[0.95] lg:tracking-[-0.055em]">
            All your packaging.
            <br />
            <span className="font-light">One place.</span>
          </h1>
          <p className="mt-4 max-w-[620px] text-base leading-[1.55] text-ink-body sm:mt-[22px] sm:text-[19px]">
            Discover vetted suppliers, compare real prices and minimum order quantities, and find
            packaging that fits your business — without jumping between websites.
          </p>
          <form
            action="/results"
            role="search"
            className="mt-6 flex h-[60px] w-full max-w-[760px] items-center rounded-xl border-2 border-ink bg-paper py-1.5 pl-3.5 pr-1.5 shadow-[0_0_0_4px_#FFF1E5] sm:mt-9 sm:h-[76px] sm:rounded-[40px] sm:py-2 sm:pl-[22px] sm:pr-2 sm:shadow-[0_18px_40px_-18px_rgba(24,26,33,.35)]"
          >
            <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <label htmlFor="hero-search" className="sr-only">
              Search packaging
            </label>
            <input
              id="hero-search"
              name="q"
              type="search"
              placeholder="Search bottles, pouches, jars, labels…"
              className="ml-3 min-w-0 flex-1 bg-transparent text-base text-ink outline-none sm:text-[19px]"
            />
            <button type="submit" className="h-[46px] flex-none rounded-lg bg-orange px-4 text-base font-semibold text-on-orange hover:bg-orange-hi sm:h-[58px] sm:rounded-[30px] sm:px-[30px] sm:text-[17px]">
              Search
            </button>
          </form>
          <Link href="/results" className="mt-4 text-[15px] font-medium text-orange-ink hover:text-orange">
            Not sure what you need? Browse all {totalProducts} products →
          </Link>
        </div>

        <div className="relative mx-auto mt-8 max-w-[1100px] rounded-2xl border border-line-strong bg-paper lg:mt-11">
          <TabbedPanels
            testId="category-box"
            tabs={groupTabs.map((t) => t.label)}
            panels={groupTabs.map((t) => (
              <div key={t.label} className="grid grid-cols-3 border-t border-line sm:grid-cols-6">
                {t.tiles.map((tile) => {
                  const img = categoryImageAsset(tile.slug);
                  return (
                    <Link
                      key={tile.slug}
                      href={`/results?category=${encodeURIComponent(tile.slug)}`}
                      data-testid="explore-card"
                      data-entry={tile.slug}
                      className={`flex flex-col items-center gap-2 px-2.5 py-4 text-ink hover:bg-[#FAFAFB] ${tile.n ? "" : "opacity-60"}`}
                    >
                      <span className="relative flex h-[72px] w-full items-center justify-center">
                        {img ? (
                          <Image src={cutout(img)!} alt="" fill sizes="96px" className="object-contain" />
                        ) : null}
                      </span>
                      <span className="text-center text-[13px] font-semibold leading-tight">{tile.name}</span>
                      <span className="font-mono text-[11px] text-ink-muted">{tile.n ? plural(tile.n, "product") : "Coming soon"}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          />
        </div>
      </section>

      {/* ─── Supplier strip ─────────────────────────────────────────────── */}
      <section className="px-4 py-10 text-center lg:px-14">
        <p className="text-[15px] text-ink-body">
          Published prices from <b className="text-ink">{plural(suppliers.length, "verified supplier")}</b>, including
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-x-10 gap-y-3">
          {supplierNames.map((n) => (
            <span key={n} className="text-[19px] font-semibold tracking-[-0.02em] text-ink-faint">
              {n}
            </span>
          ))}
        </div>
      </section>

      {/* ─── How it works ───────────────────────────────────────────────── */}
      <section id="how" className="scroll-mt-28 px-4 pb-10 pt-6 lg:px-14">
        <h2 className="mx-auto max-w-[900px] py-8 text-center text-3xl font-semibold leading-[1.1] tracking-[-0.04em] lg:py-10 lg:text-[44px]">
          Compare what suppliers actually publish, then send one request to all of them.
        </h2>

        <HowRow n="01 · Prices" title="Real prices, before you ask." cta={{ label: "Browse products →", href: "/results" }}
          body="Every listing shows the supplier’s published price, the quantity it applies to, the minimum order and the date we checked it, with a link back to the source.">
          {priceExample ? <PriceReceipt product={priceExample} /> : null}
        </HowRow>
        <HowRow n="02 · Compare" title="Side by side, without the spreadsheet." cta={{ label: "Try it on popular products →", href: "#products" }} flip
          body="Pick up to four products. We standardise units, flag the differences, and mark anything a supplier hasn’t published so it’s never counted as zero.">
          {cmpA && cmpB ? <MiniCompare a={cmpA} b={cmpB} /> : null}
        </HowRow>
        <HowRow n="03 · Request" title="One basket. Every supplier." cta={{ label: "Open your Quote Basket →", href: "/basket" }}
          body="Mix bottles, closures and labels from different suppliers in one Quote Basket. Send once; each supplier gets only their own items and replies to you directly.">
          <BasketPreview products={basketExample} />
        </HowRow>
      </section>

      {/* ─── Category cards ─────────────────────────────────────────────── */}
      <section className="border-t border-line bg-[#FAFAFB] px-4 py-16 lg:px-14 lg:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl font-semibold leading-[1.05] tracking-[-0.04em] lg:text-[40px]">Source bottles, pouches, labels and more</h2>
          <Link href="/results" className="text-[15px] font-medium text-orange-ink hover:text-orange">Browse all packaging →</Link>
        </div>
        <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="category-cards">
          {CATEGORY_CARDS.map((c) => {
            const n = c.slugs.reduce((a, s) => a + (count.get(s) ?? 0), 0);
            return (
              <Link key={c.title} href={c.href} className="flex flex-col overflow-hidden rounded-2xl border border-line-strong bg-paper text-ink hover:border-ink">
                <span className="relative flex h-[200px] items-center justify-center bg-well">
                  <span className="relative block h-[80%] w-[60%]">
                    <Image src={cutout(c.img)!} alt="" fill sizes="(min-width: 1024px) 20vw, 60vw" className="object-contain drop-shadow-[0_14px_14px_rgba(24,26,33,.16)]" />
                  </span>
                </span>
                <span className="flex flex-col gap-2 p-5">
                  <span className="text-xl font-semibold tracking-[-0.02em]">{c.title}</span>
                  <span className="text-sm leading-[1.55] text-ink-body">{c.body}</span>
                  <span className="mt-1.5 text-sm font-semibold text-orange-ink">
                    {n ? `View ${n} ${c.title.toLowerCase()} →` : `View ${c.title.toLowerCase()} →`}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ─── Popular products ───────────────────────────────────────────── */}
      <section id="products" className="scroll-mt-28 border-t border-line px-4 py-16 lg:px-14 lg:py-20" data-testid="featured-rail-section">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="tag text-orange-ink">Popular products</p>
            <h2 className="mt-2.5 text-3xl font-semibold leading-[1.05] tracking-[-0.04em] lg:text-[40px]">Popular right now</h2>
            <p className="mt-2.5 max-w-[560px] text-sm leading-[1.55] text-ink-muted">
              Prices, minimums and suppliers as published. Add any of them to compare side by side.
            </p>
          </div>
          <HeaderTabs
            tabs={setProducts.map((s) => s.label)}
            aside={<span className="text-[13px] text-ink-muted">Compare to see them side by side · Add to Quote Basket to request quotes</span>}
            panels={setProducts.map((set) => (
              <div key={set.label} data-testid="featured-rail" className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {set.items.map((p) => (
                  <ProductCard key={p.id} product={p} now={now} />
                ))}
                {set.items.length < 4 || set.total > set.items.length ? (
                  <Link href={set.href} className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-line-strong py-10 text-ink hover:border-ink ${set.items.length === 4 ? "sm:col-span-2 lg:col-span-4" : ""}`}>
                    <span className="text-[32px] font-semibold tracking-[-0.03em]">{set.total}</span>
                    <span className="text-sm font-medium">See all {set.label.toLowerCase()} →</span>
                  </Link>
                ) : null}
              </div>
            ))}
          />
        </div>
      </section>

      {/* ─── Suppliers ──────────────────────────────────────────────────── */}
      <section id="suppliers" className="border-t border-line px-4 py-16 lg:px-14 lg:py-20">
        <div className="text-center">
          <h2 className="text-3xl font-semibold leading-[1.05] tracking-[-0.04em] lg:text-[40px]">Our suppliers</h2>
          <p className="mt-3 text-base text-ink-body">Each one is a verified business. Tiers are earned, never bought.</p>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {supplierTiles.map((s) => (
            <Link key={s.slug} href={`/suppliers/${s.slug}`} className="flex flex-col items-center gap-2.5 rounded-[14px] border border-line-strong px-3 py-[22px] text-center text-ink hover:border-ink">
              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-well font-mono text-base font-semibold">
                {s.name.replace(/[^A-Za-z ]/g, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
              </span>
              <span className="text-sm font-semibold leading-tight">{s.name}</span>
              <TierPill status={s.status} />
            </Link>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link href="/suppliers" className="text-[15px] font-semibold text-orange-ink hover:text-orange">Browse all {suppliers.length} suppliers →</Link>
        </div>
      </section>

      {/* ─── Partner spotlight ──────────────────────────────────────────── */}
      {partner && partner.products.length > 0 ? (
        <section id="partner" className="px-4 pb-16 lg:px-14 lg:pb-20">
          <SpotlightCarousel
            products={partner.products.slice(0, 6)}
            partnerName={partner.profile.name}
            partnerSlug={partner.profile.slug}
            logoUrl={partner.profile.logoUrl}
          />
        </section>
      ) : null}

      {/* ─── FAQ ────────────────────────────────────────────────────────── */}
      <section id="faq" className="scroll-mt-28 border-t border-line bg-[#FAFAFB] px-4 py-16 lg:px-14 lg:py-20">
        <div className="mx-auto max-w-[880px]">
          <h2 className="text-center text-3xl font-semibold leading-[1.05] tracking-[-0.04em] lg:text-[40px]">Frequently asked questions</h2>
          <div className="mt-7 border-t-[1.5px] border-ink">
            {FAQ.map(([q, a], i) => (
              <details key={q} open={i === 0} className="group border-b border-line-strong">
                <summary className="flex min-h-[68px] cursor-pointer list-none items-center gap-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                  {q}
                  <span aria-hidden className="ml-auto flex-none text-2xl font-light group-open:hidden">+</span>
                  <span aria-hidden className="ml-auto hidden flex-none text-2xl font-light group-open:inline">−</span>
                </summary>
                <p className="pb-[22px] pr-12 text-base leading-relaxed text-ink-body">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA band ───────────────────────────────────────────────────── */}
      <section className="bg-chrome px-4 py-20 text-center text-on-chrome lg:px-14 lg:py-24">
        <h2 className="text-4xl font-bold leading-none tracking-[-0.05em] lg:text-6xl">Let&rsquo;s get you sourcing.</h2>
        <p className="mx-auto mt-[18px] max-w-[560px] text-lg leading-[1.55] text-on-chrome-muted">
          Search {totalProducts} products from {plural(suppliers.length, "verified supplier")}, or send one request to several at once.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/results" className="flex h-[54px] items-center rounded-full bg-orange px-[26px] text-base font-semibold text-on-orange hover:bg-orange-hi">Browse packaging</Link>
          <Link href="/basket" className="flex h-[54px] items-center rounded-full border-[1.5px] border-on-chrome px-[26px] text-base font-semibold text-on-chrome">Open Quote Basket</Link>
        </div>
      </section>
    </div>
  );
}

function HowRow({
  n,
  title,
  body,
  cta,
  flip = false,
  children,
}: {
  n: string;
  title: string;
  body: string;
  cta: { label: string; href: string };
  flip?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 items-center gap-10 border-t border-line py-12 lg:grid-cols-2 lg:gap-[72px] lg:py-14">
      <div className={flip ? "lg:order-2" : ""}>
        <p className="tag text-orange-ink">{n}</p>
        <h3 className="mt-3 text-3xl font-semibold leading-[1.05] tracking-[-0.04em] lg:text-[40px]">{title}</h3>
        <p className="mt-4 max-w-[460px] text-[17px] leading-relaxed text-ink-body">{body}</p>
        <Link href={cta.href} className="mt-5 inline-flex text-[15px] font-semibold text-orange-ink hover:text-orange">{cta.label}</Link>
      </div>
      <div className={`flex min-h-[300px] items-center justify-center rounded-[20px] bg-well p-6 lg:min-h-[340px] lg:p-10 ${flip ? "lg:order-1" : ""}`}>{children}</div>
    </div>
  );
}

function PriceReceipt({ product }: { product: ProductVM }) {
  const u = unitPrice(product);
  const cur = priceCurrency(product.priceBasis);
  const img = cutout(product.primaryImage?.url);
  return (
    <div className="relative h-[300px] w-full max-w-[420px]">
      {img ? (
        <span className="absolute left-2.5 top-0 block h-[290px] w-[150px]">
          <Image src={img} alt="" fill sizes="150px" className="object-contain drop-shadow-[0_20px_18px_rgba(24,26,33,.18)]" />
        </span>
      ) : null}
      <div className="absolute right-0 top-[30px] w-[240px] rotate-2 rounded-[4px] bg-paper p-[18px] shadow-[0_18px_36px_-12px_rgba(24,26,33,.3)]">
        <p className="font-mono text-[11px] text-ink-muted">PUBLISHED PRICE · {cur}</p>
        <p className="mt-1.5">
          <b className="text-4xl tracking-[-0.04em]">{u ? formatUnitMoney(u.amount, u.currency) : formatMoney(product.basePrice!, cur)}</b>{" "}
          <span className="text-ink-muted">/ {u?.unit ?? "unit"}</span>
        </p>
        <p className="mt-1 text-[13px]">
          {formatMoney(product.basePrice!, cur)} {shortBasis(product.priceBasis) ?? ""}
        </p>
        <div className="mt-3 flex justify-between border-t border-dashed border-[#9CA3AF] pt-2.5 text-[13px]">
          <span className="text-ink-muted">MOQ</span>
          <b className="max-w-[60%] truncate text-right">{formatMoqShort(product.moq, product.moqUnit)}</b>
        </div>
        <div className="mt-1 flex justify-between text-[13px]">
          <span className="text-ink-muted">Checked</span>
          <span>{formatCaptureDate(product.sourceCapturedAt)}</span>
        </div>
        <a href={product.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block text-[13px] font-medium text-orange-ink">
          {domainOf(product.sourceUrl) ?? "Source"} ↗
        </a>
      </div>
    </div>
  );
}

function MiniCompare({ a, b }: { a: ProductVM; b: ProductVM }) {
  const ua = unitPrice(a)!;
  const ub = unitPrice(b)!;
  const p100 = (p: ProductVM, u: NonNullable<ReturnType<typeof unitPrice>>) => (u.amount / p.specs.capacity!.value) * 100;
  const va = p100(a, ua);
  const vb = p100(b, ub);
  const cellLow = "bg-orange-tint";
  const rows: [string, React.ReactNode, React.ReactNode, boolean?, boolean?][] = [
    ["Unit price", `${formatUnitMoney(ua.amount, ua.currency)}`, `${formatUnitMoney(ub.amount, ub.currency)}`, ua.unit === ub.unit && ua.amount < ub.amount, ua.unit === ub.unit && ub.amount < ua.amount],
    ["Per 100 ml", formatUnitMoney(va, ua.currency), formatUnitMoney(vb, ub.currency), va < vb, vb < va],
    ["MOQ", formatMoqShort(a.moq, a.moqUnit), formatMoqShort(b.moq, b.moqUnit)],
  ];
  return (
    <div className="w-full max-w-[480px] overflow-hidden rounded-xl border border-line-strong bg-paper text-sm shadow-[0_18px_36px_-18px_rgba(24,26,33,.3)]">
      <div className="grid grid-cols-[110px_1fr_1fr]">
        <span className="bg-[#FAFAFB] p-3" />
        <span className="truncate bg-[#FAFAFB] p-3 font-semibold">{a.specs.capacity!.label.split(" (")[0]} · {a.supplier.name.split(" ")[0]}</span>
        <span className="truncate bg-[#FAFAFB] p-3 font-semibold">{b.specs.capacity!.label.split(" (")[0]} · {b.supplier.name.split(" ")[0]}</span>
        {rows.map(([k, x, y, lowX, lowY]) => (
          <div key={k} className="contents">
            <span className="tag border-t border-line p-3 text-ink-muted">{k}</span>
            <span className={`truncate border-t border-line p-3 font-semibold ${lowX ? cellLow : ""}`}>{x}</span>
            <span className={`truncate border-t border-line p-3 font-semibold ${lowY ? cellLow : ""}`}>{y}</span>
          </div>
        ))}
        <span className="tag border-t border-line p-3 text-ink-muted">Shipping</span>
        <span className="border-t border-line p-3 text-orange-ink">? Quoted by supplier</span>
        <span className="border-t border-line p-3 text-orange-ink">? Quoted by supplier</span>
      </div>
    </div>
  );
}

function BasketPreview({ products }: { products: ProductVM[] }) {
  return (
    <div className="w-full max-w-[440px] overflow-hidden rounded-xl border border-line-strong bg-paper shadow-[0_18px_36px_-18px_rgba(24,26,33,.3)]">
      <div className="border-b border-line px-4 py-3.5">
        <p className="text-base font-semibold">Quote Basket</p>
        <p className="text-[13px] text-ink-muted">
          Example · {products.length} products · {products.length} suppliers
        </p>
      </div>
      {products.map((p) => (
        <div key={p.id} className="border-b border-line px-4 py-3">
          <p className="flex text-sm font-semibold">
            {p.supplier.name}
            <span className="ml-auto font-normal text-ink-muted">gets 1 product</span>
          </p>
          <p className="mt-1 flex gap-2 text-[13px] text-ink-body">
            <span className="min-w-0 flex-1 truncate">{p.title}</span>
            <b className="flex-none font-semibold text-ink">{p.moq?.toLocaleString("en-US")} {(unitPrice(p)?.unit ?? "unit") + "s"}</b>
          </p>
        </div>
      ))}
      <Link href="/basket" className="flex h-12 w-full items-center justify-center bg-orange text-[15px] font-semibold text-on-orange">
        Request quotes from {products.length} suppliers →
      </Link>
    </div>
  );
}
