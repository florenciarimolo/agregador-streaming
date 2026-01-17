-- Create user_episode_status table
-- Tracks episode-level and season-level seen status for TV series
-- Episode/season seen does NOT exclude titles from recommendations
-- Only fully seen series (all episodes in all seasons) are excluded

CREATE TABLE IF NOT EXISTS public.user_episode_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tmdb_series_id INTEGER NOT NULL, -- TV series tmdb_id
  season_number INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  seen BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(user_id, tmdb_series_id, season_number, episode_number) -- One status per user/episode
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_episode_status_user_id ON public.user_episode_status(user_id);
CREATE INDEX IF NOT EXISTS idx_user_episode_status_series_id ON public.user_episode_status(tmdb_series_id);
CREATE INDEX IF NOT EXISTS idx_user_episode_status_user_series ON public.user_episode_status(user_id, tmdb_series_id);

-- Enable RLS
ALTER TABLE public.user_episode_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own episode status records

-- Users can view their own episode status records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_episode_status' 
    AND policyname = 'Users can view own episode status records'
  ) THEN
    CREATE POLICY "Users can view own episode status records"
      ON public.user_episode_status FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Users can insert their own episode status records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_episode_status' 
    AND policyname = 'Users can insert own episode status records'
  ) THEN
    CREATE POLICY "Users can insert own episode status records"
      ON public.user_episode_status FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Users can update their own episode status records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_episode_status' 
    AND policyname = 'Users can update own episode status records'
  ) THEN
    CREATE POLICY "Users can update own episode status records"
      ON public.user_episode_status FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Users can delete their own episode status records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_episode_status' 
    AND policyname = 'Users can delete own episode status records'
  ) THEN
    CREATE POLICY "Users can delete own episode status records"
      ON public.user_episode_status FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;
