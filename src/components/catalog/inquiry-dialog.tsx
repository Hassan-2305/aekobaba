"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";

import {
  DESIGN_ACCEPT,
  DESIGN_STATUSES,
  DESIGN_STATUS_LABEL,
  designFileError,
  inquiryFieldErrors,
  inquirySchema,
} from "@/lib/inquiries/validation";
import type { ProductVM } from "@/lib/catalog/view-models";

// "Get a quote" / "Get a sample" request form, in a native <dialog> (focus
// trap, Esc to close, top layer — no dependency). No account needed. Posts
// multipart to /api/inquiries with an optional design file.

export type InquiryKindValue = "QUOTE" | "SAMPLE";

export interface InquiryDialogHandle {
  open: (kind: InquiryKindValue) => void;
}

type Status =
  | { state: "idle" }
  | { state: "sending" }
  | { state: "sent"; reference: string; email: string }
  | { state: "error"; message: string };

const inputClass =
  "mt-1.5 block w-full border border-line bg-card px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint transition-colors focus:border-ink focus:outline-none";
const labelClass = "block text-sm font-medium text-ink";

function Field({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {required ? (
          <span className="text-orange-ink"> *</span>
        ) : (
          <span className="font-normal text-ink-faint"> (optional)</span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-danger-ink">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-ink-faint">{hint}</p>
      ) : null}
    </div>
  );
}

export const InquiryDialog = forwardRef<InquiryDialogHandle, { product: ProductVM }>(
  function InquiryDialog({ product }, ref) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const [kind, setKind] = useState<InquiryKindValue>("QUOTE");
    const [status, setStatus] = useState<Status>({ state: "idle" });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [fileName, setFileName] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
      open(nextKind) {
        setKind(nextKind);
        if (status.state === "sent" || status.state === "error") setStatus({ state: "idle" });
        setErrors({});
        dialogRef.current?.showModal();
      },
    }));

    const close = () => dialogRef.current?.close();
    const sample = kind === "SAMPLE";
    const defaultType = `${product.categoryName}${product.subcategory ? ` — ${product.subcategory}` : ""}`;

    async function submit(event: React.FormEvent<HTMLFormElement>) {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      data.set("kind", kind);
      data.set("productId", product.id);

      // Same rules as the server, checked here first for instant feedback.
      const fields = Object.fromEntries(
        [...data.entries()].filter(([, v]) => typeof v === "string") as [string, string][],
      );
      const checked = inquirySchema.safeParse(fields);
      const file = data.get("design");
      const fileProblem = designFileError(file instanceof File && file.size > 0 ? file : null);
      const nextErrors = {
        ...(checked.success ? {} : inquiryFieldErrors(checked.error)),
        ...(fileProblem ? { design: fileProblem } : {}),
      };
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        const first = Object.keys(nextErrors)[0];
        form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
        return;
      }

      setErrors({});
      setStatus({ state: "sending" });
      try {
        const response = await fetch("/api/inquiries", { method: "POST", body: data });
        const body = (await response.json().catch(() => ({}))) as {
          reference?: string;
          fields?: Record<string, string>;
          error?: string;
        };
        if (!response.ok) {
          if (body.fields) {
            setErrors(body.fields);
            setStatus({ state: "idle" });
            return;
          }
          throw new Error(body.error ?? "request_failed");
        }
        setStatus({
          state: "sent",
          reference: body.reference ?? "",
          email: String(data.get("email") ?? ""),
        });
        form.reset();
        setFileName(null);
      } catch {
        setStatus({
          state: "error",
          message: "Something went wrong sending your request. Please try again.",
        });
      }
    }

    const err = (key: string) => errors[key];
    const aria = (key: string) =>
      errors[key] ? { "aria-invalid": true, "aria-describedby": `inq-${key}-error` } : {};

    return (
      <dialog
        ref={dialogRef}
        data-testid="inquiry-dialog"
        aria-labelledby="inquiry-title"
        className="m-auto max-h-[92vh] w-[min(720px,94vw)] overflow-y-auto border border-line bg-paper p-0 text-ink shadow-[0_40px_80px_-30px_rgba(0,0,0,.45)] backdrop:bg-black/55 backdrop:backdrop-blur-[2px]"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-paper px-6 py-5">
          <div className="min-w-0">
            <p className="tag text-orange-ink">{sample ? "Get a sample" : "Get a quote"}</p>
            <h2
              id="inquiry-title"
              className="mt-2 line-clamp-2 text-lg font-semibold leading-snug text-ink"
            >
              {product.title}
            </h2>
            <p className="mt-1 text-xs text-ink-muted">{product.supplier.name}</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center border border-line text-ink transition-colors hover:border-ink"
          >
            <svg
              aria-hidden
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {status.state === "sent" ? (
          <div className="px-6 py-12 text-center" data-testid="inquiry-sent">
            <span className="mx-auto flex h-12 w-12 items-center justify-center bg-orange text-white">
              <svg
                aria-hidden
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
            </span>
            <p className="mt-6 text-2xl font-semibold tracking-tight text-ink">Request sent</p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
              Reference <span className="font-mono text-ink">#{status.reference}</span>. The
              Aekobaba team will pass your {sample ? "sample" : "quote"} request to{" "}
              {product.supplier.name} and reply to <span className="text-ink">{status.email}</span>.
            </p>
            <button
              type="button"
              onClick={close}
              className="mt-8 h-11 bg-ink px-6 text-sm font-medium text-paper transition-colors hover:bg-ink/85"
            >
              Done
            </button>
          </div>
        ) : (
          <form ref={formRef} onSubmit={submit} noValidate className="px-6 pb-6 pt-5">
            {/* Quote ↔ sample switch. */}
            <div
              role="radiogroup"
              aria-label="Request type"
              className="inline-flex border border-line p-1"
            >
              {(["QUOTE", "SAMPLE"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={kind === k}
                  onClick={() => setKind(k)}
                  className={`h-9 px-4 text-sm transition-colors ${
                    kind === k ? "bg-ink text-paper" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {k === "QUOTE" ? "Quote" : "Sample"}
                </button>
              ))}
            </div>
            {sample && !product.samplePolicyVerified ? (
              <p className="mt-3 border-l-2 border-warning-ink bg-warning-tint px-3 py-2 text-xs text-warning-ink">
                This supplier hasn&rsquo;t published a sample policy — we&rsquo;ll ask them for you.
              </p>
            ) : null}

            {/* Honeypot — hidden from people, tempting to bots. */}
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="inq-fax">Fax</label>
              <input id="inq-fax" name="fax" tabIndex={-1} autoComplete="off" />
            </div>

            <fieldset className="mt-6 min-w-0">
              <legend className="tag text-ink-faint">Your details</legend>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field id="inq-name" label="Name" required error={err("name")}>
                  <input
                    id="inq-name"
                    name="name"
                    autoComplete="name"
                    className={inputClass}
                    {...aria("name")}
                  />
                </Field>
                <Field id="inq-email" label="Email" required error={err("email")}>
                  <input
                    id="inq-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    className={inputClass}
                    {...aria("email")}
                  />
                </Field>
                <Field id="inq-company" label="Company / brand" error={err("company")}>
                  <input
                    id="inq-company"
                    name="company"
                    autoComplete="organization"
                    className={inputClass}
                  />
                </Field>
                <Field id="inq-website" label="Website" error={err("website")}>
                  <input
                    id="inq-website"
                    name="website"
                    placeholder="yourbrand.com"
                    autoComplete="url"
                    className={inputClass}
                    {...aria("website")}
                  />
                </Field>
                <Field id="inq-phone" label="Phone" error={err("phone")}>
                  <input
                    id="inq-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    className={inputClass}
                  />
                </Field>
              </div>
            </fieldset>

            <fieldset className="mt-8 min-w-0">
              <legend className="tag text-ink-faint">What you need</legend>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field
                  id="inq-quantity"
                  label={sample ? "How many samples" : "Quantity"}
                  required
                  error={err("quantity")}
                >
                  <input
                    id="inq-quantity"
                    name="quantity"
                    key={kind}
                    defaultValue={sample ? "1" : ""}
                    placeholder={sample ? "e.g. 2 samples" : "e.g. 5,000 pouches"}
                    className={inputClass}
                    {...aria("quantity")}
                  />
                </Field>
                <Field id="inq-type" label="Packaging type" error={err("packagingType")}>
                  <input
                    id="inq-type"
                    name="packagingType"
                    defaultValue={defaultType}
                    className={inputClass}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field
                    id="inq-format"
                    label="Size / format"
                    hint="Capacity, dimensions, material, finish, closure…"
                    error={err("format")}
                  >
                    <input
                      id="inq-format"
                      name="format"
                      placeholder="e.g. 250 g, 130 × 210 mm, matte kraft, zip + valve"
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>

              <div className="mt-5">
                <p className={labelClass} id="inq-design-label">
                  Do you have a design?<span className="text-orange-ink"> *</span>
                </p>
                <div
                  role="radiogroup"
                  aria-labelledby="inq-design-label"
                  className="mt-2 grid gap-2 sm:grid-cols-2"
                >
                  {DESIGN_STATUSES.map((value) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-2.5 border border-line bg-card px-3 py-2.5 text-sm text-ink transition-colors has-[:checked]:border-orange has-[:checked]:bg-orange-tint"
                    >
                      <input
                        type="radio"
                        name="designStatus"
                        value={value}
                        className="accent-[var(--orange)]"
                      />
                      {DESIGN_STATUS_LABEL[value]}
                    </label>
                  ))}
                </div>
                {err("designStatus") ? (
                  <p className="mt-1 text-xs text-danger-ink">{err("designStatus")}</p>
                ) : null}
              </div>

              <div className="mt-5">
                <Field
                  id="inq-description"
                  label="Describe what you need"
                  required
                  hint="Printing, colours, finish, target date, budget — anything that helps the supplier quote accurately."
                  error={err("description")}
                >
                  <textarea
                    id="inq-description"
                    name="description"
                    rows={5}
                    placeholder={
                      sample
                        ? "What will you test the sample for? Any size or finish you want to see?"
                        : "e.g. 250 g coffee, matte black with a one-colour logo, need by March"
                    }
                    className={inputClass}
                    {...aria("description")}
                  />
                </Field>
              </div>

              <div className="mt-5">
                <span className={labelClass}>
                  Upload your design <span className="font-normal text-ink-faint">(optional)</span>
                </span>
                <label
                  htmlFor="inq-design"
                  className="mt-1.5 flex cursor-pointer items-center justify-between gap-4 border border-dashed border-line bg-card px-4 py-4 text-sm transition-colors hover:border-ink"
                >
                  <span className="min-w-0 truncate text-ink-muted">
                    {fileName ?? "PDF, AI, EPS, SVG, PNG, JPG, PSD or ZIP — up to 4 MB"}
                  </span>
                  <span className="shrink-0 border border-line px-3 py-1.5 text-xs font-medium text-ink">
                    Choose file
                  </span>
                </label>
                <input
                  id="inq-design"
                  name="design"
                  type="file"
                  accept={DESIGN_ACCEPT}
                  className="sr-only"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                />
                {err("design") ? (
                  <p className="mt-1 text-xs text-danger-ink">{err("design")}</p>
                ) : null}
              </div>
            </fieldset>

            {status.state === "error" ? (
              <p
                role="alert"
                className="mt-6 border-l-2 border-danger-ink bg-danger-tint px-3 py-2 text-sm text-danger-ink"
              >
                {status.message}
              </p>
            ) : null}

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-relaxed text-ink-faint">
                No account needed. We only use your details to answer this request.
              </p>
              <button
                type="submit"
                disabled={status.state === "sending"}
                className="h-12 shrink-0 bg-orange px-6 text-sm font-medium text-white transition-colors hover:bg-orange-hi disabled:opacity-60"
              >
                {status.state === "sending"
                  ? "Sending…"
                  : sample
                    ? "Send sample request"
                    : "Send quote request"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    );
  },
);
