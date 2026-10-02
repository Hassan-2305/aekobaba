"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { UserRole } from "@/lib/auth/roles";
import { useQuoteBasketStore } from "@/lib/basket/store";
import { groupBasketBySupplier, useBasketHydrated } from "@/lib/basket/use-basket";

import { BasketLine } from "./basket-line";

// The Quote Basket page (spec C8/C9/C11). The basket itself is anonymous —
// collection and editing need no session. Submission is auth-gated at the
// API: an anonymous visitor is sent to sign-in (basket preserved in
// localStorage) and lands back here; a non-BRAND session is told plainly.
// No API calls in component bodies — one fetch at the submit action, the
// one mutation this form owns.

type SubmitState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "error"; message: string; code?: string };

export interface BasketViewProps {
  /** The signed-in role, or null when anonymous. */
  signedInRole: UserRole | null;
}

export function BasketView({ signedInRole }: BasketViewProps) {
  const router = useRouter();
  const hydrated = useBasketHydrated();
  const items = useQuoteBasketStore((state) => state.items);
  const setQuantity = useQuoteBasketStore((state) => state.setQuantity);
  const removeItem = useQuoteBasketStore((state) => state.removeItem);
  const clear = useQuoteBasketStore((state) => state.clear);

  const [deadline, setDeadline] = useState("");
  const [artworkNotes, setArtworkNotes] = useState("");
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: "idle" });

  const groups = groupBasketBySupplier(items);
  const supplierCount = groups.length;

  async function submit() {
    if (items.length === 0 || submitState.kind === "sending") return;
    setSubmitState({ kind: "sending" });

    const form = new FormData();
    form.set(
      "payload",
      JSON.stringify({
        items: items.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
        deadline: deadline || undefined,
        artworkNotes: artworkNotes.trim() ? artworkNotes.trim() : undefined,
      }),
    );
    if (artworkFile) form.set("artwork", artworkFile);

    try {
      const response = await fetch("/api/quotes", { method: "POST", body: form });
      if (response.status === 201) {
        const body = (await response.json()) as { quoteRequest: { id: string } };
        clear();
        router.push(`/account/requests/${body.quoteRequest.id}?submitted=1`);
        return;
      }
      if (response.status === 401) {
        // Basket lives in localStorage — it survives the sign-in round trip.
        router.push("/auth/sign-in?next=%2Fbasket");
        return;
      }
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      const messages: Record<string, string> = {
        role_mismatch: "Quote requests are sent by brand accounts. You are signed in as a supplier or admin.",
        missing_role: "Your account has no marketplace role yet. Contact support to get set up.",
        artwork_storage_unavailable:
          "Artwork storage is not configured yet. Submit again without the file, or ask the team to enable Supabase Storage.",
        artwork_too_large: "That artwork file is over the 10 MB limit. Try a smaller file.",
        artwork_upload_failed: "The artwork file could not be uploaded. Try again or submit without it.",
        unknown_products: "A product in your basket is no longer available. Refresh and try again.",
      };
      setSubmitState({
        kind: "error",
        code: body.error,
        message: messages[body.error ?? ""] ?? "The request could not be sent. Try again.",
      });
    } catch (fetchError) {
      console.error("[aekobaba] quote submission failed", fetchError);
      setSubmitState({ kind: "error", message: "The request could not be sent — the network dropped. Try again." });
    }
  }

  if (hydrated && items.length === 0) {
    return (
      <div data-testid="basket-empty">
        <BasketBand title="Quote Basket" subtitle="One request, sent to every supplier you add." />
        <div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-lg bg-well px-8 py-14 text-center">
            <p className="font-semiwide text-2xl font-light text-ink">Your quote basket is empty</p>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              Add packaging products from any supplier, then send one request to all of them.
            </p>
            <Link
              href="/results"
              className="mt-8 inline-flex h-11 items-center bg-orange px-6 text-sm font-medium text-on-orange transition-colors hover:bg-orange-hi"
            >
              Browse packaging
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const suppliersLabel = supplierCount === 1 ? "1 supplier" : `${supplierCount} suppliers`;
  const inputClass =
    "mt-2 w-full border border-line bg-card px-3 py-2 text-sm text-ink transition-colors focus:border-ink focus:outline-none";
  const labelClass = "block text-sm font-medium text-ink";

  return (
    <div>
      <BasketBand
        title="Quote Basket"
        subtitle={`One request, ${suppliersLabel} — fill the form once and every supplier in your basket receives it.`}
        count={items.length}
      />

      <div className="mx-auto grid max-w-[1400px] gap-10 px-5 pb-24 pt-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14 lg:px-12">
        <div>
          {signedInRole === null ? (
            <p data-testid="basket-signin-prompt" className="mb-8 border-l-2 border-orange bg-card px-4 py-3 text-sm text-ink">
              <Link href="/auth/sign-in?next=%2Fbasket" className="font-medium underline decoration-orange underline-offset-4">
                Sign in
              </Link>{" "}
              to send your request — your basket is saved on this device.
            </p>
          ) : null}
          {signedInRole !== null && signedInRole !== "BRAND" ? (
            <p
              data-testid="basket-role-note"
              className="mb-8 border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              You are signed in as a {signedInRole === "SUPPLIER" ? "supplier" : "admin"} account — only brand accounts
              send quote requests.
            </p>
          ) : null}

          <div className="space-y-10">
            {groups.map((group) => (
              <section key={group.supplierSlug}>
                <div className="flex items-baseline justify-between gap-4 border-b border-ink pb-3">
                  <h2 className="text-base font-medium text-ink">{group.supplierName}</h2>
                  <span className="text-xs text-ink-faint tabular-nums">
                    {group.items.length} item{group.items.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div>
                  {group.items.map((item) => (
                    <BasketLine key={item.product.id} item={item} onQuantityChange={setQuantity} onRemove={removeItem} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <form
          data-testid="basket-form"
          className="h-fit bg-card p-6 shadow-[0_1px_0_rgba(11,14,18,.06)] lg:sticky lg:top-6"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <h2 className="font-semiwide text-xl font-light tracking-tight text-ink">Request details</h2>
          <p className="mt-1 text-xs text-ink-muted">Sent identically to every supplier in your basket.</p>

          <div className="mt-6 space-y-5">
            <div>
              <label htmlFor="basket-deadline" className={labelClass}>
                Needed by <span className="font-normal text-ink-faint">(optional)</span>
              </label>
              <input
                id="basket-deadline"
                data-testid="basket-deadline"
                type="date"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="basket-artwork" className={labelClass}>
                Artwork file <span className="font-normal text-ink-faint">(optional)</span>
              </label>
              <input
                id="basket-artwork"
                data-testid="basket-artwork"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.ai,.eps"
                onChange={(event) => setArtworkFile(event.target.files?.[0] ?? null)}
                className="mt-2 w-full text-sm text-ink-muted file:mr-3 file:h-9 file:cursor-pointer file:border file:border-line file:bg-paper file:px-3 file:text-sm file:text-ink hover:file:border-ink"
              />
            </div>
            <div>
              <label htmlFor="basket-notes" className={labelClass}>
                Artwork &amp; print notes <span className="font-normal text-ink-faint">(optional)</span>
              </label>
              <textarea
                id="basket-notes"
                data-testid="basket-notes"
                rows={4}
                value={artworkNotes}
                onChange={(event) => setArtworkNotes(event.target.value)}
                placeholder="e.g. Single-color logo on the front panel, matte finish"
                className={`${inputClass} placeholder:text-ink-faint`}
              />
            </div>
          </div>

          {submitState.kind === "error" ? (
            <p
              data-testid="basket-error"
              role="alert"
              className="mt-5 border-l-2 border-red-600 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {submitState.message}
            </p>
          ) : null}

          <button
            type="submit"
            data-testid="submit-quote-request"
            disabled={submitState.kind === "sending"}
            className="mt-6 h-12 w-full bg-action px-5 text-sm font-medium text-on-orange transition-colors hover:bg-action-strong disabled:opacity-60"
          >
            {submitState.kind === "sending" ? "Sending…" : `Send request to ${suppliersLabel}`}
          </button>
        </form>
      </div>
    </div>
  );
}

/** Dark page band shared by the basket states. */
function BasketBand({ title, subtitle, count }: { title: string; subtitle: string; count?: number }) {
  return (
    <section className="grain border-b border-line-dark bg-void text-on-dark">
      <div className="mx-auto max-w-[1400px] px-5 pb-10 pt-12 sm:px-8 lg:px-12 lg:pb-12 lg:pt-16">
        <h1 className="font-semiwide text-4xl font-light leading-[1.02] tracking-[-0.03em] sm:text-5xl">
          {title}
          {count ? (
            <span className="ml-4 align-middle font-sans text-sm font-normal tracking-normal text-on-dark-muted tabular-nums">
              {count} item{count === 1 ? "" : "s"}
            </span>
          ) : null}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-on-dark-muted">{subtitle}</p>
      </div>
    </section>
  );
}
