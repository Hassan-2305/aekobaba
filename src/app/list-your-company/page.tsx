import type { Metadata } from "next";
import Link from "next/link";

import { ApplicationForm } from "@/components/supplier/application-form";
import { getServerSessionUser } from "@/lib/auth/session";
import { CATEGORY_GROUPS } from "@/lib/catalog/menu";

// Supplier onboarding: list your company, or ask us to fetch your products.
// Both need a signed-in account (sign-in comes first, then the form).

export const metadata: Metadata = {
  title: "List your company — Aekobaba",
  description: "Apply to list your packaging company on Aekobaba, or ask us to add your products from your website.",
};
export const dynamic = "force-dynamic";

export default async function ListYourCompanyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { type } = await searchParams;
  const fetchMode = type === "fetch";
  const session = await getServerSessionUser().catch(() => null);
  const here = fetchMode ? "/list-your-company?type=fetch" : "/list-your-company";

  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-12 sm:px-8">
      <p className="tag text-orange-ink">For suppliers</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink">
        {fetchMode ? "Fetch products from my site" : "List your company"}
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-body">
        {fetchMode
          ? "Tell us where your products live. The Aekovera team reviews your site and confirms with you before extracting anything; extracted products are checked before they go live, and every price keeps its source link and date."
          : "Aekobaba lists US packaging suppliers with published prices. Apply below and the Aekovera team will review your company and get in touch."}
      </p>

      <nav aria-label="Application type" className="mt-6 flex gap-2 text-sm">
        <Link
          href="/list-your-company"
          className={`rounded-full border px-4 py-1.5 ${!fetchMode ? "border-ink bg-ink text-paper" : "border-line-strong text-ink hover:border-ink"}`}
        >
          List your company
        </Link>
        <Link
          href="/list-your-company?type=fetch"
          className={`rounded-full border px-4 py-1.5 ${fetchMode ? "border-ink bg-ink text-paper" : "border-line-strong text-ink hover:border-ink"}`}
        >
          Fetch products from my site
        </Link>
        <Link href="/partners/apply" className="rounded-full border border-line-strong px-4 py-1.5 text-ink hover:border-ink">
          Become a partner
        </Link>
      </nav>

      <div className="mt-8 rounded-xl border border-line-strong bg-paper p-6">
        {session ? (
          <ApplicationForm
            type={fetchMode ? "PRODUCT_FETCH" : "LISTING"}
            categories={CATEGORY_GROUPS.map((g) => g.name)}
            defaults={{ contactEmail: session.email ?? null }}
          />
        ) : (
          <div className="text-sm">
            <p className="text-ink">Sign in first — your application is tied to your account so you can follow it up.</p>
            <div className="mt-4 flex gap-3">
              <Link
                href={`/auth/sign-in?next=${encodeURIComponent(here)}`}
                className="inline-flex h-10 items-center rounded-md bg-ink px-5 font-medium text-paper hover:bg-ink/85"
              >
                Sign in
              </Link>
              <Link
                href={`/auth/sign-up?next=${encodeURIComponent(here)}`}
                className="inline-flex h-10 items-center rounded-md border border-ink px-5 font-medium text-ink hover:bg-well"
              >
                Create an account
              </Link>
            </div>
          </div>
        )}
      </div>
      <p className="mt-6 text-sm text-ink-muted">
        Already listed on Aekobaba?{" "}
        <Link href="/supplier/claim" className="text-orange-ink underline">
          Claim your existing listing
        </Link>
        .
      </p>
    </div>
  );
}
