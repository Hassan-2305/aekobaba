import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SupplierInbox, SupplierInboxUnclaimed, type InboxView } from "@/components/supplier/inbox-view";
import { WorkspaceShell } from "@/components/workspace/shell";
import { getServerSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { listSupplierLeads, type InboxLeadGroup } from "@/lib/supplier/inbox";
import type { SupplierStatusValue } from "@/lib/catalog/view-models";

export const metadata: Metadata = {
  title: "Lead inbox · Aekobaba",
  description: "Quote leads from brands, grouped by request.",
};

// The supplier lead inbox: incoming QuoteRequestItems grouped by their parent
// request, newest first. This page owns auth and queries; the layout lives in
// SupplierInbox (src/components/supplier/inbox-view.tsx).

export default async function SupplierInboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSessionUser();
  if (!session) redirect("/auth/sign-in?next=%2Fsupplier%2Finbox");

  const params = await searchParams;
  const view: InboxView = params.view === "open" || params.view === "answered" ? params.view : "all";

  const user = await db.user.findUnique({
    where: { supabaseUserId: session.supabaseUserId },
    select: { id: true },
  });

  const supplier = user
    ? await db.supplier.findFirst({
        where: { ownerUserId: user.id },
        select: { id: true, slug: true, name: true, status: true, responseTimeHours: true },
      })
    : null;

  if (!supplier || !user) return <SupplierInboxUnclaimed />;

  // Aekobaba mediates every request: the Aekovera team contacts suppliers by
  // email. Direct in-app leads stay off until SUPPLIER_DIRECT_LEADS=on.
  if (process.env.SUPPLIER_DIRECT_LEADS !== "on") {
    return (
      <WorkspaceShell area="supplier" active="inbox" title="Lead inbox" subtitle={supplier.name}>
        <p className="max-w-xl rounded-md border border-line bg-well px-5 py-4 text-sm leading-relaxed text-ink">
          Buyer requests for your products are handled by the Aekovera team, who will email you at your business address
          with each request and its reference. Reply to that email and the team takes it from there.
        </p>
      </WorkspaceShell>
    );
  }

  const groups: InboxLeadGroup[] = await listSupplierLeads(db, user.id);

  return (
    <SupplierInbox
      supplier={{ ...supplier, status: supplier.status as SupplierStatusValue }}
      groups={groups}
      view={view}
      now={new Date()}
    />
  );
}
