import Link from "next/link";

import { accountLinks } from "@/lib/auth/account-links";
import { getCurrentUserRole, getServerSessionUser } from "@/lib/auth/session";

import { SignOutButton } from "./account-menu";

// Footer (v12 marketplace design): dark, five columns, the image disclaimer.

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "By category",
    links: [
      { label: "Glass Bottles", href: "/results?category=glass-bottles" },
      { label: "Plastic Jars & Canisters", href: "/results?category=plastic-jars" },
      { label: "Flexible Pouches & Bags", href: "/results?category=pouches-bags" },
      { label: "Labels", href: "/results?category=labels" },
      { label: "Mailers & E-Commerce", href: "/results?category=mailers" },
    ],
  },
  {
    title: "Buyers",
    links: [
      { label: "Browse all products", href: "/results" },
      { label: "Quote Basket", href: "/basket" },
      { label: "My account & requests", href: "/account" },
      { label: "How it works", href: "/#how" },
    ],
  },
  {
    title: "Suppliers",
    links: [
      { label: "All suppliers", href: "/suppliers" },
      { label: "Partners", href: "/partners" },
      { label: "List your company", href: "/list-your-company" },
      { label: "Fetch products from my site", href: "/list-your-company?type=fetch" },
      { label: "Become a partner", href: "/partners/apply" },
    ],
  },
  { title: "Account", links: [{ label: "Sign in", href: "/auth/sign-in" }] },
];

export async function SiteFooter() {
  const session = await getServerSessionUser().catch(() => null);
  const role = session ? await getCurrentUserRole(session.supabaseUserId).catch(() => null) : null;
  const columns = session
    ? COLUMNS.map((col) => (col.title === "Account" ? { ...col, links: accountLinks(role) } : col))
    : COLUMNS;
  return (
    <footer className="bg-chrome-deep px-5 pb-28 pt-14 text-sm text-on-chrome lg:px-14 lg:pb-7">
      <div className="grid grid-cols-2 gap-8 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
        <div className="col-span-2 lg:col-span-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-white.png" alt="Aekobaba" className="block h-[26px] w-auto" />
          <p className="mt-3.5 max-w-[300px] leading-relaxed text-on-chrome-muted">
            Packaging discovery for consumer brands. An{" "}
            <a href="https://www.aekovera.com" className="text-on-chrome underline-offset-2 hover:underline">
              Aekovera
            </a>{" "}
            company.
          </p>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title} className="flex flex-col gap-[9px]">
            <p className="font-semibold">{col.title}</p>
            {col.links.map((l) => (
              <Link key={l.href} href={l.href} className="text-on-chrome-muted hover:text-on-chrome">
                {l.label}
              </Link>
            ))}
            {session && col.title === "Account" ? (
              <SignOutButton className="text-left text-on-chrome-muted hover:text-on-chrome" />
            ) : null}
          </nav>
        ))}
      </div>
      <div className="mt-10 flex flex-col gap-2 border-t border-chrome-raised pt-4 text-[13px] text-on-chrome-muted sm:flex-row sm:justify-between">
        <span>© {new Date().getFullYear()} Aekobaba</span>
        <span>Product images are representative illustrations unless marked as supplier photos.</span>
      </div>
    </footer>
  );
}
