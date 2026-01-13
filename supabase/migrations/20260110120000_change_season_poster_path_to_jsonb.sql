-- Change season poster_path from TEXT to JSONB (multi-language support)
-- No existing values to migrate, so we can directly alter the column type

-- Step 1: Drop the old TEXT column
ALTER TABLE public.seasons DROP COLUMN IF EXISTS poster_path;

-- Step 2: Add the new JSONB column
ALTER TABLE public.seasons ADD COLUMN poster_path JSONB;

-- Step 3: Add comment
COMMENT ON COLUMN public.seasons.poster_path IS 'Multi-language in ISO format: {"es-ES": "...", "ca-ES": "...", "eu-ES": "...", "gl-ES": "...", "en-US": "..."}';

