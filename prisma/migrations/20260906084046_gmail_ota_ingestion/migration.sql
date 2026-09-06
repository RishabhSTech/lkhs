-- CreateEnum
CREATE TYPE "EmailClassification" AS ENUM ('INQUIRY', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED', 'BOOKING_MODIFIED', 'OTHER');

-- CreateEnum
CREATE TYPE "ProcessedGmailStatus" AS ENUM ('PROCESSED', 'NEEDS_REVIEW', 'FAILED');

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "externalReservationId" TEXT,
ADD COLUMN     "rawData" JSONB;

-- CreateTable
CREATE TABLE "GmailIntegration" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "refreshTokenEncrypted" TEXT NOT NULL,
    "status" "ChannelConnectionStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "connectedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GmailIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedGmailMessage" (
    "id" TEXT NOT NULL,
    "gmailMessageId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "source" "BookingSource",
    "classification" "EmailClassification" NOT NULL,
    "confidence" DOUBLE PRECISION,
    "messageId" TEXT,
    "reservationId" TEXT,
    "status" "ProcessedGmailStatus" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedGmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedGmailMessage_gmailMessageId_key" ON "ProcessedGmailMessage"("gmailMessageId");

-- CreateIndex
CREATE INDEX "ProcessedGmailMessage_status_idx" ON "ProcessedGmailMessage"("status");

-- CreateIndex
CREATE INDEX "ProcessedGmailMessage_source_idx" ON "ProcessedGmailMessage"("source");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_source_externalReservationId_key" ON "Reservation"("source", "externalReservationId");

-- AddForeignKey
ALTER TABLE "ProcessedGmailMessage" ADD CONSTRAINT "ProcessedGmailMessage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessedGmailMessage" ADD CONSTRAINT "ProcessedGmailMessage_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

