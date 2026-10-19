"use client";

import { useEffect, useState } from "react";

// Quantity box that lets the visitor type freely: the field keeps their text
// (an empty field while typing "500" stays empty instead of snapping to 1),
// and only whole numbers ≥ 1 are committed. Leaving the field restores the
// last committed value if what's there isn't a valid quantity.

export function QuantityInput({
  value,
  onCommit,
  className,
  ariaLabel,
  testId,
}: {
  value: number;
  onCommit: (quantity: number) => void;
  className?: string;
  ariaLabel?: string;
  testId?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  return (
    <input
      type="text"
      inputMode="numeric"
      value={draft}
      aria-label={ariaLabel}
      data-testid={testId}
      onChange={(e) => {
        const digits = e.target.value.replace(/[^0-9]/g, "");
        setDraft(digits);
        const n = Number(digits);
        if (digits && Number.isFinite(n) && n >= 1) onCommit(Math.min(10_000_000, Math.floor(n)));
      }}
      onBlur={() => setDraft(String(value))}
      className={className}
    />
  );
}
