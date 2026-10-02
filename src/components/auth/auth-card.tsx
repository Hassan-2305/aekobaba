import type { ReactNode } from "react";

import { StudioStill } from "@/components/home/studio-still";

// Auth shell — the home hero's architecture, so signing in feels like the
// same site, not a separate panel: the rail (what an account gives you), the
// editorial column with the form, and the studio still life on the right.
// The still life renders without category links here (no catalog data on
// auth pages); on small screens only the form column shows.

const PERKS = [
  {
    title: "Track every quote and sample request",
    icon: (
      <>
        <path d="M4 5h16v14H4z" />
        <path d="M8 9h8M8 13h5" />
      </>
    ),
  },
  {
    title: "Real prices from supplier pages",
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12h17M12 3.5c2.5 2.6 3.7 5.4 3.7 8.5s-1.2 5.9-3.7 8.5c-2.5-2.6-3.7-5.4-3.7-8.5S9.5 6.1 12 3.5Z" />
      </>
    ),
  },
  {
    title: "Suppliers: answer brand leads",
    icon: (
      <path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6L12 3Zm-3.5 9 2.5 2.5 4.5-5" />
    ),
  },
];

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
    <section className="relative overflow-hidden border-b border-line-dark bg-void text-on-dark lg:grid lg:min-h-[calc(100vh-77px)] lg:grid-cols-[var(--rail-w)_minmax(0,max(38.6vw,480px))_minmax(0,1fr)]">
      <aside className="relative hidden border-r border-line-dark bg-rail lg:block">
        <span
          aria-hidden
          className="absolute -right-[5px] -top-[5px] z-10 h-[9px] w-[9px] bg-orange"
        />
        <div className="flex flex-col pl-[var(--edge)] pr-3 pt-[30px]">
          <span aria-hidden className="block h-10 w-px bg-on-dark/50" />
          <p className="tag mt-[31px] max-w-[9rem] text-[12.5px] leading-[1.5] tracking-[0.12em] text-on-dark">
            Your Aekobaba account
          </p>
          <span aria-hidden className="mt-[33px] block h-px w-[45px] bg-line-dark" />
          <ul className="mt-[34px] space-y-[24px]">
            {PERKS.map((perk) => (
              <li
                key={perk.title}
                className="flex items-start gap-[clamp(12px,1.2vw,21px)] text-[clamp(13.5px,0.82vw,14.5px)] leading-[1.3] text-on-dark-muted"
              >
                <svg
                  aria-hidden
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  className="shrink-0 text-on-dark"
                >
                  {perk.icon}
                </svg>
                <span>{perk.title}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="flex flex-col justify-center px-5 py-14 sm:px-8 lg:py-[4vw] lg:pl-[max(32px,3.4vw)] lg:pr-[2vw]">
        <div className="w-full max-w-[460px]">
          <p className="tag flex items-center gap-[18px] text-[12.5px] tracking-[0.12em] text-on-dark-muted">
            <span aria-hidden className="h-[1.5px] w-[30px] bg-orange" />
            Brands &amp; suppliers
          </p>
          <h1 className="mt-5 text-[clamp(2.75rem,4.4vw,5rem)] font-extrabold leading-[0.95] tracking-[-0.045em] text-on-dark">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-4 text-[clamp(1rem,1.05vw,1.15rem)] leading-[1.5] text-on-dark-muted">
              {subtitle}
            </p>
          ) : null}
          <div className="mt-9">{children}</div>
          {footer ? (
            <div className="mt-8 border-t border-line-dark pt-5 text-sm text-on-dark-muted">
              {footer}
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative hidden lg:block">
        <StudioStill categories={[]} className="absolute inset-0 [container-type:size]" />
      </div>
    </section>
  );
}
