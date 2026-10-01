import Link from "next/link";
import type { Metadata } from "next";

// Claim entry point — deliberately minimal. The full claim flow (email
// verification, PENDING record) lands with the supplier-admin PR; this page
// keeps the supplier page's "Claim This Listing" link resolvable until then
// and routes the supplier to sign-in, where the flow begins.

export const metadata: Metadata = {
  title: "Claim this listing",
};

export default function ClaimListingPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <h1 className="font-semiwide text-2xl font-light tracking-tight text-ink">Claim this listing</h1>
      <p className="mt-3 text-sm text-ink-muted">
        Are you this supplier? Claim the listing to receive quote leads from brands directly.
        Supplier claiming opens with our supplier tools rollout — sign in and we will route you
        there the moment it is live.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/auth/sign-in"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark"
        >
          Sign in
        </Link>
        <Link
          href="/auth/sign-up"
          className="rounded-md border border-line bg-card px-4 py-2 text-sm font-medium text-ink hover:bg-accent-soft"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}
