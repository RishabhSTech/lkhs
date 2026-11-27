-- CreateEnum
CREATE TYPE "ExtraIncomeKind" AS ENUM ('OTHER_FLAT_BOOKING', 'MATTRESS', 'OTHER');

-- CreateTable
CREATE TABLE "ReservationExtra" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "kind" "ExtraIncomeKind" NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationExtra_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReservationExtra_reservationId_idx" ON "ReservationExtra"("reservationId");

-- AddForeignKey
ALTER TABLE "ReservationExtra" ADD CONSTRAINT "ReservationExtra_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
