"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// The buyer's editable contact details (prefill the quote form and tell the
// Aekovera team who to reply to).

const input =
  "mt-1.5 w-full rounded-md border border-line-strong bg-paper px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none";

export function ProfileForm(props: { email: string; name: string; phone: string; company: string; website: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const fd = new FormData(event.currentTarget);
        setState("saving");
        const response = await fetch("/api/account", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: String(fd.get("name") ?? ""),
            phone: String(fd.get("phone") ?? ""),
            company: String(fd.get("company") ?? ""),
            website: String(fd.get("website") ?? ""),
          }),
        }).catch(() => null);
        setState(response?.ok ? "saved" : "error");
        if (response?.ok) router.refresh();
      }}
    >
      <label className="block text-sm font-medium text-ink">
        Name
        <input name="name" defaultValue={props.name} autoComplete="name" className={input} />
      </label>
      <label className="block text-sm font-medium text-ink">
        Email
        <input value={props.email} readOnly className={`${input} bg-well text-ink-muted`} />
      </label>
      <label className="block text-sm font-medium text-ink">
        Company
        <input name="company" defaultValue={props.company} autoComplete="organization" className={input} />
      </label>
      <label className="block text-sm font-medium text-ink">
        Phone
        <input name="phone" type="tel" defaultValue={props.phone} autoComplete="tel" className={input} />
      </label>
      <label className="block text-sm font-medium text-ink sm:col-span-2">
        Company website
        <input name="website" defaultValue={props.website} autoComplete="url" placeholder="yourbrand.com" className={input} />
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={state === "saving"}
          className="h-10 rounded-md bg-ink px-5 text-sm font-medium text-paper hover:bg-ink/85 disabled:opacity-60"
        >
          {state === "saving" ? "Saving…" : "Save details"}
        </button>
        {state === "saved" ? <span className="text-sm text-success-ink">Saved</span> : null}
        {state === "error" ? <span className="text-sm text-danger-ink">Could not save — try again</span> : null}
      </div>
    </form>
  );
}
