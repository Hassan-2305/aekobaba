import type { Metadata } from "next";

import { BasketView } from "@/components/quotes/basket-view";
import { getCurrentUserRole, getServerSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

// The Quote Basket: products collected from any supplier, sent as one request
// to the Aekovera team. Signed-in buyers get their contact details prefilled.

export const metadata: Metadata = {
  title: "Quote Basket — Aekobaba",
  description: "Collect packaging from any supplier and request quotes in one go.",
};
export const dynamic = "force-dynamic";

export default async function BasketPage() {
  const session = await getServerSessionUser().catch(() => null);
  const role = session ? await getCurrentUserRole(session.supabaseUserId).catch(() => null) : null;
  const user =
    session && role === "BRAND"
      ? await db.user
          .findUnique({
            where: { supabaseUserId: session.supabaseUserId },
            select: { name: true, phone: true, brandProfile: { select: { companyName: true } } },
          })
          .catch(() => null)
      : null;

  return (
    <BasketView
      signedInRole={session ? role : null}
      defaults={{
        name: user?.name ?? null,
        email: session?.email ?? null,
        phone: user?.phone ?? null,
        company: user?.brandProfile?.companyName ?? null,
      }}
    />
  );
}
