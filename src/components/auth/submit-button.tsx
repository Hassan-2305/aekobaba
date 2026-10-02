"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

// Submit button with an honest pending state — the label changes and the
// button stops accepting presses while the action runs.

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
}: {
  children: ReactNode;
  pendingLabel: string;
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();

  const styles =
    variant === "primary"
      ? "bg-action text-on-orange hover:bg-action-strong"
      : "border border-line bg-card text-ink hover:border-ink";

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`flex h-11 w-full items-center justify-center text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 ${styles}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
