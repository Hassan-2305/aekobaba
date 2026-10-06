import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SupplierInbox, type InboxView } from "@/components/supplier/inbox-view";
import { getSupplier } from "@/lib/catalog/queries";
import type { InboxLeadGroup } from "@/lib/supplier/inbox";

// Supplier-side demo: what a partner's lead inbox looks like, built from the
// partner's REAL listings (titles, prices, MOQs, capture dates) with SAMPLE
// requests — no buyer data exists or is invented as real. The page says so
// in a banner, is partner-only, and is kept out of search indexes. The live
// inbox (/supplier/inbox) is behind supplier sign-in.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lead inbox preview",
  robots: { index: false, follow: false },
};

interface PreviewPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string }>;
}

const DAY = 24 * 60 * 60 * 1000;

export default async function InboxPreviewPage({ params, searchParams }: PreviewPageProps) {
  const [{ slug }, { view: rawView }] = await Promise.all([params, searchParams]);
  const supplier = await getSupplier(slug);
  if (!supplier || !supplier.isPartner || supplier.products.length === 0) notFound();

  const now = new Date();
  const at = (days: number) => new Date(now.getTime() + days * DAY);
  const products = supplier.products;
  const pick = (i: number) => products[i % products.length];
  const item = (id: string, i: number, quantity: number, status: "SENT" | "QUOTED" | "DECLINED") => {
    const p = pick(i);
    return {
      id,
      quantity,
      status,
      createdAt: at(-2),
      product: {
        id: p.id,
        title: p.title,
        material: p.material,
        priceType: p.priceType,
        basePrice: p.basePrice,
        priceBasis: p.priceBasis,
        moq: p.moq,
        sourceCapturedAt: new Date(p.sourceCapturedAt),
      },
    };
  };

  const groups: InboxLeadGroup[] = [
    {
      request: {
        id: "sample-req-00000001",
        status: "SENT",
        deadline: at(5),
        artworkNotes: "Sample request — one-colour logo on the front label panel; matte finish.",
        createdAt: at(-1),
      },
      items: [item("sample-item-1", 0, 5000, "SENT"), item("sample-item-2", 1, 5000, "SENT")],
    },
    {
      request: {
        id: "sample-req-00000002",
        status: "SENT",
        deadline: at(21),
        artworkNotes: null,
        createdAt: at(-3),
      },
      items: [item("sample-item-3", 5, 1200, "SENT")],
    },
    {
      request: {
        id: "sample-req-00000003",
        status: "QUOTED",
        deadline: at(30),
        artworkNotes: "Sample request — needs FDA food-contact confirmation with the quote.",
        createdAt: at(-6),
      },
      items: [item("sample-item-4", 2, 10000, "QUOTED"), item("sample-item-5", 3, 10000, "DECLINED")],
    },
  ];

  const view: InboxView = rawView === "open" || rawView === "answered" ? rawView : "all";

  return (
    <div>
      <div
        role="note"
        data-testid="preview-banner"
        className="border-b border-orange/40 bg-orange-tint px-5 py-3 text-sm text-ink sm:px-8 lg:px-[var(--edge)]"
      >
        <strong className="font-semibold">Preview with sample requests.</strong> The listings are{" "}
        {supplier.name}&rsquo;s real catalog on Aekobaba; the requests, quantities and dates are
        illustrative only. Real leads arrive in the signed-in supplier inbox.
      </div>
      <SupplierInbox
        supplier={{
          name: supplier.name,
          status: supplier.status,
          slug: supplier.slug,
          responseTimeHours: null,
        }}
        groups={groups}
        view={view}
        now={now}
        preview={{ basePath: `/suppliers/${supplier.slug}/inbox-preview` }}
      />
    </div>
  );
}
