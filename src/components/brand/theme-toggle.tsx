"use client";

import { THEME_STORAGE_KEY } from "@/lib/theme";

// Light / dark switch. Light is the default (most registered suppliers
// prefer it); the choice persists in localStorage and is applied before
// first paint by the inline script in the root layout, so there is no flash.
//
// Both icons render on the server and CSS shows the right one per theme —
// the button never needs to know the theme during render, so there is no
// hydration mismatch.

export function ThemeToggle({ className = "" }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private mode / storage disabled: the switch still works for this visit.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      data-testid="theme-toggle"
      title="Switch light / dark theme"
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-dark text-on-dark/80 transition-colors hover:border-on-dark/40 hover:text-on-dark ${className}`}
    >
      {/* Shown in light theme: offer dark. */}
      <span className="dark:hidden" aria-hidden>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        </svg>
      </span>
      {/* Shown in dark theme: offer light. */}
      <span className="hidden dark:block" aria-hidden>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      </span>
      <span className="sr-only">
        <span className="dark:hidden">Switch to dark theme</span>
        <span className="hidden dark:inline">Switch to light theme</span>
      </span>
    </button>
  );
}
