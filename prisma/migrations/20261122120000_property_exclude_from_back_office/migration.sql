-- AlterTable
ALTER TABLE "Property" ADD COLUMN "excludeFromBackOffice" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Property_excludeFromBackOffice_idx" ON "Property"("excludeFromBackOffice");
