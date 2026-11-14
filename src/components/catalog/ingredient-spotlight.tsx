import Image from "next/image";
import Link from "next/link";

import { formatCaptureDate } from "@/lib/catalog/format";
import type { IngredientSupplierProfile } from "@/lib/catalog/ingredient-suppliers";
import type { ProductVM } from "@/lib/catalog/view-models";

// Ingredient-supplier spotlight: the supplier's story, sourced proof points
// and its ingredients, strongest first. Used at the head of /ingredients and
// on the supplier's own page. Every fact links to where it was published.

export function IngredientSpotlight({
  profile,
  name,
  products,
  showStorefrontLink = true,
}: {
  profile: IngredientSupplierProfile;
  name: string;
  /** The supplier's ingredients, already ranked. */
  products: ProductVM[];
  showStorefrontLink?: boolean;
}) {
  return (
    <article
      data-testid="ingredient-spotlight"
      className="overflow-hidden rounded-xl border border-line-strong bg-card shadow-[0_30px_60px_-44px_rgba(16,19,24,.45)]"
    >
      <div className="grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="flex flex-col p-6 sm:p-8 lg:p-10">
          <p className="tag flex items-center gap-2 text-ink-faint">
            <span aria-hidden className="h-[9px] w-[9px] bg-[#2BB673]" />
            Ingredient supplier spotlight
          </p>
          <h2 className="mt-4 font-semiwide text-3xl font-light leading-[1.05] tracking-[-0.025em] text-ink sm:text-4xl">
            {name}
          </h2>
          <p className="mt-2 text-base text-ink-muted">{profile.tagline}</p>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-muted">{profile.summary}</p>

          <dl className="mt-7 grid grid-cols-2 border-y border-line sm:grid-cols-4">
            {profile.facts.map((fact, i) => (
              <div
                key={fact.label}
                className={`py-4 ${i % 2 === 1 ? "border-l border-line pl-4" : "pr-4"} ${
                  i > 0 ? "sm:border-l sm:border-line sm:pl-4" : ""
                } ${i >= 2 ? "border-t border-line sm:border-t-0" : ""}`}
              >
                <dd className="text-2xl font-semibold leading-none tracking-tight text-ink tabular-nums">
                  {fact.value}
                </dd>
                <dt className="mt-2 text-xs leading-snug text-ink-muted">
                  <a
                    href={fact.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-ink/15 underline-offset-[3px] hover:decoration-orange"
                  >
                    {fact.label}
                  </a>
                </dt>
              </div>
            ))}
          </dl>

          <ul className="mt-6 space-y-2 text-sm text-ink">
            {profile.reasons.map((reason) => (
              <li key={reason} className="flex gap-2.5">
                <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2BB673" strokeWidth="2.4" className="mt-0.5 shrink-0">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
                {reason}
              </li>
            ))}
          </ul>

          <p className="mt-6 text-xs text-ink-faint">
            Figures are {name}&rsquo;s own published claims and dated press, checked{" "}
            {formatCaptureDate(profile.capturedAt)}.
          </p>
          {showStorefrontLink ? (
            <div className="mt-6">
              <Link
                href={`/suppliers/${profile.slug}`}
                className="inline-flex h-11 items-center gap-2 bg-orange px-5 text-sm font-medium text-on-orange transition-colors hover:bg-orange-hi"
              >
                View {name}
                <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 12h15M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
          ) : null}
        </div>

        <div className="relative grid min-h-[280px] grid-cols-2 gap-px bg-line lg:grid-cols-1 lg:grid-rows-[3fr_2fr]">
          <div className="relative col-span-2 min-h-[220px] lg:col-span-1">
            <Image
              src={profile.heroImage.url}
              alt={profile.heroImage.alt}
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="relative col-span-2 grid grid-cols-2 gap-px lg:col-span-1">
            <div className="relative min-h-[140px]">
              <Image
                src={profile.detailImage.url}
                alt={profile.detailImage.alt}
                fill
                sizes="(min-width: 1024px) 20vw, 50vw"
                className="object-cover"
              />
            </div>
            {products[0]?.primaryImage ? (
              <Link href={`/products/${products[0].id}`} className="group relative min-h-[140px]">
                <Image
                  src={products[0].primaryImage.url}
                  alt={products[0].primaryImage.alt ?? products[0].title}
                  fill
                  sizes="(min-width: 1024px) 20vw, 50vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <span className="tag absolute bottom-2 left-2 bg-card/90 px-1.5 py-0.5 text-[10px] text-ink">
                  Flagship · {products[0].title.split(" — ")[0]}
                </span>
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
