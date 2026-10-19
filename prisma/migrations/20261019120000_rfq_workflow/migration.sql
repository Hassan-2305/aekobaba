-- CreateEnum
CREATE TYPE "RequestStage" AS ENUM ('NEW', 'IN_PROGRESS', 'QUOTES_SHARED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OutreachStatus" AS ENUM ('NOT_CONTACTED', 'EMAIL_PREPARED', 'CONTACTED', 'REPLIED', 'FOLLOW_UP_NEEDED');

-- CreateEnum
CREATE TYPE "CommercialStatus" AS ENUM ('AWAITING_QUOTE', 'QUOTE_RECEIVED', 'REVIEWING', 'SHARED_WITH_CUSTOMER', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SampleStatus" AS ENUM ('NOT_REQUESTED', 'REQUESTED', 'APPROVED', 'DISPATCHED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CustomerFeedback" AS ENUM ('AWAITING_FEEDBACK', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OutreachDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "OutreachChannel" AS ENUM ('EMAIL', 'PHONE', 'OTHER');

-- CreateEnum
CREATE TYPE "ApplicationType" AS ENUM ('LISTING', 'PRODUCT_FETCH', 'PARTNERSHIP');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'REVIEWING', 'CONTACTED', 'AUTHORIZED', 'EXTRACTING', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('BOOKING_PENDING', 'BOOKED', 'HELD', 'NO_SHOW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "name" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "businessEmail" TEXT,
ADD COLUMN     "businessEmailVerifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "QuoteRequest" ADD COLUMN     "assignedToId" TEXT,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "nextAction" TEXT,
ADD COLUMN     "nextActionDue" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "reference" TEXT,
ADD COLUMN     "stage" "RequestStage" NOT NULL DEFAULT 'NEW';

-- AlterTable
ALTER TABLE "QuoteRequestItem" ADD COLUMN     "customerFeedback" "CustomerFeedback",
ADD COLUMN     "customerFeedbackNote" TEXT,
ADD COLUMN     "sampleCarrier" TEXT,
ADD COLUMN     "sampleDeliveredAt" TIMESTAMP(3),
ADD COLUMN     "sampleDispatchedAt" TIMESTAMP(3),
ADD COLUMN     "sampleStatus" "SampleStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
ADD COLUMN     "sampleTracking" TEXT,
ADD COLUMN     "specNotes" TEXT,
ADD COLUMN     "supplierFeedbackNote" TEXT;

-- CreateTable
CREATE TABLE "QuoteRequestSupplier" (
    "id" TEXT NOT NULL,
    "quoteRequestId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "outreachStatus" "OutreachStatus" NOT NULL DEFAULT 'NOT_CONTACTED',
    "commercialStatus" "CommercialStatus" NOT NULL DEFAULT 'AWAITING_QUOTE',
    "lastContactAt" TIMESTAMP(3),
    "lastReplyAt" TIMESTAMP(3),
    "lastReplySummary" TEXT,
    "nextAction" TEXT,
    "nextActionDue" TIMESTAMP(3),
    "assignedToId" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteRequestSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierOutreach" (
    "id" TEXT NOT NULL,
    "quoteRequestSupplierId" TEXT NOT NULL,
    "direction" "OutreachDirection" NOT NULL,
    "channel" "OutreachChannel" NOT NULL DEFAULT 'EMAIL',
    "subject" TEXT,
    "summary" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierOutreach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierQuote" (
    "id" TEXT NOT NULL,
    "quoteRequestSupplierId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "leadTimeDays" INTEGER,
    "validUntil" TIMESTAMP(3),
    "terms" TEXT,
    "notes" TEXT,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierQuoteLine" (
    "id" TEXT NOT NULL,
    "supplierQuoteId" TEXT NOT NULL,
    "quoteRequestItemId" TEXT NOT NULL,
    "unitPrice" DECIMAL(12,4) NOT NULL,
    "quantity" INTEGER,
    "moq" INTEGER,
    "notes" TEXT,

    CONSTRAINT "SupplierQuoteLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteActivity" (
    "id" TEXT NOT NULL,
    "quoteRequestId" TEXT NOT NULL,
    "actorId" TEXT,
    "kind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Basket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Basket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BasketItem" (
    "id" TEXT NOT NULL,
    "basketId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BasketItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierApplication" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "type" "ApplicationType" NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "applicantUserId" TEXT,
    "companyName" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "location" TEXT,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "categories" TEXT[],
    "catalogUrls" TEXT[],
    "message" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerMeeting" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "status" "MeetingStatus" NOT NULL DEFAULT 'BOOKING_PENDING',
    "scheduledAt" TIMESTAMP(3),
    "outcome" TEXT,
    "followUp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationOutbox" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "textBody" TEXT NOT NULL,
    "htmlBody" TEXT,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuoteRequestSupplier_outreachStatus_idx" ON "QuoteRequestSupplier"("outreachStatus");

-- CreateIndex
CREATE INDEX "QuoteRequestSupplier_commercialStatus_idx" ON "QuoteRequestSupplier"("commercialStatus");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteRequestSupplier_quoteRequestId_supplierId_key" ON "QuoteRequestSupplier"("quoteRequestId", "supplierId");

-- CreateIndex
CREATE INDEX "SupplierOutreach_quoteRequestSupplierId_idx" ON "SupplierOutreach"("quoteRequestSupplierId");

-- CreateIndex
CREATE INDEX "SupplierQuote_quoteRequestSupplierId_idx" ON "SupplierQuote"("quoteRequestSupplierId");

-- CreateIndex
CREATE INDEX "SupplierQuoteLine_supplierQuoteId_idx" ON "SupplierQuoteLine"("supplierQuoteId");

-- CreateIndex
CREATE INDEX "SupplierQuoteLine_quoteRequestItemId_idx" ON "SupplierQuoteLine"("quoteRequestItemId");

-- CreateIndex
CREATE INDEX "QuoteActivity_quoteRequestId_idx" ON "QuoteActivity"("quoteRequestId");

-- CreateIndex
CREATE INDEX "QuoteActivity_createdAt_idx" ON "QuoteActivity"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Basket_userId_key" ON "Basket"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BasketItem_basketId_productId_key" ON "BasketItem"("basketId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierApplication_reference_key" ON "SupplierApplication"("reference");

-- CreateIndex
CREATE INDEX "SupplierApplication_type_status_idx" ON "SupplierApplication"("type", "status");

-- CreateIndex
CREATE INDEX "SupplierApplication_createdAt_idx" ON "SupplierApplication"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerMeeting_applicationId_key" ON "PartnerMeeting"("applicationId");

-- CreateIndex
CREATE INDEX "NotificationOutbox_status_createdAt_idx" ON "NotificationOutbox"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteRequest_reference_key" ON "QuoteRequest"("reference");

-- CreateIndex
CREATE INDEX "QuoteRequest_stage_idx" ON "QuoteRequest"("stage");

-- CreateIndex
CREATE INDEX "QuoteRequestItem_sampleStatus_idx" ON "QuoteRequestItem"("sampleStatus");

-- AddForeignKey
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRequestSupplier" ADD CONSTRAINT "QuoteRequestSupplier_quoteRequestId_fkey" FOREIGN KEY ("quoteRequestId") REFERENCES "QuoteRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRequestSupplier" ADD CONSTRAINT "QuoteRequestSupplier_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRequestSupplier" ADD CONSTRAINT "QuoteRequestSupplier_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierOutreach" ADD CONSTRAINT "SupplierOutreach_quoteRequestSupplierId_fkey" FOREIGN KEY ("quoteRequestSupplierId") REFERENCES "QuoteRequestSupplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierOutreach" ADD CONSTRAINT "SupplierOutreach_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierQuote" ADD CONSTRAINT "SupplierQuote_quoteRequestSupplierId_fkey" FOREIGN KEY ("quoteRequestSupplierId") REFERENCES "QuoteRequestSupplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierQuote" ADD CONSTRAINT "SupplierQuote_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierQuoteLine" ADD CONSTRAINT "SupplierQuoteLine_supplierQuoteId_fkey" FOREIGN KEY ("supplierQuoteId") REFERENCES "SupplierQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierQuoteLine" ADD CONSTRAINT "SupplierQuoteLine_quoteRequestItemId_fkey" FOREIGN KEY ("quoteRequestItemId") REFERENCES "QuoteRequestItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteActivity" ADD CONSTRAINT "QuoteActivity_quoteRequestId_fkey" FOREIGN KEY ("quoteRequestId") REFERENCES "QuoteRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteActivity" ADD CONSTRAINT "QuoteActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Basket" ADD CONSTRAINT "Basket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BasketItem" ADD CONSTRAINT "BasketItem_basketId_fkey" FOREIGN KEY ("basketId") REFERENCES "Basket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BasketItem" ADD CONSTRAINT "BasketItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierApplication" ADD CONSTRAINT "SupplierApplication_applicantUserId_fkey" FOREIGN KEY ("applicantUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerMeeting" ADD CONSTRAINT "PartnerMeeting_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "SupplierApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

