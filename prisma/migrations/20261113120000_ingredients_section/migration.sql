-- Ingredient suppliers: categories carry a marketplace section; products can carry
-- supplier-published key specs and named applications.
-- CreateEnum
CREATE TYPE "CatalogSection" AS ENUM ('PACKAGING', 'INGREDIENTS');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "section" "CatalogSection" NOT NULL DEFAULT 'PACKAGING';

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "applications" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "keySpecs" JSONB;

