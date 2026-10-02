"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Status control for one inquiry: NEW → CONTACTED → CLOSED.

const STATUSES = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "CLOSED", label: "Closed" },
] as const;

export function InquiryStatusSelect({
  inquiryId,
  current,
}: {
  inquiryId: string;
  current: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function change(next: string) {
    setValue(next);
    setSaving(true);
    setError(false);
    const response = await fetch(`/api/admin/inquiries/${inquiryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    }).catch(() => null);
    setSaving(false);
    if (!response?.ok) {
      setError(true);
      setValue(current);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor={`inq-status-${inquiryId}`}>
        Status
      </label>
      <select
        id={`inq-status-${inquiryId}`}
        value={value}
        disabled={saving}
        onChange={(e) => void change(e.target.value)}
        className="h-9 border border-line bg-card px-2 text-sm text-ink focus:border-ink focus:outline-none disabled:opacity-60"
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      {error ? <span className="text-xs text-danger-ink">Not saved</span> : null}
    </div>
  );
}
