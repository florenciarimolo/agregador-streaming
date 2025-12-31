-- UpNext Database Schema
-- Phase 1: Foundation

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
-- We'll use Supabase's built-in auth.users, but create a profiles table for additional data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL
);

-- Titles table (movies and TV shows)
CREATE TABLE IF NOT EXISTS public.titles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tmdb_id INTEGER UNIQUE NOT NULL, -- TMDB ID for reference
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('movie', 'tv')), -- 'movie' or 'tv'
  poster_path TEXT,
  backdrop_path TEXT,
  overview TEXT,
  release_date DATE, -- For movies
  first_air_date DATE, -- For TV shows
  genres JSONB, -- Array of genre objects from TMDB
  vote_average DECIMAL(3, 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_titles_tmdb_id ON public.titles(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_titles_type ON public.titles(type);

-- User title status table (tracks seen/not_interested/watchlist titles)
CREATE TABLE IF NOT EXISTS public.user_title_status (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  tmdb_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('movie', 'tv')), -- 'movie' or 'tv'
  status TEXT NOT NULL CHECK (status IN ('seen', 'not_interested', 'watchlist')),
  liked BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(user_id, tmdb_id) -- Prevent duplicate statuses for same user/title (one status per title)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_title_status_user_id ON public.user_title_status(user_id);
CREATE INDEX IF NOT EXISTS idx_user_title_status_tmdb_id ON public.user_title_status(tmdb_id);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_title_status ENABLE ROW LEVEL SECURITY;

-- Profiles policies
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, onboarding_completed)
  VALUES (NEW.id, NEW.email, FALSE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Titles policies
-- Everyone can read titles (public data)
CREATE POLICY "Titles are viewable by everyone"
  ON public.titles FOR SELECT
  USING (true);

-- Only authenticated users can insert titles (via API)
CREATE POLICY "Authenticated users can insert titles"
  ON public.titles FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- User title status policies
-- Users can view their own title statuses
CREATE POLICY "Users can view own title statuses"
  ON public.user_title_status FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own title statuses
CREATE POLICY "Users can insert own title statuses"
  ON public.user_title_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own title statuses
CREATE POLICY "Users can update own title statuses"
  ON public.user_title_status FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own title statuses
CREATE POLICY "Users can delete own title statuses"
  ON public.user_title_status FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_titles_updated_at
  BEFORE UPDATE ON public.titles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Recommendation pool table (Phase 2: Persistent recommendation system)
CREATE TABLE IF NOT EXISTS public.recommendation_pool (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('movie', 'tv')),
  source TEXT NOT NULL CHECK (source IN ('based_on_like', 'trending', 'discover', 'easy', 'mood')),
  score FLOAT DEFAULT 0 CHECK (score >= -100 AND score <= 100),
  explanation_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  last_shown_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, tmdb_id)
);

-- Indexes for recommendation_pool
CREATE INDEX IF NOT EXISTS idx_recommendation_pool_user_id ON public.recommendation_pool(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_pool_score ON public.recommendation_pool(user_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_pool_tmdb_id ON public.recommendation_pool(tmdb_id);

-- RLS Policies for recommendation_pool
ALTER TABLE public.recommendation_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recommendation pool"
  ON public.recommendation_pool FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recommendation pool"
  ON public.recommendation_pool FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recommendation pool"
  ON public.recommendation_pool FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recommendation pool"
  ON public.recommendation_pool FOR DELETE
  USING (auth.uid() = user_id);

