"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { signOutAction } from "@/app/auth/actions";
import { RANGES } from "@/lib/admin/ranges";

import { AdminIcon } from "./icons";

// Interactive pieces of the admin console: the search box (Ctrl/⌘ K), the
// account menu at the foot of the sidebar, the date-range picker and the
// mobile navigation drawer.

export function AdminSearch({ initial = "" }: { initial?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current?.focus();
        ref.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <form action="/admin/search" role="search" className="flex h-11 w-full max-w-[560px] items-center gap-3 rounded-lg border border-[#e6e2dc] bg-white/80 px-3.5 text-sm shadow-[0_1px_2px_rgba(24,26,33,.04)] focus-within:border-ink">
      <AdminIcon name="search" size={18} className="flex-none text-ink-muted" />
      <label htmlFor="admin-search" className="sr-only">
        Search requests, suppliers and products
      </label>
      <input
        ref={ref}
        id="admin-search"
        name="q"
        defaultValue={initial}
        placeholder="Search requests, suppliers, products…"
        className="min-w-0 flex-1 bg-transparent text-ink placeholder:text-ink-muted focus:outline-none"
      />
      <kbd className="hidden flex-none items-center gap-1 rounded-md border border-[#e6e2dc] bg-[#f7f5f2] px-1.5 py-0.5 font-sans text-[11px] text-ink-muted sm:flex">
        Ctrl <span className="rounded border border-[#e6e2dc] bg-white px-1">K</span>
      </kbd>
    </form>
  );
}

export function AdminUserMenu({ name, email }: { name: string; email: string }) {
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
  const initials =
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "A";
  return (
    <div ref={ref} className="relative">
      {open ? (
        <div role="menu" className="absolute bottom-[calc(100%+8px)] left-0 right-0 rounded-xl border border-white/10 bg-[#1d1f24] p-1.5 shadow-2xl">
          <Link href="/results" role="menuitem" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-white">
            <AdminIcon name="store" size={16} /> View marketplace
          </Link>
          <form action={signOutAction}>
            <button type="submit" role="menuitem" className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-white/80 hover:bg-white/5 hover:text-white">
              <AdminIcon name="logout" size={16} /> Sign out
            </button>
          </form>
        </div>
      ) : null}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-white/5"
      >
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#2a2c32] text-sm font-semibold text-white">
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white">{name}</span>
          <span className="block truncate text-xs text-white/50">{email}</span>
        </span>
        <AdminIcon name="chevronDown" size={16} className="flex-none text-white/50" />
      </button>
    </div>
  );
}


export function RangeSelect({ value }: { value: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="flex h-11 items-center gap-2.5 rounded-lg border border-[#e6e2dc] bg-white px-3.5 text-sm font-medium text-ink shadow-[0_1px_2px_rgba(24,26,33,.04)]">
      <AdminIcon name="calendar" size={18} className="text-ink-muted" />
      <span className="sr-only">Date range</span>
      <select
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          next.set("range", e.target.value);
          router.push(`${pathname}?${next.toString()}`);
        }}
        className="cursor-pointer appearance-none bg-transparent pr-5 focus:outline-none"
      >
        {RANGES.map((r) => (
          <option key={r} value={r}>
            Last {r} days
          </option>
        ))}
      </select>
      <AdminIcon name="chevronDown" size={16} className="-ml-5 pointer-events-none text-ink-muted" />
    </label>
  );
}

export function MobileNavButton({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  return (
    <>
      <button
        type="button"
        aria-label="Open admin menu"
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 flex-none items-center justify-center rounded-lg border border-[#e6e2dc] bg-white lg:hidden"
      >
        <AdminIcon name="menu" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-y-0 left-0 w-[280px] overflow-y-auto">{children}</div>
        </div>
      ) : null}
    </>
  );
}
