-- Add runtime column to titles table
-- Runtime represents the duration in minutes for movies only (NULL for TV shows)

-- Add runtime column to titles table if it doesn't exist
ALTER TABLE public.titles
ADD COLUMN IF NOT EXISTS runtime INTEGER;

-- Add comment to document the column
COMMENT ON COLUMN public.titles.runtime IS 'Runtime in minutes for movies only';
