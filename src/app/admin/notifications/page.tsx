import type { Metadata } from "next";

import { RetryOutboxButton } from "@/components/admin/retry-outbox";
import { WorkspaceShell } from "@/components/workspace/shell";
import { requireAdminPage } from "@/lib/auth/admin";
import { db } from "@/lib/db";
import { emailConfigured, teamInbox } from "@/lib/notify/outbox";

export const metadata: Metadata = { title: "Email outbox · Admin" };
export const dynamic = "force-dynamic";

// Every automated team email, with its delivery state. Undelivered rows are
// retried by the cron job and by the button here.

export default async function AdminNotificationsPage() {
  await requireAdminPage("/admin/notifications");
  const rows = await db.notificationOutbox.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  const configured = emailConfigured();
  const undelivered = rows.filter((r) => r.status !== "SENT").length;

  return (
    <WorkspaceShell area="admin" active="notifications" title="Email outbox" subtitle={`Automated notifications to ${teamInbox()}.`}>
      {!configured ? (
        <p className="mb-5 rounded-md border border-orange/40 bg-orange-tint px-4 py-3 text-sm text-orange-ink">
          Email sending isn&rsquo;t configured, so nothing leaves the outbox yet. Set RESEND_API_KEY and EMAIL_FROM in the Vercel
          environment variables, then retry.
        </p>
      ) : null}
      <div className="mb-4 flex items-center gap-3">
        <RetryOutboxButton disabled={!configured || undelivered === 0} />
        <span className="text-sm text-ink-muted">{undelivered} undelivered</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-muted">
              <th className="py-2 pr-3 font-medium">Created</th>
              <th className="py-2 pr-3 font-medium">Subject</th>
              <th className="py-2 pr-3 font-medium">To</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 font-medium">Attempts / error</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line align-top">
                <td className="py-2.5 pr-3 font-mono text-xs text-ink-muted">{r.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                <td className="py-2.5 pr-3">
                  <details>
                    <summary className="cursor-pointer">{r.subject}</summary>
                    <pre className="mt-2 whitespace-pre-wrap font-sans text-xs text-ink-body">{r.textBody}</pre>
                  </details>
                </td>
                <td className="py-2.5 pr-3 text-xs">{r.toEmail}</td>
                <td className="py-2.5 pr-3 text-xs font-medium">
                  {r.status === "SENT" ? <span className="text-success-ink">Sent {r.sentAt?.toISOString().slice(0, 16).replace("T", " ")}</span> : r.status}
                </td>
                <td className="py-2.5 text-xs text-ink-muted">
                  {r.attempts}
                  {r.lastError ? <span className="block max-w-[280px] truncate text-danger-ink">{r.lastError}</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WorkspaceShell>
  );
}
