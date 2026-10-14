import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProductDetailView } from "@/components/catalog/product-detail-view";
import { SupplierReviews } from "@/components/catalog/supplier-reviews";
import { getAllProducts, getProduct } from "@/lib/catalog/queries";
import { similarProducts, variantsOf } from "@/lib/catalog/related";

// Product page: thin data wrapper. The layout and rendering live in
// src/components/catalog/product-detail-view.tsx (presentational,
// test-covered); this file owns the query, metadata, and the 404. Variants
// and similar products come from the same cached catalog pass — no extra
// round-trips.

// Catalog pages render at request time — the build must never need a database.
export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return { title: "Product" };
  return {
    title: product.title,
    description: `${product.title} from ${product.supplier.name} — specifications, price tiers, minimum order and quote request on Aekobaba.`,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const [product, all] = await Promise.all([getProduct(id), getAllProducts()]);
  if (!product) notFound();

  return (
    <ProductDetailView
      product={product}
      variants={variantsOf(product, all)}
      similar={similarProducts(product, all)}
      reviews={
        <Suspense
          fallback={<div className="skeleton mt-20 h-64 bg-well" aria-label="Loading supplier reviews" />}
        >
          <SupplierReviews supplier={product.supplier} />
        </Suspense>
      }
    />
  );
}
