-- CreateEnum
CREATE TYPE "ExpensePayer" AS ENUM ('AASHISH', 'RISHABH', 'PIYA');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "paidBy" "ExpensePayer",
ADD COLUMN "reimbursedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Transaction_paidBy_reimbursedAt_idx" ON "Transaction"("paidBy", "reimbursedAt");
