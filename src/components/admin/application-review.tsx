"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { APPLICATION_STATUSES, MEETING_STATUSES, label } from "@/lib/rfq/statuses";

const input =
  "w-full rounded-md border border-line-strong bg-paper px-2.5 py-1.5 text-sm text-ink focus:border-ink focus:outline-none";

// Status, notes and (partnerships) meeting tracking for one application.

export function ApplicationReview(props: {
  id: string;
  type: string;
  status: string;
  internalNotes: string | null;
  meeting: { status: string; scheduledAt: string | null; outcome: string | null; followUp: string | null } | null;
  bookingUrl: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(props.status);
  const [notes, setNotes] = useState(props.internalNotes ?? "");
  const [meetingStatus, setMeetingStatus] = useState(props.meeting?.status ?? "BOOKING_PENDING");
  const [scheduledAt, setScheduledAt] = useState(props.meeting?.scheduledAt ?? "");
  const [outcome, setOutcome] = useState(props.meeting?.outcome ?? "");
  const [followUp, setFollowUp] = useState(props.meeting?.followUp ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const partnership = props.type === "PARTNERSHIP";

  async function save() {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/admin/applications/${props.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        internalNotes: notes.trim() || null,
        ...(partnership
          ? {
              meeting: {
                status: meetingStatus,
                scheduledAt: scheduledAt ? `${scheduledAt}:00` : null,
                outcome: outcome.trim() || null,
                followUp: followUp.trim() || null,
              },
            }
          : {}),
      }),
    }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      setError("Could not save.");
      return;
    }
    router.refresh();
  }

  return (
    <section className="h-fit space-y-3 rounded-xl border border-line-strong bg-paper p-5 text-sm">
      <h2 className="text-base font-semibold">Review</h2>
      <label className="block text-xs text-ink-muted">
        Status
        <select className={`${input} mt-1`} value={status} onChange={(e) => setStatus(e.target.value)}>
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "CONTACTED" ? "Contacted" : label(s)}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs text-ink-muted">
        Internal notes
        <textarea className={`${input} mt-1`} rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      {partnership ? (
        <div className="space-y-3 border-t border-line pt-3">
          <h3 className="text-sm font-semibold">Partner meeting</h3>
          {props.bookingUrl ? (
            <a href={props.bookingUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-ink underline">
              Open the booking page
            </a>
          ) : (
            <p className="text-xs text-ink-muted">No booking page configured (NEXT_PUBLIC_PARTNER_BOOKING_URL).</p>
          )}
          <label className="block text-xs text-ink-muted">
            Meeting status
            <select className={`${input} mt-1`} value={meetingStatus} onChange={(e) => setMeetingStatus(e.target.value)}>
              {MEETING_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-ink-muted">
            Scheduled for
            <input type="datetime-local" className={`${input} mt-1`} value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          </label>
          <label className="block text-xs text-ink-muted">
            Outcome
            <textarea className={`${input} mt-1`} rows={2} value={outcome} onChange={(e) => setOutcome(e.target.value)} />
          </label>
          <label className="block text-xs text-ink-muted">
            Follow-up actions
            <textarea className={`${input} mt-1`} rows={2} value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
          </label>
        </div>
      ) : null}
      <button type="button" disabled={busy} onClick={() => void save()} className="h-9 rounded-md bg-ink px-4 font-medium text-paper hover:bg-ink/85 disabled:opacity-50">
        {busy ? "Saving…" : "Save"}
      </button>
      {error ? <p className="text-xs text-danger-ink">{error}</p> : null}
    </section>
  );
}
