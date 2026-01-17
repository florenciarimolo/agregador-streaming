-- Create user_title_following table
-- Following is an interest signal, separate from consumption states (seen/watchlist/not_interested)
-- Following does NOT exclude titles from recommendations

CREATE TABLE IF NOT EXISTS public.user_title_following (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tmdb_id INTEGER NOT NULL,
  type TEXT CHECK (type IN ('movie', 'tv')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(user_id, tmdb_id) -- One following record per user/title
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_title_following_user_id ON public.user_title_following(user_id);
CREATE INDEX IF NOT EXISTS idx_user_title_following_tmdb_id ON public.user_title_following(tmdb_id);

-- Enable RLS
ALTER TABLE public.user_title_following ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own following records

-- Users can view their own following records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_title_following' 
    AND policyname = 'Users can view own following records'
  ) THEN
    CREATE POLICY "Users can view own following records"
      ON public.user_title_following FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Users can insert their own following records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_title_following' 
    AND policyname = 'Users can insert own following records'
  ) THEN
    CREATE POLICY "Users can insert own following records"
      ON public.user_title_following FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Users can delete their own following records
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_title_following' 
    AND policyname = 'Users can delete own following records'
  ) THEN
    CREATE POLICY "Users can delete own following records"
      ON public.user_title_following FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;
