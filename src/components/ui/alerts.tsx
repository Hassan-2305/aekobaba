import type { ReactNode } from "react";

// Inline feedback for workspace (supplier/admin) surfaces. The auth pages have
// their own alerts; these keep the role areas self-contained without importing
// across feature folders.

export function InlineErrorAlert({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="border-l-2 border-danger-ink bg-danger-tint px-3 py-2 text-sm text-danger-ink"
    >
      {message}
    </div>
  );
}

export function InlineSuccessAlert({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="border-l-2 border-success-ink bg-success-tint px-3 py-2 text-sm text-success-ink"
    >
      {children}
    </div>
  );
}
