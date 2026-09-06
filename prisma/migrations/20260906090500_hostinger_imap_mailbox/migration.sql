-- CreateEnum
CREATE TYPE "ProcessedEmailStatus" AS ENUM ('PROCESSED', 'NEEDS_REVIEW', 'FAILED');

-- DropForeignKey
ALTER TABLE "ProcessedGmailMessage" DROP CONSTRAINT "ProcessedGmailMessage_messageId_fkey";

-- DropForeignKey
ALTER TABLE "ProcessedGmailMessage" DROP CONSTRAINT "ProcessedGmailMessage_reservationId_fkey";

-- DropTable
DROP TABLE "GmailIntegration";

-- DropTable
DROP TABLE "ProcessedGmailMessage";

-- DropEnum
DROP TYPE "ProcessedGmailStatus";

-- CreateTable
CREATE TABLE "MailboxIntegration" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "imapHost" TEXT NOT NULL,
    "imapPort" INTEGER NOT NULL,
    "imapSecure" BOOLEAN NOT NULL DEFAULT true,
    "passwordEncrypted" TEXT NOT NULL,
    "status" "ChannelConnectionStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "connectedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailboxIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedEmailMessage" (
    "id" TEXT NOT NULL,
    "emailMessageId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "source" "BookingSource",
    "classification" "EmailClassification" NOT NULL,
    "confidence" DOUBLE PRECISION,
    "messageId" TEXT,
    "reservationId" TEXT,
    "status" "ProcessedEmailStatus" NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedEmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedEmailMessage_emailMessageId_key" ON "ProcessedEmailMessage"("emailMessageId");

-- CreateIndex
CREATE INDEX "ProcessedEmailMessage_status_idx" ON "ProcessedEmailMessage"("status");

-- CreateIndex
CREATE INDEX "ProcessedEmailMessage_source_idx" ON "ProcessedEmailMessage"("source");

-- AddForeignKey
ALTER TABLE "ProcessedEmailMessage" ADD CONSTRAINT "ProcessedEmailMessage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessedEmailMessage" ADD CONSTRAINT "ProcessedEmailMessage_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

