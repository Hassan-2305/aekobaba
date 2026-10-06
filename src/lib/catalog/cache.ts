import { revalidateTag } from "next/cache";

// Catalog cache tag. Every catalog read in queries.ts is cached under it;
// admin mutations clear it so edits appear immediately instead of after
// the CATALOG_REVALIDATE_SECONDS refresh.

export const CATALOG_TAG = "catalog";
export const CATALOG_REVALIDATE_SECONDS = 300;

/** Drop every cached catalog read — call after any admin edit to the catalog. */
export function revalidateCatalog(): void {
  try {
    revalidateTag(CATALOG_TAG);
  } catch {
    // Outside a Next request (tests, scripts) there is no cache to clear.
  }
}
