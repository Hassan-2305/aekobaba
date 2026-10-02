import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SupplierInbox, SupplierInboxUnclaimed, type InboxView } from "@/components/supplier/inbox-view";
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
