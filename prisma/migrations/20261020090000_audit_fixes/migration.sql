-- AlterEnum
ALTER TYPE "OutboxStatus" ADD VALUE 'SENDING';

-- AlterTable
ALTER TABLE "QuoteRequestSupplier" ADD COLUMN     "sharedQuoteId" TEXT;


-- Requests created before the RFQ workflow have no per-supplier rows; give
-- them one per supplier in their items so they show up in the dashboards.
INSERT INTO "QuoteRequestSupplier" ("id", "quoteRequestId", "supplierId", "updatedAt")
SELECT 'qrs_' || md5(i."quoteRequestId" || ':' || p."supplierId"), i."quoteRequestId", p."supplierId", now()
FROM "QuoteRequestItem" i
JOIN "Product" p ON p."id" = i."productId"
GROUP BY i."quoteRequestId", p."supplierId"
ON CONFLICT ("quoteRequestId", "supplierId") DO NOTHING;
