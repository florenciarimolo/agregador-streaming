-- Change season name from TEXT to JSONB (multi-language support)
-- Migrate existing TEXT values to JSONB format

-- Step 1: Add a temporary column for JSONB
ALTER TABLE public.seasons ADD COLUMN IF NOT EXISTS name_jsonb JSONB;

-- Step 2: Migrate existing TEXT values to JSONB
-- Convert existing name values to JSONB with 'es-ES' as default language
UPDATE public.seasons
SET name_jsonb = jsonb_build_object('es-ES', name)
WHERE name IS NOT NULL AND name != '';

-- Step 3: Drop the old TEXT column
ALTER TABLE public.seasons DROP COLUMN IF EXISTS name;

-- Step 4: Rename the new column to name
ALTER TABLE public.seasons RENAME COLUMN name_jsonb TO name;

-- Step 5: Add comment
COMMENT ON COLUMN public.seasons.name IS 'Multi-language in ISO format: {"es-ES": "...", "ca-ES": "...", "eu-ES": "...", "gl-ES": "...", "en-US": "..."}';

