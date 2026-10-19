"use client";

import { useState } from "react";

// One form for the three supplier onboarding flows. LISTING collects company
// details and categories; PRODUCT_FETCH adds the product/catalog pages to
// extract; PARTNERSHIP sends the visitor to the team's booking page after the
// request is saved (the booking provider sends the calendar invitations).

type AppType = "LISTING" | "PRODUCT_FETCH" | "PARTNERSHIP";

const input =
  "mt-1.5 w-full rounded-md border border-line-strong bg-paper px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none";
const lbl = "block text-sm font-medium text-ink";

export function ApplicationForm({
  type,
  categories,
  defaults,
}: {
  type: AppType;
  categories: string[];
  defaults?: { contactEmail?: string | null; contactName?: string | null };
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [state, setState] = useState<
    { kind: "idle" } | { kind: "sending" } | { kind: "done"; reference: string; bookingUrl: string | null } | { kind: "error"; message: string }
  >({ kind: "idle" });

  async function submit(form: HTMLFormElement) {
    const fd = new FormData(form);
    const text = (k: string) => String(fd.get(k) ?? "").trim();
    const urls = text("catalogUrls")
      .split(/\s+/)
      .map((u) => u.trim())
      .filter(Boolean);
    setState({ kind: "sending" });
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          companyName: text("companyName"),
          website: text("website"),
          location: text("location") || undefined,
          contactName: text("contactName"),
          contactEmail: text("contactEmail"),
          contactPhone: text("contactPhone") || undefined,
          categories: picked,
          catalogUrls: urls,
          message: text("message") || undefined,
          fax: text("fax") || undefined,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { reference?: string; bookingUrl?: string | null; error?: string };
      if (response.status === 201 && body.reference) {
        setState({ kind: "done", reference: body.reference, bookingUrl: body.bookingUrl ?? null });
        if (type === "PARTNERSHIP" && body.bookingUrl) window.open(body.bookingUrl, "_blank", "noopener");
        return;
      }
      const messages: Record<string, string> = {
        unauthenticated: "Please sign in first.",
        invalid_payload: "Check the company name, website and email address.",
        catalog_required: "Add at least one product or catalog page URL (or describe where your products are).",
      };
      setState({ kind: "error", message: messages[body.error ?? ""] ?? "Something went wrong. Try again." });
    } catch {
      setState({ kind: "error", message: "The network dropped. Try again." });
    }
  }

  if (state.kind === "done") {
    return (
      <div role="status" className="rounded-xl border border-success-ink/30 bg-success-tint p-6">
        <p className="text-lg font-semibold text-success-deep">Received — reference {state.reference}</p>
        {type === "PARTNERSHIP" ? (
          state.bookingUrl ? (
            <>
              <p className="mt-2 text-sm text-ink">
                Pick a time for a call with the Aekovera team. The booking page opened in a new tab; you&rsquo;ll both get a
                calendar invitation once you choose a slot.
              </p>
              <a
                href={state.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex h-11 items-center rounded-md bg-orange px-5 text-sm font-semibold text-on-orange hover:bg-orange-hi"
              >
                Choose a meeting time
              </a>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink">
              The Aekovera team will email you to set up a call.
            </p>
          )
        ) : type === "PRODUCT_FETCH" ? (
          <p className="mt-2 text-sm text-ink">
            The team will review your website and confirm before any products are extracted. Extracted products are reviewed
            before they go live, and every price keeps its source link and capture date.
          </p>
        ) : (
          <p className="mt-2 text-sm text-ink">The team will review your application and contact you by email.</p>
        )}
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(event.currentTarget);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={lbl} htmlFor="app-company">Company name</label>
          <input id="app-company" name="companyName" required minLength={2} className={input} autoComplete="organization" />
        </div>
        <div>
          <label className={lbl} htmlFor="app-website">Website</label>
          <input id="app-website" name="website" required className={input} placeholder="yourcompany.com" autoComplete="url" />
        </div>
        <div>
          <label className={lbl} htmlFor="app-location">Location</label>
          <input id="app-location" name="location" className={input} placeholder="City, State" />
        </div>
        <div>
          <label className={lbl} htmlFor="app-name">Contact name</label>
          <input id="app-name" name="contactName" required defaultValue={defaults?.contactName ?? ""} className={input} autoComplete="name" />
        </div>
        <div>
          <label className={lbl} htmlFor="app-email">Business email</label>
          <input id="app-email" name="contactEmail" type="email" required defaultValue={defaults?.contactEmail ?? ""} className={input} autoComplete="email" />
        </div>
        <div>
          <label className={lbl} htmlFor="app-phone">
            Phone <span className="font-normal text-ink-faint">(optional)</span>
          </label>
          <input id="app-phone" name="contactPhone" type="tel" className={input} autoComplete="tel" />
        </div>
      </div>

      {type !== "PARTNERSHIP" ? (
        <fieldset>
          <legend className={lbl}>Packaging categories you supply</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {categories.map((c) => {
              const on = picked.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setPicked((p) => (on ? p.filter((x) => x !== c) : [...p, c]))}
                  className={`h-8 rounded-full border px-3 text-sm ${on ? "border-ink bg-ink text-paper" : "border-line-strong text-ink hover:border-ink"}`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {type === "PRODUCT_FETCH" ? (
        <div>
          <label className={lbl} htmlFor="app-urls">Product or catalog pages</label>
          <textarea
            id="app-urls"
            name="catalogUrls"
            rows={4}
            className={input}
            placeholder={"One URL per line, e.g.\nyourcompany.com/glass-bottles\nyourcompany.com/catalog.pdf"}
          />
          <p className="mt-1 text-xs text-ink-muted">Only pages with published prices can be listed with a price.</p>
        </div>
      ) : null}

      <div>
        <label className={lbl} htmlFor="app-message">
          {type === "PARTNERSHIP" ? "What would you like to discuss?" : "Anything else"}{" "}
          <span className="font-normal text-ink-faint">(optional)</span>
        </label>
        <textarea id="app-message" name="message" rows={3} className={input} />
      </div>
      <input type="text" name="fax" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      {state.kind === "error" ? (
        <p role="alert" className="rounded-md border border-danger-ink/30 bg-danger-tint px-3 py-2 text-sm text-danger-ink">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={state.kind === "sending"}
        className="h-11 rounded-md bg-orange px-6 text-sm font-semibold text-on-orange hover:bg-orange-hi disabled:opacity-60"
      >
        {state.kind === "sending"
          ? "Sending…"
          : type === "PARTNERSHIP"
            ? "Continue to booking"
            : type === "PRODUCT_FETCH"
              ? "Request product extraction"
              : "Submit application"}
      </button>
    </form>
  );
}
