import { getAllProducts, getCategories } from "@/lib/catalog/queries";

// GET /api/catalog/menu — live listing counts for the header's mega menu.
// The header itself is static (it renders on prerendered pages that must
// build without a database), so counts load here when the menu first opens.
// Served from the cached catalog; cheap.

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [categories, products] = await Promise.all([getCategories(), getAllProducts()]);
    return Response.json(
      {
        counts: Object.fromEntries(categories.map((c) => [c.slug, c.productCount])),
        products: products.length,
        suppliers: new Set(products.map((p) => p.supplier.slug)).size,
      },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
    );
  } catch {
    return Response.json({ counts: {}, products: null, suppliers: null }, { status: 200 });
  }
}
