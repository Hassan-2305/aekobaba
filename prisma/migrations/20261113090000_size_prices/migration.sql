-- Per-size prices: a size of one listing can carry its own price and quantity tiers.
-- AlterTable
ALTER TABLE "ProductSize" ADD COLUMN     "basePrice" DECIMAL(12,4),
ADD COLUMN     "quantityBreaks" JSONB;
