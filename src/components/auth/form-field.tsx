import type { InputHTMLAttributes } from "react";

// Label + input + accessible error message. Plain (no "use client") so both
// server and client components can render it.

export function FormField({
  id,
  label,
  error,
  hint,
  ...inputProps
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className">) {
  const describedBy = [
    hint ? `${id}-hint` : null,
    error ? `${id}-error` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-ink"
      >
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-faint">
          {hint}
        </p>
      ) : null}
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`block h-11 w-full border bg-card px-3 text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-ink focus:outline-none ${
          error ? "border-red-500" : "border-line"
        }`}
        {...inputProps}
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
