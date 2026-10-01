import type { Metadata } from "next";
import Link from "next/link";

// Reached when middleware denies a role-restricted route. Says exactly why and
// what to do next — no dead ends, no invented account states.

export const metadata: Metadata = {
  title: "Access restricted · Aekobaba",
};

export default function AccessDeniedPage() {
  return (
    <div className="font-sans flex min-h-[calc(100vh-57px)] flex-col items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-md border border-line bg-card p-8 text-center">
        <h1 className="font-semiwide text-2xl font-light tracking-tight text-ink">
          This area is restricted
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Your account doesn&apos;t have access to this area. Supplier tools are for
          supplier accounts and admin tools are for the Aekobaba team. If you
          believe this is wrong, contact us and we&apos;ll sort it out.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/"
            className="flex h-10 items-center justify-center bg-accent text-sm font-medium text-white transition-colors hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Back to the marketplace
          </Link>
          <Link
            href="/auth/sign-in"
            className="flex h-10 items-center justify-center border border-line bg-card text-sm font-medium text-ink transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Sign in with a different account
          </Link>
        </div>
      </div>
    </div>
  );
}
