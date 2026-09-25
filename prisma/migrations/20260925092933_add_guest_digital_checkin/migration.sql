-- CreateEnum
CREATE TYPE "GovtIdType" AS ENUM ('AADHAAR', 'PASSPORT', 'DRIVING_LICENCE', 'VOTER_ID', 'OTHER');

-- AlterTable
ALTER TABLE "ReservationGuest" ADD COLUMN     "checkedInAt" TIMESTAMP(3),
ADD COLUMN     "idDocumentUrl" TEXT,
ADD COLUMN     "idNumber" TEXT,
ADD COLUMN     "idType" "GovtIdType";
