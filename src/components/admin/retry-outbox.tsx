"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RetryOutboxButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={async () => {
          setBusy(true);
          const response = await fetch("/api/admin/outbox/retry", { method: "POST" }).catch(() => null);
          const body = (await response?.json().catch(() => null)) as { sent?: number; failed?: number } | null;
          setResult(body ? `${body.sent ?? 0} sent, ${body.failed ?? 0} failed` : "Retry failed");
          setBusy(false);
          router.refresh();
        }}
        className="h-9 rounded-md bg-ink px-4 text-sm font-medium text-paper hover:bg-ink/85 disabled:opacity-50"
      >
        {busy ? "Sending…" : "Retry undelivered"}
      </button>
      {result ? <span className="text-sm text-ink-muted">{result}</span> : null}
    </>
  );
}
