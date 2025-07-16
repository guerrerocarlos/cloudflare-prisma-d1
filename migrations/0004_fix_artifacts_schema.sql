-- Migration to fix artifacts table schema mismatch
-- Replace 'data' column with 'content' and 'blocks' columns

-- Add the new columns
ALTER TABLE "artifacts" ADD COLUMN "content" TEXT NOT NULL DEFAULT '';
ALTER TABLE "artifacts" ADD COLUMN "blocks" JSONB;

-- Copy data from 'data' column to 'content' column (if any exists)
-- This assumes the 'data' column contained text content, adjust as needed
UPDATE "artifacts" SET "content" = COALESCE(json_extract("data", '$.content'), '') WHERE "data" IS NOT NULL;
UPDATE "artifacts" SET "blocks" = json_extract("data", '$.blocks') WHERE "data" IS NOT NULL AND json_extract("data", '$.blocks') IS NOT NULL;

-- Drop the old 'data' column
ALTER TABLE "artifacts" DROP COLUMN "data";
