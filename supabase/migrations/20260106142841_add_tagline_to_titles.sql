-- Add tagline column to titles table
-- Tagline is stored as JSONB multi-language in ISO format (same as title, overview, poster_path)
ALTER TABLE public.titles
ADD COLUMN IF NOT EXISTS tagline JSONB;

