"use client";

import { useRouter } from "next/navigation";

// "Send email" for one supplier line: opens the team member's mail app with
// the composed RFQ (mailto:) and records "Email prepared" on the request.

export function SendEmailLink({ requestId, lineId, href }: { requestId: string; lineId: string; href: string }) {
  const router = useRouter();
  return (
    <a
      href={href}
      onClick={() => {
        void fetch(`/api/admin/quotes/${requestId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "emailPrepared", lineId }),
        }).then(() => router.refresh());
      }}
      className="inline-flex h-8 items-center rounded-md bg-orange px-3 text-xs font-semibold text-on-orange hover:bg-orange-hi"
    >
      Send email
    </a>
  );
}
