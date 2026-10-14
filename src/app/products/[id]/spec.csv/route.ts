import { getProduct } from "@/lib/catalog/queries";
import { specSheetCsv } from "@/lib/catalog/spec-sheet";

// GET /products/[id]/spec.csv — the specification sheet as a CSV download.

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return new Response("Not found", { status: 404 });
  const name = product.title.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "product";
  return new Response(specSheetCsv(product), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}-spec.csv"`,
    },
  });
}
