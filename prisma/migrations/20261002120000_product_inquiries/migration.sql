-- CreateEnum
CREATE TYPE "InquiryKind" AS ENUM ('QUOTE', 'SAMPLE');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "DesignStatus" AS ENUM ('READY', 'IN_PROGRESS', 'NEED_HELP', 'NONE');

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "kind" "InquiryKind" NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "quantity" TEXT NOT NULL,
    "packagingType" TEXT,
    "format" TEXT,
    "designStatus" "DesignStatus" NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InquiryFile" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InquiryFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Inquiry_status_idx" ON "Inquiry"("status");

-- CreateIndex
CREATE INDEX "Inquiry_productId_idx" ON "Inquiry"("productId");

-- CreateIndex
CREATE INDEX "Inquiry_createdAt_idx" ON "Inquiry"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InquiryFile_inquiryId_key" ON "InquiryFile"("inquiryId");

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InquiryFile" ADD CONSTRAINT "InquiryFile_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Inquiries hold personal contact details. Enable RLS with no policies so
-- Supabase's public Data API (anon / authenticated roles) cannot read or
-- write them; Prisma connects as the table owner and is unaffected.
ALTER TABLE "Inquiry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InquiryFile" ENABLE ROW LEVEL SECURITY;
