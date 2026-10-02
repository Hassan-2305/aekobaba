import Link from "next/link";

import { CATEGORY_MENU } from "@/lib/catalog/menu";
import { BasketBadge } from "@/components/quotes/basket-badge";
import { ChevronDown, SearchIcon } from "./icons";
import { ThemeToggle } from "./theme-toggle";

// Global header — dark brand chrome on every page. Server-rendered with no
// client JS: the category menu is a native <details> disclosure and search is
// a plain GET form to /results. The menu is static navigation
// (src/lib/catalog/menu.ts) — no DB query, so prerendered pages stay
// build-safe.
//
// Structure follows the layout grid: a logo cell closed by a hairline, the
// navigation, then search and the Quote Basket at the far edge.

export function SiteHeader() {
  return (
    <header className="relative z-30 border-b border-line-dark bg-void text-on-dark">
      <div className="flex flex-wrap items-stretch sm:flex-nowrap">
        <Link
          href="/"
          aria-label="Aekobaba — home"
          className="flex shrink-0 items-center py-4 pl-5 pr-6 lg:h-[76px] lg:w-[var(--rail-w)] lg:pl-[var(--edge)]"
        >
          {/* Wordmark per theme: ink on light, white on dark. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="Aekobaba" className="h-8 w-auto dark:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-white.png"
            alt="Aekobaba"
            className="hidden h-8 w-auto dark:block"
          />
        </Link>

        <nav
          aria-label="Primary"
          className="order-4 flex w-full items-center gap-6 border-t border-line-dark px-5 text-sm sm:order-none sm:w-auto sm:border-t-0 sm:px-8 lg:gap-9 lg:pl-12 lg:text-[15px]"
        >
          <Link
            href="/results"
            className="py-3 text-on-dark/80 transition-colors hover:text-on-dark"
          >
            Catalog
          </Link>
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 py-3 text-on-dark/80 transition-colors hover:text-on-dark [&::-webkit-details-marker]:hidden">
              Categories
              <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
            </summary>
            <div className="absolute left-0 top-full z-40 mt-[13px] w-[min(92vw,560px)] border border-line-dark bg-navy p-2 shadow-[0_30px_60px_-20px_rgba(0,0,0,.7)]">
              <ul className="grid grid-cols-1 sm:grid-cols-2">
                {CATEGORY_MENU.map((category) => (
                  <li key={category.slug}>
                    <Link
                      href={`/results?category=${encodeURIComponent(category.slug)}`}
                      className="block px-3 py-2 text-sm text-on-dark/80 transition-colors hover:bg-surface-2 hover:text-on-dark"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </details>
          <Link
            href="/suppliers"
            className="whitespace-nowrap py-3 text-on-dark/80 transition-colors hover:text-on-dark"
          >
            Suppliers
          </Link>
          <Link
            href="/#how-it-works"
            className="hidden whitespace-nowrap py-3 text-on-dark/80 transition-colors hover:text-on-dark xl:block"
          >
            How it works
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-3 py-3 pr-5 lg:gap-4 lg:pr-[var(--edge)]">
          <form action="/results" role="search" className="hidden lg:block">
            <label htmlFor="site-search" className="sr-only">
              What are you packaging?
            </label>
            <div className="flex h-11 w-72 items-center border border-line-dark bg-surface transition-colors focus-within:border-orange xl:w-[300px]">
              <SearchIcon size={15} className="ml-3 shrink-0 text-on-dark-muted" />
              <input
                id="site-search"
                type="search"
                name="q"
                placeholder="Search pouches, jars, labels…"
                className="h-full w-full bg-transparent px-2.5 text-sm text-on-dark placeholder:text-on-dark-muted/70 focus:outline-none"
              />
            </div>
          </form>
          <ThemeToggle />
          <BasketBadge />
          <Link
            href="/auth/sign-in"
            className="whitespace-nowrap px-1 text-sm text-on-dark/80 transition-colors hover:text-on-dark"
          >
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}
