-- Migration: Convert poster_path from TEXT to JSONB
-- This migration converts existing TEXT poster_path values to JSONB format
-- Assumes all existing poster_path values are in Spanish, so converts to {"es": "original_value"}

-- Step 1: Add a temporary column to store the JSONB value
ALTER TABLE public.titles 
ADD COLUMN IF NOT EXISTS poster_path_jsonb JSONB;

-- Step 2: Convert existing TEXT values to JSONB format
-- For non-null values: convert to {"es": "original_value"}
-- For null values: keep as null
UPDATE public.titles
SET poster_path_jsonb = CASE
  WHEN poster_path IS NULL THEN NULL::JSONB
  WHEN poster_path = '' THEN NULL::JSONB
  ELSE jsonb_build_object('es', poster_path)
END
WHERE poster_path_jsonb IS NULL;

-- Step 3: Drop the old TEXT column
ALTER TABLE public.titles 
DROP COLUMN IF EXISTS poster_path;

-- Step 4: Rename the new JSONB column to poster_path
ALTER TABLE public.titles 
RENAME COLUMN poster_path_jsonb TO poster_path;

-- Step 5: Add a comment to document the change
COMMENT ON COLUMN public.titles.poster_path IS 'Multi-language JSONB: {"es": "...", "ca": "...", "eu": "...", "gl": "...", "en": "..."}';

