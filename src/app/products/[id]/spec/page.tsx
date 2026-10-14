import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getProduct } from "@/lib/catalog/queries";
import { specSheetRows } from "@/lib/catalog/spec-sheet";
import { PrintButton } from "./print-button";

// Printable specification sheet for one product — the same values as the
// product page, laid out for paper / "Save as PDF".

export const dynamic = "force-dynamic";

interface SpecPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: SpecPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  return { title: product ? `Spec sheet — ${product.title}` : "Spec sheet", robots: { index: false } };
}

export default async function SpecSheetPage({ params }: SpecPageProps) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();
  const rows = specSheetRows(product);

  return (
    <div className="mx-auto max-w-[820px] px-5 py-10 print:max-w-none print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link href={`/products/${product.id}`} className="text-sm text-ink underline decoration-orange underline-offset-4">
          ← Back to product
        </Link>
        <div className="flex gap-2">
          <a
            href={`/products/${product.id}/spec.csv`}
            download
            className="inline-flex h-10 items-center border border-line px-5 text-sm font-medium text-ink hover:border-ink"
          >
            Download CSV
          </a>
          <PrintButton />
        </div>
      </div>
      <article data-testid="spec-sheet" className="mt-8 bg-card p-8 print:mt-0 print:bg-white print:p-0">
        <p className="tag text-ink-faint">Aekobaba · Specification sheet</p>
        <h1 className="mt-3 text-2xl font-semibold leading-tight text-ink">{product.title}</h1>
        <table className="mt-6 w-full border-t border-line text-sm">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label} className="border-b border-line align-top">
                <th scope="row" className="w-[34%] py-2.5 pr-4 text-left font-medium text-ink-muted">
                  {label}
                </th>
                <td className="break-words py-2.5 text-ink tabular-nums">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-6 text-xs text-ink-faint">
          Values as published by the supplier. Anything marked &ldquo;Not published&rdquo; should be
          confirmed in the quote.
        </p>
      </article>
    </div>
  );
}
