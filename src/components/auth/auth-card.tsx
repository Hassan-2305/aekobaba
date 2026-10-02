import Image from "next/image";
import type { ReactNode } from "react";

// Shared shell for the auth pages. Two worlds side by side: a dark brand
// panel (desktop only) restating what an account is for, and the light form
// surface. The global header already carries the wordmark.

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100vh-57px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <aside className="tone-dark grain relative hidden overflow-hidden bg-void text-on-dark lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(45% 40% at 60% 72%, rgba(255,100,31,.12), transparent 100%)",
          }}
        />
        <p className="relative max-w-md font-semiwide text-4xl font-light leading-[1.05] tracking-[-0.03em]">
          Packaging, sourced properly.
        </p>
        <div
          aria-hidden
          className="relative mx-auto flex h-72 w-full max-w-md items-end justify-center gap-2"
        >
          <div className="relative h-[86%] w-[36%]">
            <Image
              src="/hero/coffee-valve-pouch.webp"
              alt=""
              fill
              sizes="180px"
              className="object-contain object-bottom drop-shadow-[0_20px_30px_var(--object-shadow)]"
            />
          </div>
          <div className="relative h-full w-[26%]">
            <Image
              src="/hero/glass-bottle-amber.webp"
              alt=""
              fill
              sizes="130px"
              className="object-contain object-bottom drop-shadow-[0_20px_30px_var(--object-shadow)]"
            />
          </div>
          <div className="relative h-[44%] w-[30%]">
            <Image
              src="/hero/glass-jar.webp"
              alt=""
              fill
              sizes="150px"
              className="object-contain object-bottom drop-shadow-[0_20px_30px_var(--object-shadow)]"
            />
          </div>
        </div>
        <ul className="relative space-y-3 border-t border-line-dark pt-6 text-sm text-on-dark-muted">
          <li>Send one quote request to every supplier in your basket.</li>
          <li>Track replies and samples in one place.</li>
          <li>Every price links back to the supplier&rsquo;s own page.</li>
        </ul>
      </aside>

      <div className="flex flex-col items-center justify-center bg-paper px-5 py-16">
        <div className="w-full max-w-sm">
          <h1 className="font-semiwide text-3xl font-light tracking-[-0.025em] text-ink">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">{subtitle}</p>
          ) : null}
          <div className="mt-8">{children}</div>
          {footer ? (
            <div className="mt-8 border-t border-line pt-5 text-sm text-ink-muted">{footer}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
