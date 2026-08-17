-- Airbnb-style listing sections: highlights, a full amenity catalogue,
-- "Things to know", and reviews with category sub-scores and stay length.

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'PUBLISHED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "ReviewSource" AS ENUM ('DIRECT', 'AIRBNB', 'BOOKING_COM', 'AGODA', 'GOOGLE', 'OTHER');

-- CreateEnum
CREATE TYPE "TripType" AS ENUM ('SOLO', 'COUPLE', 'FAMILY', 'FRIENDS', 'BUSINESS', 'GROUP');

-- CreateEnum
CREATE TYPE "ThingToKnowGroup" AS ENUM ('HOUSE_RULES', 'SAFETY_PROPERTY', 'CANCELLATION');

-- AlterEnum
-- The old five-value AmenityCategory is replaced by the sections Airbnb groups
-- "What this place offers" into. Existing rows are remapped rather than
-- dropped; anything that does not map lands in SERVICES for an admin to
-- recategorise.
CREATE TYPE "AmenityCategory_new" AS ENUM ('SCENIC_VIEWS', 'BATHROOM', 'BEDROOM_LAUNDRY', 'ENTERTAINMENT', 'FAMILY', 'HEATING_COOLING', 'HOME_SAFETY', 'INTERNET_OFFICE', 'KITCHEN_DINING', 'LOCATION_FEATURES', 'OUTDOOR', 'PARKING_FACILITIES', 'SERVICES');
ALTER TABLE "Amenity" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "Amenity" ALTER COLUMN "category" TYPE "AmenityCategory_new" USING (
    CASE "category"::text
        WHEN 'SAFETY' THEN 'HOME_SAFETY'
        WHEN 'KITCHEN' THEN 'KITCHEN_DINING'
        WHEN 'OUTDOOR' THEN 'OUTDOOR'
        WHEN 'ENTERTAINMENT' THEN 'ENTERTAINMENT'
        ELSE 'SERVICES'
    END::"AmenityCategory_new"
);
ALTER TYPE "AmenityCategory" RENAME TO "AmenityCategory_old";
ALTER TYPE "AmenityCategory_new" RENAME TO "AmenityCategory";
DROP TYPE "AmenityCategory_old";
ALTER TABLE "Amenity" ALTER COLUMN "category" SET DEFAULT 'SERVICES';

-- AlterTable
ALTER TABLE "Amenity" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PropertyAmenity" ADD COLUMN "isUnavailable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "note" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN "isGuestFavourite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "checkInFrom" TEXT DEFAULT '2:00 pm',
ADD COLUMN "checkInTo" TEXT DEFAULT '9:00 pm',
ADD COLUMN "checkOutBy" TEXT DEFAULT '11:00 am';

-- AlterTable
ALTER TABLE "Review" ADD COLUMN "cleanliness" INTEGER,
ADD COLUMN "accuracy" INTEGER,
ADD COLUMN "checkIn" INTEGER,
ADD COLUMN "communication" INTEGER,
ADD COLUMN "location" INTEGER,
ADD COLUMN "value" INTEGER,
ADD COLUMN "nightsStayed" INTEGER,
ADD COLUMN "stayedOn" DATE,
ADD COLUMN "tripType" "TripType",
ADD COLUMN "respondedAt" TIMESTAMP(3),
ADD COLUMN "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN "source" "ReviewSource" NOT NULL DEFAULT 'DIRECT',
ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "authorName" TEXT,
ADD COLUMN "authorLocation" TEXT,
ADD COLUMN "authorAvatarUrl" TEXT,
ADD COLUMN "authorSince" INTEGER,
ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "Review" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "Review" ALTER COLUMN "updatedAt" SET NOT NULL;

-- A review imported from an OTA has no Guest row on our side.
ALTER TABLE "Review" ALTER COLUMN "guestId" DROP NOT NULL;
ALTER TABLE "Review" DROP CONSTRAINT "Review_guestId_fkey";
ALTER TABLE "Review" ADD CONSTRAINT "Review_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "PropertyHighlight" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "subtitle" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PropertyHighlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyThingToKnow" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "group" "ThingToKnowGroup" NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PropertyThingToKnow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Amenity_category_idx" ON "Amenity"("category");

-- CreateIndex
CREATE INDEX "PropertyHighlight_propertyId_idx" ON "PropertyHighlight"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyHighlight_propertyId_code_key" ON "PropertyHighlight"("propertyId", "code");

-- CreateIndex
CREATE INDEX "PropertyThingToKnow_propertyId_group_idx" ON "PropertyThingToKnow"("propertyId", "group");

-- CreateIndex
DROP INDEX "Review_propertyId_idx";
CREATE INDEX "Review_propertyId_status_idx" ON "Review"("propertyId", "status");

-- CreateIndex
CREATE INDEX "Review_status_idx" ON "Review"("status");

-- AddForeignKey
ALTER TABLE "PropertyHighlight" ADD CONSTRAINT "PropertyHighlight_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyThingToKnow" ADD CONSTRAINT "PropertyThingToKnow_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
