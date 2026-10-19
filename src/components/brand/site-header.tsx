import Link from "next/link";

import { CATEGORY_GROUPS } from "@/lib/catalog/menu";
import { BasketButton, CompareLink, MegaMenu, MobileMenu } from "./header-islands";

// Global header (v12 marketplace design):
//
//   utility bar   dark — the trust line + supplier / partner / request links
//   main bar      logo · Browse packaging (mega menu) · nav · search ·
//                 Compare · Quote Basket (popover) · Sign in
//   category row  the seven category groups + Low MOQ / Sustainable
//
// Server-rendered and static (no DB): live counts load inside the mega menu.

const NAV = [
  { label: "Suppliers", href: "/suppliers" },
  { label: "Partners", href: "/partners" },
  { label: "How it works", href: "/#how" },
];

export function SiteHeader() {
  return (
    <>
      <div className="hidden h-9 items-center gap-5 bg-chrome px-5 text-[13px] text-on-chrome-muted md:flex lg:px-14">
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#2BB673]" />
          Every price is dated and linked to the supplier&rsquo;s own page
        </span>
        <span className="ml-auto flex gap-5">
          <Link href="/list-your-company" className="text-on-chrome hover:underline">List your company</Link>
          <Link href="/partners/apply" className="text-on-chrome hover:underline">Become a partner</Link>
          <Link href="/account/requests" className="text-on-chrome hover:underline">Your quote requests</Link>
        </span>
      </div>

      <header className="sticky top-0 z-30 border-b border-line bg-paper">
        <div className="relative flex h-14 items-center gap-2 px-4 lg:h-[68px] lg:px-14">
          <Link href="/" aria-label="Aekobaba — home" className="mr-auto flex flex-none lg:mr-[18px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.png" alt="Aekobaba" className="block h-6 w-auto lg:h-7" />
          </Link>

          <nav aria-label="Primary" className="hidden items-center gap-0.5 lg:flex">
            <MegaMenu />
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="flex h-10 flex-none items-center whitespace-nowrap rounded-md px-3 text-[15px] font-medium text-ink hover:bg-well"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 lg:ml-auto">
            <form action="/results" role="search" className="hidden xl:block">
              <label htmlFor="site-search" className="sr-only">
                Search packaging
              </label>
              <div className="flex h-10 w-[220px] items-center gap-2 rounded-md border border-line-strong px-3 text-sm text-ink-muted focus-within:border-ink">
                <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <input
                  id="site-search"
                  type="search"
                  name="q"
                  placeholder="Search packaging"
                  className="min-w-0 flex-1 bg-transparent text-ink placeholder:text-ink-muted focus:outline-none"
                />
              </div>
            </form>
            <CompareLink />
            <BasketButton />
            <Link href="/auth/sign-in" className="hidden h-10 items-center whitespace-nowrap px-2.5 text-sm font-medium text-ink lg:flex">
              Sign in
            </Link>
            <MobileMenu links={[...NAV, { label: "Browse all products", href: "/results" }, { label: "Sign in", href: "/auth/sign-in" }]} />
          </div>
        </div>
      </header>

      <nav
        aria-label="Categories"
        className="no-scrollbar flex h-[46px] items-center gap-1 overflow-x-auto whitespace-nowrap border-b border-line bg-paper px-3 lg:px-12"
      >
        {CATEGORY_GROUPS.map((g) => (
          <Link
            key={g.id}
            href={`/results?group=${g.id}`}
            className="flex h-[34px] flex-none items-center rounded-[6px] px-3 text-sm font-medium text-ink hover:bg-well"
          >
            {g.name}
          </Link>
        ))}
        <span aria-hidden className="mx-2 h-[18px] w-px flex-none bg-line-strong" />
        <Link href="/results?maxMoq=100" className="flex-none px-3 text-sm font-medium text-ink hover:text-orange-ink">
          Low MOQ
        </Link>
        <Link href="/results?category=compostables" className="flex-none px-3 text-sm font-medium text-ink hover:text-orange-ink">
          Sustainable
        </Link>
      </nav>
    </>
  );
}
