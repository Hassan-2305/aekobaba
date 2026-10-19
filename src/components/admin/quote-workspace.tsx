"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import {
  COMMERCIAL_STATUSES,
  CUSTOMER_FEEDBACK,
  OUTREACH_STATUSES,
  REQUEST_STAGES,
  SAMPLE_STATUSES,
  label,
} from "@/lib/rfq/statuses";

import { RfqChip } from "./rfq-chip";

// Team workspace for one RFQ. Every control posts one action to
// PATCH /api/admin/quotes/:id, then refreshes the server data. "Send email"
// opens the team member's own mail app (mailto:) with the RFQ composed — it
// never sends anything itself. Replies are logged by hand: the app does not
// read the team's mailbox.

export interface QuoteWorkspaceData {
  request: {
    id: string;
    reference: string;
    stage: string;
    createdAt: string;
    deadline: string | null;
    contactName: string | null;
    contactEmail: string;
    contactPhone: string | null;
    companyName: string | null;
    companyWebsite: string | null;
    accountEmail: string;
    notes: string | null;
    artworkNotes: string | null;
    artworkFileUrl: string | null;
    nextAction: string | null;
    nextActionDue: string | null;
    internalNotes: string | null;
    assignedToId: string | null;
  };
  admins: { id: string; label: string }[];
  lines: {
    id: string;
    supplier: { id: string; name: string; website: string; businessEmail: string | null; emailVerifiedAt: string | null };
    outreachStatus: string;
    commercialStatus: string;
    sharedQuoteId: string | null;
    lastContactAt: string | null;
    lastReplyAt: string | null;
    lastReplySummary: string | null;
    nextAction: string | null;
    nextActionDue: string | null;
    assignedToId: string | null;
    internalNotes: string | null;
    mail: { href: string; subject: string; body: string; truncated: boolean } | null;
    outreach: {
      id: string;
      direction: string;
      channel: string;
      subject: string | null;
      summary: string;
      occurredAt: string;
      by: string | null;
    }[];
    quotes: {
      id: string;
      receivedAt: string;
      currency: string;
      leadTimeDays: number | null;
      validUntil: string | null;
      terms: string | null;
      notes: string | null;
      lines: { itemId: string; unitPrice: number; moq: number | null; notes: string | null }[];
    }[];
    items: {
      id: string;
      productId: string;
      title: string;
      sourceUrl: string;
      quantity: number;
      specNotes: string | null;
      sampleStatus: string;
      sampleCarrier: string | null;
      sampleTracking: string | null;
      sampleDispatchedAt: string | null;
      sampleDeliveredAt: string | null;
      customerFeedback: string | null;
      customerFeedbackNote: string | null;
      supplierFeedbackNote: string | null;
    }[];
  }[];
  activities: { id: string; at: string; message: string; actor: string }[];
}

type Line = QuoteWorkspaceData["lines"][number];
type Item = Line["items"][number];

const input =
  "w-full rounded-md border border-line-strong bg-paper px-2.5 py-1.5 text-sm text-ink focus:border-ink focus:outline-none";
const btn = "h-9 rounded-md border border-ink px-3 text-sm font-medium text-ink hover:bg-well disabled:opacity-50";
const btnPrimary = "h-9 rounded-md bg-ink px-3 text-sm font-medium text-paper hover:bg-ink/85 disabled:opacity-50";
const when = (iso: string | null) => (iso ? iso.slice(0, 16).replace("T", " ") : "—");

/**
 * Keep only the fields that differ from what the server last sent, so a save
 * never writes back a stale status someone else (or another button) changed.
 */
export function changedFields(
  next: Record<string, string | null>,
  current: Record<string, unknown>,
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(next)) if (value !== (current[key] ?? null)) out[key] = value;
  return out;
}

function useAction(requestId: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(body: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/quotes/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const detail = (await response.json().catch(() => ({}))) as { error?: string };
        setError(detail.error ?? `HTTP ${response.status}`);
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("network error");
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { run, busy, error };
}

function Section({ title, children, id, aside }: { title: string; children: ReactNode; id?: string; aside?: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-xl border border-line-strong bg-paper p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {aside}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label: l, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs text-ink-muted">
      <span className="mb-1 block">{l}</span>
      {children}
    </label>
  );
}

function Select({ value, options, onChange }: { value: string; options: readonly string[]; onChange: (v: string) => void }) {
  return (
    <select className={input} value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o} value={o}>
          {label(o)}
        </option>
      ))}
    </select>
  );
}

function ErrorNote({ error }: { error: string | null }) {
  return error ? <p className="mt-2 text-xs text-danger-ink">Could not save: {error}</p> : null;
}

export function QuoteWorkspace({ data }: { data: QuoteWorkspaceData }) {
  const { request } = data;
  return (
    <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <BuyerCard data={data} />
        {data.lines.map((line) => (
          <SupplierCard
            key={[line.id, line.outreachStatus, line.commercialStatus, line.nextAction, line.nextActionDue, line.assignedToId, line.internalNotes].join("|")}
            line={line}
            data={data}
          />
        ))}
      </div>
      <div className="space-y-5">
        <RequestControls
          key={[request.stage, request.assignedToId, request.nextAction, request.nextActionDue, request.internalNotes].join("|")}
          data={data}
        />
        <Section title="Activity">
          <ol className="max-h-[560px] space-y-2.5 overflow-y-auto text-sm">
            {data.activities.map((a) => (
              <li key={a.id}>
                <span className="block font-mono text-[11px] text-ink-muted">
                  {when(a.at)} · {a.actor}
                </span>
                <span className="text-ink">{a.message}</span>
              </li>
            ))}
          </ol>
        </Section>
        <p className="text-xs text-ink-faint">Request id {request.id}</p>
      </div>
    </div>
  );
}

function BuyerCard({ data }: { data: QuoteWorkspaceData }) {
  const r = data.request;
  return (
    <Section title="Buyer" aside={<RfqChip value={r.stage} />}>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-ink-muted">Name</dt>
          <dd>{r.contactName ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Company</dt>
          <dd>
            {r.companyName ?? "—"}
            {r.companyWebsite ? (
              <a href={r.companyWebsite} target="_blank" rel="noopener noreferrer" className="ml-2 text-xs text-orange-ink underline">
                website
              </a>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Email</dt>
          <dd>
            <a href={`mailto:${r.contactEmail}?subject=${encodeURIComponent(`Your Aekobaba quote request ${r.reference}`)}`} className="text-orange-ink underline">
              {r.contactEmail}
            </a>
            {r.accountEmail !== r.contactEmail ? <span className="block text-xs text-ink-muted">account: {r.accountEmail}</span> : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Phone</dt>
          <dd>{r.contactPhone ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Received</dt>
          <dd>{when(r.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">Needed by</dt>
          <dd>{r.deadline ?? "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-ink-muted">Requirements</dt>
          <dd className="whitespace-pre-wrap">{r.notes ?? "—"}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-ink-muted">Artwork / design</dt>
          <dd>
            {r.artworkNotes ?? (r.artworkFileUrl ? "" : "—")}
            {r.artworkFileUrl ? (
              <a href={r.artworkFileUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-orange-ink underline">
                Open uploaded file
              </a>
            ) : null}
          </dd>
        </div>
      </dl>
    </Section>
  );
}

function RequestControls({ data }: { data: QuoteWorkspaceData }) {
  const r = data.request;
  const { run, busy, error } = useAction(r.id);
  const [stage, setStage] = useState(r.stage);
  const [assignedToId, setAssigned] = useState(r.assignedToId ?? "");
  const [nextAction, setNextAction] = useState(r.nextAction ?? "");
  const [nextActionDue, setDue] = useState(r.nextActionDue ?? "");
  const [internalNotes, setNotes] = useState(r.internalNotes ?? "");
  return (
    <Section title="Overall status">
      <div className="space-y-3">
        <Field label="Stage">
          <Select value={stage} options={REQUEST_STAGES} onChange={setStage} />
        </Field>
        <Field label="Assigned to">
          <select className={input} value={assignedToId} onChange={(e) => setAssigned(e.target.value)}>
            <option value="">Unassigned</option>
            {data.admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Next action">
          <input className={input} value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="e.g. Chase Burch for lead time" />
        </Field>
        <Field label="Deadline">
          <input type="date" className={input} value={nextActionDue} onChange={(e) => setDue(e.target.value)} />
        </Field>
        <Field label="Internal notes (team only)">
          <textarea className={input} rows={4} value={internalNotes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <button
          type="button"
          disabled={busy}
          className={btnPrimary}
          onClick={() =>
            run({
              action: "updateRequest",
              ...changedFields(
                {
                  stage,
                  assignedToId: assignedToId || null,
                  nextAction: nextAction.trim() || null,
                  nextActionDue: nextActionDue || null,
                  internalNotes: internalNotes.trim() || null,
                },
                r,
              ),
            })
          }
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <ErrorNote error={error} />
      </div>
    </Section>
  );
}

function SupplierCard({ line, data }: { line: Line; data: QuoteWorkspaceData }) {
  const { run, busy, error } = useAction(data.request.id);
  const [outreachStatus, setOutreach] = useState(line.outreachStatus);
  const [commercialStatus, setCommercial] = useState(line.commercialStatus);
  const [nextAction, setNextAction] = useState(line.nextAction ?? "");
  const [nextActionDue, setDue] = useState(line.nextActionDue ?? "");
  const [assignedToId, setAssigned] = useState(line.assignedToId ?? "");
  const [internalNotes, setNotes] = useState(line.internalNotes ?? "");
  const [showMail, setShowMail] = useState(Boolean(line.mail?.truncated));

  return (
    <Section
      id={`line-${line.id}`}
      title={line.supplier.name}
      aside={
        <span className="flex flex-wrap gap-1.5">
          <RfqChip value={line.outreachStatus} prefix="Outreach" />
          <RfqChip value={line.commercialStatus} prefix="Quote" />
        </span>
      }
    >
      <SupplierEmail line={line} requestId={data.request.id} />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {line.mail ? (
          <>
            <a
              href={line.mail.href}
              onClick={() => void run({ action: "emailPrepared", lineId: line.id })}
              className="inline-flex h-9 items-center rounded-md bg-orange px-4 text-sm font-semibold text-on-orange hover:bg-orange-hi"
            >
              Send email
            </a>
            <button type="button" className={btn} onClick={() => setShowMail((v) => !v)}>
              {showMail ? "Hide draft" : "Preview / copy draft"}
            </button>
          </>
        ) : (
          <span className="text-xs text-ink-muted">Add the supplier&rsquo;s verified business email to compose the RFQ.</span>
        )}
        <span className="text-xs text-ink-muted">
          Last contact {when(line.lastContactAt)} · last reply {when(line.lastReplyAt)}
        </span>
      </div>
      {line.mail?.truncated ? (
        <p className="mt-2 text-xs text-orange-ink">
          This request is too long for an email link. &ldquo;Send email&rdquo; opens the email with the subject — click
          &ldquo;Copy body&rdquo; below and paste it in.
        </p>
      ) : null}
      {showMail && line.mail ? <MailPreview mail={line.mail} /> : null}

      <ItemsTable line={line} requestId={data.request.id} />

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Supplier outreach">
          <Select value={outreachStatus} options={OUTREACH_STATUSES} onChange={setOutreach} />
        </Field>
        <Field label="Commercial quote">
          <Select value={commercialStatus} options={COMMERCIAL_STATUSES} onChange={setCommercial} />
        </Field>
        <Field label="Assigned to">
          <select className={input} value={assignedToId} onChange={(e) => setAssigned(e.target.value)}>
            <option value="">Unassigned</option>
            {data.admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Next action">
          <input className={input} value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
        </Field>
        <Field label="Deadline">
          <input type="date" className={input} value={nextActionDue} onChange={(e) => setDue(e.target.value)} />
        </Field>
        <Field label="Internal notes">
          <input className={input} value={internalNotes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={busy}
          className={btnPrimary}
          onClick={() =>
            run({
              action: "updateSupplier",
              lineId: line.id,
              ...changedFields(
                {
                  outreachStatus,
                  commercialStatus,
                  assignedToId: assignedToId || null,
                  nextAction: nextAction.trim() || null,
                  nextActionDue: nextActionDue || null,
                  internalNotes: internalNotes.trim() || null,
                },
                line,
              ),
            })
          }
        >
          {busy ? "Saving…" : "Save supplier status"}
        </button>
        {commercialStatus === "SHARED_WITH_CUSTOMER" && line.commercialStatus !== "SHARED_WITH_CUSTOMER" ? (
          <span className="text-xs text-ink-muted">Saving shows the latest quote to the customer in their account.</span>
        ) : null}
      </div>
      <ErrorNote error={error} />

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <OutreachLog line={line} requestId={data.request.id} />
        <QuotesPanel line={line} requestId={data.request.id} />
      </div>
    </Section>
  );
}

function SupplierEmail({ line, requestId }: { line: Line; requestId: string }) {
  const { run, busy, error } = useAction(requestId);
  const [editing, setEditing] = useState(!line.supplier.businessEmail);
  const [email, setEmail] = useState(line.supplier.businessEmail ?? "");
  return (
    <div className="text-sm">
      {editing ? (
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Verified business email (used for RFQs)">
            <input type="email" className={`${input} min-w-[260px]`} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="sales@supplier.com" />
          </Field>
          <button
            type="button"
            className={btn}
            disabled={busy || !email.includes("@")}
            onClick={async () => {
              if (await run({ action: "setSupplierEmail", supplierId: line.supplier.id, email: email.trim() })) setEditing(false);
            }}
          >
            Save email
          </button>
          <a href={line.supplier.website} target="_blank" rel="noopener noreferrer" className="pb-2 text-xs text-orange-ink underline">
            Find it on their website
          </a>
        </div>
      ) : (
        <p className="text-ink-muted">
          RFQ email: <span className="text-ink">{line.supplier.businessEmail}</span>
          {line.supplier.emailVerifiedAt ? <span className="text-xs"> · verified {line.supplier.emailVerifiedAt}</span> : null}
          <button type="button" className="ml-2 text-xs underline" onClick={() => setEditing(true)}>
            change
          </button>
        </p>
      )}
      <ErrorNote error={error} />
    </div>
  );
}

function MailPreview({ mail }: { mail: { subject: string; body: string } }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (what: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
    } catch {
      setCopied(null);
    }
  };
  return (
    <div className="mt-3 rounded-md border border-line bg-well p-3 text-sm">
      <p className="font-medium">{mail.subject}</p>
      <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap font-sans text-[13px] text-ink-body">{mail.body}</pre>
      <div className="mt-2 flex gap-2">
        <button type="button" className={btn} onClick={() => copy("subject", mail.subject)}>
          Copy subject
        </button>
        <button type="button" className={btn} onClick={() => copy("body", mail.body)}>
          Copy body
        </button>
        {copied ? <span className="self-center text-xs text-ink-muted">Copied {copied}</span> : null}
      </div>
      <p className="mt-2 text-xs text-ink-muted">
        &ldquo;Send email&rdquo; opens your default mail app from the account it&rsquo;s signed in to. Review it, attach any
        files, and send it yourself.
      </p>
    </div>
  );
}

function ItemsTable({ line, requestId }: { line: Line; requestId: string }) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-ink-muted">
            <th className="py-2 pr-3 font-medium">Product</th>
            <th className="py-2 pr-3 text-right font-medium">Qty</th>
            <th className="py-2 pr-3 font-medium">Sample</th>
            <th className="py-2 font-medium">Feedback</th>
          </tr>
        </thead>
        <tbody>
          {line.items.map((item) => (
            <ItemRow
              key={[item.id, item.sampleStatus, item.sampleCarrier, item.sampleTracking, item.customerFeedback, item.customerFeedbackNote, item.supplierFeedbackNote].join("|")}
              item={item}
              requestId={requestId}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ItemRow({ item, requestId }: { item: Item; requestId: string }) {
  const { run, busy, error } = useAction(requestId);
  const [open, setOpen] = useState(false);
  const [sampleStatus, setSample] = useState(item.sampleStatus);
  const [carrier, setCarrier] = useState(item.sampleCarrier ?? "");
  const [tracking, setTracking] = useState(item.sampleTracking ?? "");
  const [feedback, setFeedback] = useState(item.customerFeedback ?? "");
  const [customerNote, setCustomerNote] = useState(item.customerFeedbackNote ?? "");
  const [supplierNote, setSupplierNote] = useState(item.supplierFeedbackNote ?? "");
  return (
    <>
      <tr className="border-b border-line align-top">
        <td className="py-2.5 pr-3">
          <a href={`/products/${item.productId}`} target="_blank" rel="noopener noreferrer" className="text-ink hover:underline">
            {item.title}
          </a>
          {item.specNotes ? <span className="block text-xs text-ink-muted">Spec: {item.specNotes}</span> : null}
          <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-ink underline">
            supplier page ↗
          </a>
        </td>
        <td className="py-2.5 pr-3 text-right tabular-nums">{item.quantity.toLocaleString("en-US")}</td>
        <td className="py-2.5 pr-3">
          <RfqChip value={item.sampleStatus} />
          {item.sampleTracking ? <span className="block text-xs text-ink-muted">{[item.sampleCarrier, item.sampleTracking].filter(Boolean).join(" ")}</span> : null}
        </td>
        <td className="py-2.5">
          {item.customerFeedback ? <RfqChip value={item.customerFeedback} /> : <span className="text-xs text-ink-faint">—</span>}
          <button type="button" className="ml-2 text-xs underline" onClick={() => setOpen((v) => !v)}>
            {open ? "close" : "edit"}
          </button>
        </td>
      </tr>
      {open ? (
        <tr className="border-b border-line bg-well/60">
          <td colSpan={4} className="p-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Sample status">
                <Select value={sampleStatus} options={SAMPLE_STATUSES} onChange={setSample} />
              </Field>
              <Field label="Carrier">
                <input className={input} value={carrier} onChange={(e) => setCarrier(e.target.value)} />
              </Field>
              <Field label="Tracking number">
                <input className={input} value={tracking} onChange={(e) => setTracking(e.target.value)} />
              </Field>
              <Field label="Customer feedback">
                <select className={input} value={feedback} onChange={(e) => setFeedback(e.target.value)}>
                  <option value="">—</option>
                  {CUSTOMER_FEEDBACK.map((f) => (
                    <option key={f} value={f}>
                      {label(f)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Customer feedback note">
                <input className={input} value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} />
              </Field>
              <Field label="Supplier feedback note">
                <input className={input} value={supplierNote} onChange={(e) => setSupplierNote(e.target.value)} />
              </Field>
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              Dispatched {item.sampleDispatchedAt ?? "—"} · delivered {item.sampleDeliveredAt ?? "—"} (set automatically when the status changes)
            </p>
            <button
              type="button"
              disabled={busy}
              className={`${btnPrimary} mt-3`}
              onClick={async () => {
                const ok = await run({
                  action: "updateItem",
                  itemId: item.id,
                  ...changedFields(
                    {
                      sampleStatus,
                      sampleCarrier: carrier.trim() || null,
                      sampleTracking: tracking.trim() || null,
                      customerFeedback: feedback || null,
                      customerFeedbackNote: customerNote.trim() || null,
                      supplierFeedbackNote: supplierNote.trim() || null,
                    },
                    item,
                  ),
                });
                if (ok) setOpen(false);
              }}
            >
              {busy ? "Saving…" : "Save product"}
            </button>
            <ErrorNote error={error} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function OutreachLog({ line, requestId }: { line: Line; requestId: string }) {
  const { run, busy, error } = useAction(requestId);
  const [direction, setDirection] = useState<"OUTBOUND" | "INBOUND">("INBOUND");
  const [channel, setChannel] = useState("EMAIL");
  const [summary, setSummary] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  return (
    <div>
      <h3 className="text-sm font-semibold">Contact history</h3>
      <ol className="mt-2 max-h-56 space-y-2 overflow-y-auto text-sm">
        {line.outreach.length === 0 ? <li className="text-xs text-ink-muted">Nothing recorded yet.</li> : null}
        {line.outreach.map((o) => (
          <li key={o.id} className="rounded-md bg-well px-2.5 py-1.5">
            <span className="block text-[11px] text-ink-muted">
              {when(o.occurredAt)} · {o.direction === "OUTBOUND" ? "we contacted them" : "they replied"} · {o.channel.toLowerCase()}
              {o.by ? ` · ${o.by}` : ""}
            </span>
            {o.summary}
          </li>
        ))}
      </ol>
      <div className="mt-3 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <select className={input} value={direction} onChange={(e) => setDirection(e.target.value as "OUTBOUND" | "INBOUND")}>
            <option value="INBOUND">Reply received</option>
            <option value="OUTBOUND">We contacted</option>
          </select>
          <select className={input} value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="EMAIL">Email</option>
            <option value="PHONE">Phone</option>
            <option value="OTHER">Other</option>
          </select>
          <input type="datetime-local" className={input} value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
        </div>
        <textarea
          className={input}
          rows={2}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder={direction === "INBOUND" ? "What did they say? (paste the key points)" : "What did we send / ask?"}
        />
        <button
          type="button"
          className={btn}
          disabled={busy || !summary.trim()}
          onClick={async () => {
            const ok = await run({
              action: "logOutreach",
              lineId: line.id,
              direction,
              channel,
              summary: summary.trim(),
              ...(occurredAt ? { occurredAt: new Date(occurredAt).toISOString() } : {}),
            });
            if (ok) {
              setSummary("");
              setOccurredAt("");
            }
          }}
        >
          Record
        </button>
        <ErrorNote error={error} />
      </div>
    </div>
  );
}

function QuotesPanel({ line, requestId }: { line: Line; requestId: string }) {
  const { run, busy, error } = useAction(requestId);
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [leadTimeDays, setLead] = useState("");
  const [validUntil, setValid] = useState("");
  const [terms, setTerms] = useState("");
  const [prices, setPrices] = useState<Record<string, { unitPrice: string; moq: string }>>({});
  const titleOf = (itemId: string) => line.items.find((i) => i.id === itemId)?.title ?? "item";
  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Supplier quotes</h3>
        <button type="button" className="text-xs underline" onClick={() => setOpen((v) => !v)}>
          {open ? "cancel" : "+ record a quote"}
        </button>
      </div>
      {line.quotes.length === 0 && !open ? <p className="mt-2 text-xs text-ink-muted">No quote received yet.</p> : null}
      <div className="mt-2 space-y-2">
        {line.quotes.map((q) => (
          <div key={q.id} className="rounded-md bg-well px-2.5 py-2 text-sm">
            <p className="text-[11px] text-ink-muted">
              {q.id === line.sharedQuoteId ? (
                <span className="mr-1 rounded bg-success-tint px-1.5 py-0.5 font-medium text-success-deep">Shared with customer</span>
              ) : null}
              Received {when(q.receivedAt)} · {q.currency}
              {q.leadTimeDays ? ` · ${q.leadTimeDays}-day lead time` : ""}
              {q.validUntil ? ` · valid until ${q.validUntil}` : ""}
            </p>
            <ul className="mt-1">
              {q.lines.map((l) => (
                <li key={l.itemId} className="flex justify-between gap-3">
                  <span className="truncate">{titleOf(l.itemId)}</span>
                  <span className="tabular-nums">
                    {l.unitPrice} {q.currency}
                    {l.moq ? ` · MOQ ${l.moq}` : ""}
                  </span>
                </li>
              ))}
            </ul>
            {q.terms ? <p className="mt-1 text-xs text-ink-muted">{q.terms}</p> : null}
          </div>
        ))}
      </div>
      {open ? (
        <div className="mt-3 space-y-2">
          {line.items.map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_96px_80px] items-center gap-2 text-sm">
              <span className="truncate">{item.title}</span>
              <input
                className={input}
                inputMode="decimal"
                placeholder="Unit price"
                value={prices[item.id]?.unitPrice ?? ""}
                onChange={(e) => setPrices((p) => ({ ...p, [item.id]: { unitPrice: e.target.value, moq: p[item.id]?.moq ?? "" } }))}
              />
              <input
                className={input}
                inputMode="numeric"
                placeholder="MOQ"
                value={prices[item.id]?.moq ?? ""}
                onChange={(e) => setPrices((p) => ({ ...p, [item.id]: { unitPrice: p[item.id]?.unitPrice ?? "", moq: e.target.value } }))}
              />
            </div>
          ))}
          <div className="grid grid-cols-3 gap-2">
            <input className={input} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} placeholder="USD" />
            <input className={input} inputMode="numeric" value={leadTimeDays} onChange={(e) => setLead(e.target.value)} placeholder="Lead days" />
            <input type="date" className={input} value={validUntil} onChange={(e) => setValid(e.target.value)} title="Valid until" />
          </div>
          <input className={input} value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Terms (shipping, payment…)" />
          <button
            type="button"
            className={btnPrimary}
            disabled={busy}
            onClick={async () => {
              const lines = Object.entries(prices)
                .filter(([, v]) => Number(v.unitPrice) > 0)
                .map(([itemId, v]) => ({ itemId, unitPrice: Number(v.unitPrice), moq: v.moq ? Number(v.moq) : null }));
              if (lines.length === 0) return;
              const ok = await run({
                action: "recordQuote",
                lineId: line.id,
                currency: currency || "USD",
                leadTimeDays: leadTimeDays ? Number(leadTimeDays) : null,
                validUntil: validUntil || null,
                terms: terms.trim() || null,
                lines,
              });
              if (ok) {
                setOpen(false);
                setPrices({});
              }
            }}
          >
            {busy ? "Saving…" : "Save quote"}
          </button>
          <p className="text-xs text-ink-muted">
            The customer sees it only after you set the quote status to &ldquo;Shared with customer&rdquo;.
          </p>
          <ErrorNote error={error} />
        </div>
      ) : null}
    </div>
  );
}
