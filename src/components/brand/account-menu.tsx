"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { signOutAction } from "@/app/auth/actions";
import { accountLinks } from "@/lib/auth/account-links";
import type { UserRole } from "@/lib/auth/roles";

// Header account control: "Sign in" for visitors; for a signed-in account, a
// menu with the right home for their role and Sign out.

export interface HeaderAccount {
  email: string;
  role: UserRole | null;
}

export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOutAction}>
      <button type="submit" className={className}>
        Sign out
      </button>
    </form>
  );
}

export function AccountMenu({ account }: { account: HeaderAccount | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!account) {
    return (
      <Link href="/auth/sign-in" className="hidden h-10 items-center whitespace-nowrap px-2.5 text-sm font-medium text-ink lg:flex">
        Sign in
      </Link>
    );
  }

  const initial = account.email.slice(0, 1).toUpperCase();
  return (
    <div ref={ref} className="relative hidden lg:block">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 items-center gap-2 rounded-md px-2 text-sm font-medium text-ink hover:bg-well"
      >
        <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs font-semibold text-paper">
          {initial}
        </span>
        {account.role === "ADMIN" ? "Admin" : "Account"}
        <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-line-strong bg-paper p-2 shadow-[0_18px_40px_-18px_rgba(24,26,33,.35)]">
          <p className="truncate px-3 py-2 text-xs text-ink-muted">{account.email}</p>
          {accountLinks(account.role).map((l) => (
            <Link key={l.href} role="menuitem" href={l.href} onClick={() => setOpen(false)} className="block rounded-md px-3 py-2 text-sm text-ink hover:bg-well">
              {l.label}
            </Link>
          ))}
          <div className="mt-1 border-t border-line pt-1">
            <SignOutButton className="w-full rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-well" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
