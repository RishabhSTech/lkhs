-- Review topics: the emoji chips above the review list. Empty means "infer
-- the topics from the review body", so existing rows need no back-fill.

-- AlterTable
ALTER TABLE "Review" ADD COLUMN "topics" TEXT[] DEFAULT ARRAY[]::TEXT[];
