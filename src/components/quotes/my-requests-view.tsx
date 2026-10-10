"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ProductPicture } from "@/components/catalog/product-picture";
import { useMyRequests, useMyRequestsHydrated, type MyRequest } from "@/lib/inquiries/my-requests";

// Quote Basket — the quote and sample requests this browser has sent, with
// their live status from /api/inquiries/lookup (each request is answered
// only for its own private token). No account needed.

type LiveStatus = "NEW" | "CONTACTED" | "CLOSED";

const STEPS: { key: LiveStatus; label: string }[] = [
  { key: "NEW", label: "Received" },
  { key: "CONTACTED", label: "In progress" },
  { key: "CLOSED", label: "Closed" },
];

function StatusTrack({ status }: { status: LiveStatus | "UNKNOWN" | "LOADING" }) {
  if (status === "LOADING") return <p className="text-xs text-ink-faint">Checking status…</p>;
  if (status === "UNKNOWN")
    return <p className="text-xs text-ink-faint">Status unavailable right now</p>;
  const reached = STEPS.findIndex((s) => s.key === status);
  return (
    <ol className="flex items-center gap-2" aria-label={`Status: ${STEPS[reached]?.label}`}>
      {STEPS.map((step, i) => {
        const done = i <= reached;
        return (
          <li key={step.key} className="flex items-center gap-2">
            {i > 0 ? (
              <span aria-hidden className={`h-px w-5 ${done ? "bg-orange" : "bg-line"}`} />
            ) : null}
            <span
              className={`flex items-center gap-1.5 text-xs ${i === reached ? "font-medium text-ink" : done ? "text-ink-muted" : "text-ink-faint"}`}
            >
              <span
                aria-hidden
                className={`h-2 w-2 ${done ? "bg-orange" : "border border-line"}`}
              />
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function RequestRow({
  request,
  status,
  onRemove,
}: {
  request: MyRequest;
  status: LiveStatus | "UNKNOWN" | "LOADING";
  onRemove: () => void;
}) {
  const sent = new Date(request.createdAt).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return (
    <li
      data-testid="my-request"
      className="grid gap-5 border border-line bg-card p-5 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center"
    >
      <Link
        href={`/products/${request.productId}`}
        className="relative block aspect-square w-24 overflow-hidden bg-well"
        tabIndex={-1}
        aria-label={request.productTitle}
      >
        {request.imageUrl ? (
          <ProductPicture
            src={request.imageUrl}
            alt={request.productTitle}
            sizes="96px"
            className="p-2"
          />
        ) : null}
      </Link>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`tag px-1.5 py-1 ${request.kind === "SAMPLE" ? "bg-warning-tint text-warning-ink" : "bg-orange-tint text-orange-ink"}`}
          >
            {request.kind === "SAMPLE" ? "Sample request" : "Quote request"}
          </span>
          <span className="font-mono text-xs text-ink-faint">#{request.reference}</span>
        </div>
        <Link
          href={`/products/${request.productId}`}
          className="mt-2 block text-base font-medium leading-snug text-ink hover:underline hover:decoration-orange hover:underline-offset-4"
        >
          {request.productTitle}
        </Link>
        <p className="mt-1 text-xs text-ink-muted">
          {request.supplierName} · Quantity {request.quantity} · Sent {sent}
        </p>
        <div className="mt-3">
          <StatusTrack status={status} />
        </div>
      </div>
      <div className="flex flex-col items-start gap-2 text-xs sm:items-end">
        <span className="text-ink-faint">Replies go to {request.email}</span>
        <button
          type="button"
          onClick={onRemove}
          className="text-ink-faint underline-offset-4 hover:text-danger-ink hover:underline"
        >
          Remove from this list
        </button>
      </div>
    </li>
  );
}

export function MyRequestsView() {
  const hydrated = useMyRequestsHydrated();
  const requests = useMyRequests((s) => s.requests);
  const remove = useMyRequests((s) => s.remove);
  const [statuses, setStatuses] = useState<Record<string, LiveStatus>>({});
  const [lookup, setLookup] = useState<"idle" | "loading" | "done" | "failed">("idle");

  const ids = requests.map((r) => r.id).join(",");
  useEffect(() => {
    if (!hydrated || requests.length === 0) return;
    let cancelled = false;
    setLookup("loading");
    fetch("/api/inquiries/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: requests.map((r) => ({ id: r.id, token: r.token })) }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((body: { items: { id: string; status: LiveStatus }[] }) => {
        if (cancelled) return;
        setStatuses(Object.fromEntries(body.items.map((i) => [i.id, i.status])));
        setLookup("done");
      })
      .catch(() => !cancelled && setLookup("failed"));
    return () => {
      cancelled = true;
    };
    // ids captures the request set; requests itself changes identity on rehydrate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, ids]);

  const statusFor = (id: string) =>
    lookup === "loading" || lookup === "idle" ? "LOADING" : (statuses[id] ?? "UNKNOWN");

  return (
    <div>
      <section className="border-b border-line-dark bg-void text-on-dark">
        <div className="mx-auto max-w-[1400px] px-5 pb-10 pt-12 sm:px-8 lg:px-12 lg:pb-12 lg:pt-16">
          <p className="tag flex items-center gap-3 text-on-dark-muted">
            <span aria-hidden className="h-[1.5px] w-6 bg-orange" />
            Your requests
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
            Quote Basket
            {hydrated && requests.length > 0 ? (
              <span className="ml-4 align-middle text-sm font-normal tracking-normal text-on-dark-muted tabular-nums">
                {requests.length} request{requests.length === 1 ? "" : "s"}
              </span>
            ) : null}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-on-dark-muted">
            Every quote and sample request you send from a product page lands here, with its status.
            We reply by email.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-5 pb-24 pt-10 sm:px-8 lg:px-12">
        {!hydrated ? null : requests.length === 0 ? (
          <div
            data-testid="my-requests-empty"
            className="mx-auto max-w-lg border border-dashed border-line px-8 py-14 text-center"
          >
            <p className="text-2xl font-semibold tracking-tight text-ink">No requests yet</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              Open any product and press <span className="text-ink">Get a quote</span> or{" "}
              <span className="text-ink">Get a sample</span>. Your requests will show up here.
            </p>
            <Link
              href="/results"
              className="mt-8 inline-flex h-11 items-center bg-orange px-6 text-sm font-medium text-white transition-colors hover:bg-orange-hi"
            >
              Browse packaging
            </Link>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {requests.map((request) => (
                <RequestRow
                  key={request.id}
                  request={request}
                  status={statusFor(request.id)}
                  onRemove={() => remove(request.id)}
                />
              ))}
            </ul>
            <p className="mt-6 max-w-2xl text-xs leading-relaxed text-ink-faint">
              This list is saved in this browser. Clearing your browser data removes the list here —
              your requests stay with us and we still reply by email.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
