import type { ProductVM, SupplierStatusValue } from "./view-models";

// Marketplace metadata tags shown on catalog objects ("FSC", "FOOD GRADE",
// "STOCK"…). The honesty rule applies here as everywhere: a tag renders only
// when the catalog record actually says so — nothing is inferred to decorate.

/** Recommended and Listed suppliers have passed verification (see tiers). */
export function isVerifiedSupplier(status: SupplierStatusValue): boolean {
  return status === "RECOMMENDED" || status === "LISTED";
}

const FOOD_GRADE = /food[\s-]?(grade|safe|contact)/i;

/** True when the supplier's own wording (or a certification) says food grade / food contact. */
export function isFoodGrade(
  product: Pick<ProductVM, "certificationNames" | "title" | "material" | "description">,
): boolean {
  const text = `${product.title} ${product.material} ${product.description ?? ""} ${product.certificationNames.join(" ")}`;
  return FOOD_GRADE.test(text);
}

/**
 * Up to `limit` short tags for a product, most specific first:
 * supplier certifications, food-grade wording the supplier published,
 * a verified sample policy, then stock vs custom.
 */
export function productTags(
  product: Pick<
    ProductVM,
    "certificationNames" | "title" | "material" | "description" | "samplePolicyVerified" | "stockOrCustom" | "section"
  >,
  limit = 3,
): string[] {
  const tags: string[] = [...product.certificationNames];
  if (product.section === "INGREDIENTS") {
    // Ingredients: packaging labels (food grade, stock/custom) don't apply.
    tags.push("Food ingredient");
    if (product.samplePolicyVerified) tags.push("R&D samples");
    return [...new Set(tags)].slice(0, limit);
  }
  if (isFoodGrade(product)) tags.push("Food grade");
  if (product.samplePolicyVerified) tags.push("Samples");
  tags.push(product.stockOrCustom === "STOCK" ? "Stock" : "Custom");
  return [...new Set(tags)].slice(0, limit);
}
