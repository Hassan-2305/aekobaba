import type { Metadata } from "next";
import Link from "next/link";

import { ApplicationForm } from "@/components/supplier/application-form";
import { getServerSessionUser } from "@/lib/auth/session";

// Become a partner: company + contact details are saved first, then the
// visitor picks a slot on the team's booking page (Google Calendar appointment
// schedule or similar — NEXT_PUBLIC_PARTNER_BOOKING_URL). The booking provider
// sends the invitations; the team records the meeting outcome in the dashboard.

export const metadata: Metadata = {
  title: "Become a partner — Aekobaba",
  description: "Partner with Aekobaba: labelled placement, a branded storefront and photography for your catalog.",
};
export const dynamic = "force-dynamic";

export default async function PartnerApplyPage() {
  const session = await getServerSessionUser().catch(() => null);
  const bookingConfigured = Boolean(process.env.NEXT_PUBLIC_PARTNER_BOOKING_URL?.trim());
  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-12 sm:px-8">
      <Link href="/partners" className="text-sm text-ink-muted hover:text-ink">
        ← Partner program
      </Link>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink">Become a partner</h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-body">
        Tell us about your company, then {bookingConfigured ? "choose a time for a call with the Aekovera team" : "we'll email you to set up a call"}.
        Partner placement is always labelled as sponsored.
      </p>
      <div className="mt-8 rounded-xl border border-line-strong bg-paper p-6">
        <ApplicationForm type="PARTNERSHIP" categories={[]} defaults={{ contactEmail: session?.email ?? null }} />
      </div>
    </div>
  );
}
