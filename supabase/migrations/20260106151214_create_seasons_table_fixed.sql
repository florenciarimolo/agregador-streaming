-- Create seasons table (fixed migration)
-- Seasons are first-class entities, following the same patterns as titles

CREATE TABLE IF NOT EXISTS public.seasons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tv_tmdb_id BIGINT NOT NULL,
  season_number INT NOT NULL,
  tmdb_season_id BIGINT NOT NULL,
  name TEXT,
  air_date DATE,
  poster_path TEXT,
  vote_average NUMERIC(3, 1),
  overview JSONB, -- Multi-language in ISO format: {"es-ES": "...", "ca-ES": "...", "eu-ES": "...", "gl-ES": "...", "en-US": "..."}
  videos JSONB, -- Multi-language videos: {[lang: string]: Array<{key, site, type, published_at, official}>}
  videos_updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(tv_tmdb_id, season_number),
  UNIQUE(tmdb_season_id)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_seasons_tv_tmdb_id ON public.seasons(tv_tmdb_id);
CREATE INDEX IF NOT EXISTS idx_seasons_tmdb_season_id ON public.seasons(tmdb_season_id);

-- Enable RLS
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public read access (similar to titles)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'seasons' 
    AND policyname = 'Seasons are publicly readable'
  ) THEN
    CREATE POLICY "Seasons are publicly readable"
      ON public.seasons FOR SELECT
      USING (true);
  END IF;
END $$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_seasons_updated_at ON public.seasons;
CREATE TRIGGER update_seasons_updated_at
  BEFORE UPDATE ON public.seasons
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add status column to titles table if it doesn't exist
ALTER TABLE public.titles
ADD COLUMN IF NOT EXISTS status TEXT;

-- Update titles.status CHECK constraint to include TV show specific statuses
-- Drop the existing constraint (we need to find it first)
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint name
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.titles'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%IN%';

    -- Drop the constraint if it exists
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.titles DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END IF;
END $$;

-- Add the new constraint with all status values (including TV show specific ones)
ALTER TABLE public.titles
ADD CONSTRAINT titles_status_check 
CHECK (status IN (
    'Rumored', 
    'Planned', 
    'Pilot', 
    'In Production', 
    'Post Production', 
    'Released', 
    'Canceled', 
    'Returning Series', 
    'Ended'
));

