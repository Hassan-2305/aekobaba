-- Price ranges: a published high price for FROM listings, and Aekobaba estimate ranges.
-- ADD VALUE cannot share a transaction with statements that use the new value; nothing here does.
ALTER TYPE "PriceType" ADD VALUE IF NOT EXISTS 'ESTIMATE';

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "priceMax" DECIMAL(12,4);
