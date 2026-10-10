import Link from "next/link";

import { CATEGORY_MENU } from "@/lib/catalog/menu";
import { POPULAR_CATEGORY_SLUGS } from "@/lib/catalog/popular";

// Global footer — closes every page in the dark world. Static navigation only
// (no DB), mirroring the header's build-safety rule.

// The curated, most-stocked material categories — the footer never points at
// an empty shelf.
const FOOTER_CATEGORIES = CATEGORY_MENU.filter((c) =>
  (POPULAR_CATEGORY_SLUGS as readonly string[]).includes(c.slug),
);

export function SiteFooter() {
  return (
    <footer className="tone-dark grain border-t border-line-dark bg-void text-on-dark">
      <div className="mx-auto grid max-w-[1400px] gap-12 px-5 py-16 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div className="max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="Aekobaba" className="h-7 w-auto dark:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-white.png"
            alt="Aekobaba"
            className="hidden h-7 w-auto dark:block"
          />
          <p className="mt-3 text-xs text-on-dark-muted">
            An{" "}
            <a
              href="https://www.aekovera.com"
              className="text-on-dark underline decoration-on-dark/30 underline-offset-4 hover:decoration-orange"
            >
              Aekovera
            </a>{" "}
            company
          </p>
          <p className="mt-6 text-sm leading-relaxed text-on-dark-muted">
            Packaging discovery for consumer brands. Every price on Aekobaba comes from the
            supplier&rsquo;s own page — and links back to it.
          </p>
        </div>

        <nav aria-label="Popular categories">
          <h2 className="text-sm text-on-dark">Catalog</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {FOOTER_CATEGORIES.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/results?category=${encodeURIComponent(category.slug)}`}
                  className="text-on-dark-muted transition-colors hover:text-on-dark"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Platform">
          <h2 className="text-sm text-on-dark">Platform</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link
                href="/results"
                className="text-on-dark-muted transition-colors hover:text-on-dark"
              >
                Browse all products
              </Link>
            </li>
            <li>
              <Link
                href="/basket"
                className="text-on-dark-muted transition-colors hover:text-on-dark"
              >
                Quote Basket
              </Link>
            </li>
            <li>
              <Link
                href="/account/requests"
                className="text-on-dark-muted transition-colors hover:text-on-dark"
              >
                Your quote requests
              </Link>
            </li>
            <li>
              <Link
                href="/supplier/claim"
                className="text-on-dark-muted transition-colors hover:text-on-dark"
              >
                List your company
              </Link>
            </li>
            <li>
              <Link
                href="/auth/sign-in"
                className="text-on-dark-muted transition-colors hover:text-on-dark"
              >
                Sign in
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line-dark">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-2 px-5 py-5 text-xs text-on-dark-muted sm:flex-row sm:justify-between lg:px-8">
          <p>&copy; {new Date().getFullYear()} Aekobaba</p>
          <p>Product images are representative illustrations, not supplier photography.</p>
        </div>
      </div>
    </footer>
  );
}
