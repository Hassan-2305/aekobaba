import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { QUEUE_STATUSES, SupplierQueue, type QueueRow, type QueueStatus } from "@/components/admin/supplier-queue";
import { assessVerificationGates, gatesPassed } from "@/lib/admin/gates";
import type { SupplierGateFacts } from "@/lib/admin/gates";
import { getServerSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Supplier verification · Aekobaba",
  description: "Queue suppliers against the four verification gates and assign tiers.",
};

// The admin verification queue: every supplier scored against the plan's four
// gates (real operating company / verifiable prices / sells to CPG in our
// categories / no unresolved trust problems), with the evidence for each gate
// visible next to the verdict. Tier assignment persists Supplier.status, which
// the public supplier page badge reads.

const STATUS_ORDER = QUEUE_STATUSES;

async function gateFactsBySupplier(): Promise<Map<string, SupplierGateFacts>> {
  // Three set-based queries instead of per-supplier rounds.
  const [totals, priced, categoryPairs] = await Promise.all([
    db.product.groupBy({ by: ["supplierId"], _count: { _all: true } }),
    db.product.groupBy({
      by: ["supplierId"],
      _count: { _all: true },
      where: {
        OR: [{ basePrice: { not: null } }, { priceType: { in: ["EXACT", "CALCULATOR", "FROM"] } }],
      },
    }),
    // Distinct (supplier, category) pairs — "sells to CPG in our categories".
    db.product.findMany({
      select: { supplierId: true, categoryId: true },
      distinct: ["supplierId", "categoryId"],
    }),
  ]);

  const totalBy = new Map(totals.map((t) => [t.supplierId, t._count._all]));
  const pricedBy = new Map(priced.map((t) => [t.supplierId, t._count._all]));
  const categoriesBy = new Map<string, Set<string>>();
  for (const pair of categoryPairs) {
    const set = categoriesBy.get(pair.supplierId) ?? new Set<string>();
    set.add(pair.categoryId);
    categoriesBy.set(pair.supplierId, set);
  }

  const facts = new Map<string, SupplierGateFacts>();
  for (const supplierId of totalBy.keys()) {
    const categorySet = categoriesBy.get(supplierId) ?? new Set<string>();
    facts.set(supplierId, {
      legalIdentity: null, // filled from the supplier row below
      productCount: totalBy.get(supplierId) ?? 0,
      pricedProductCount: pricedBy.get(supplierId) ?? 0,
      categoryCount: categorySet.size,
      reviewCount: 0,
      reviewScore: null,
    });
  }
  return facts;
}

export default async function AdminSuppliersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getServerSessionUser();
  if (!session) redirect("/auth/sign-in?next=%2Fadmin%2Fsuppliers");

  const params = await searchParams;
  const requested = typeof params.status === "string" ? params.status.toUpperCase() : "";
  const filter: QueueStatus | "ALL" = (QUEUE_STATUSES as readonly string[]).includes(requested)
    ? (requested as QueueStatus)
    : "ALL";

  const [suppliers, factsBySupplier] = await Promise.all([
    db.supplier.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        location: true,
        website: true,
        status: true,
        legalIdentity: true,
        reviewScore: true,
        reviewCount: true,
        lastVerifiedAt: true,
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    gateFactsBySupplier(),
  ]);

  const rows: QueueRow[] = [...suppliers]
    .sort(
      (a, b) =>
        STATUS_ORDER.indexOf(a.status as QueueStatus) - STATUS_ORDER.indexOf(b.status as QueueStatus) ||
        a.name.localeCompare(b.name),
    )
    .map((supplier) => {
      const facts = factsBySupplier.get(supplier.id);
      const gates = assessVerificationGates({
        legalIdentity: supplier.legalIdentity,
        productCount: facts?.productCount ?? 0,
        pricedProductCount: facts?.pricedProductCount ?? 0,
        categoryCount: facts?.categoryCount ?? 0,
        reviewCount: supplier.reviewCount,
        reviewScore: supplier.reviewScore,
      });
      return {
        id: supplier.id,
        slug: supplier.slug,
        name: supplier.name,
        location: supplier.location,
        website: supplier.website,
        status: supplier.status as QueueStatus,
        lastVerifiedAt: supplier.lastVerifiedAt,
        gates,
        passed: gatesPassed(gates),
      };
    });

  return <SupplierQueue rows={rows} filter={filter} />;
}
