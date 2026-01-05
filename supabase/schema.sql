-- UpNext Database Schema
-- Phase 1: Foundation

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
-- We'll use Supabase's built-in auth.users, but create a profiles table for additional data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  onboarding_completed BOOLEAN DEFAULT FALSE NOT NULL
);

-- Titles table (movies and TV shows)
-- Note: title, overview, and poster_path are JSONB multi-language in ISO format (xx-XX): {"es-ES": "...", "ca-ES": "...", "eu-ES": "...", "gl-ES": "...", "en-US": "..."}
-- Legacy format (xx) is supported for backward compatibility during reads, but all new writes use ISO format
CREATE TABLE IF NOT EXISTS public.titles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tmdb_id INTEGER UNIQUE NOT NULL, -- TMDB ID for reference
  title JSONB NOT NULL, -- Multi-language in ISO format: {"es-ES": "...", "ca-ES": "...", "eu-ES": "...", "gl-ES": "...", "en-US": "..."}
  type TEXT NOT NULL CHECK (type IN ('movie', 'tv')), -- 'movie' or 'tv'
  poster_path JSONB, -- Multi-language in ISO format: {"es-ES": "...", "ca-ES": "...", "eu-ES": "...", "gl-ES": "...", "en-US": "..."}
  backdrop_path TEXT,
  overview JSONB, -- Multi-language in ISO format: {"es-ES": "...", "ca-ES": "...", "eu-ES": "...", "gl-ES": "...", "en-US": "..."}
  release_date DATE, -- For movies
  first_air_date DATE, -- For TV shows
  genres JSONB, -- Array of genre objects from TMDB: [{"id": 28, "name": "Action"}, ...]
  vote_average DECIMAL(3, 1),
  viewing_effort TEXT CHECK (viewing_effort IN ('short', 'medium', 'long')), -- For TV shows only: measures approximate effort to start and follow a series (NULL if insufficient data)
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
  type TEXT CHECK (type IN ('movie', 'tv')), -- 'movie' or 'tv'
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
  INSERT INTO public.profiles (id, email, display_name, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'display_name')::text, NULL),
    FALSE
  );
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
  score DOUBLE PRECISION,
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

-- Phase 1: Profile & Personalization - Storage bucket for avatars
-- Note: Storage buckets must be created via Supabase Dashboard or API
-- This is a reference for the bucket configuration:
-- Bucket name: 'avatars'
-- Public: true (for public read access)
-- File size limit: 5MB
-- Allowed MIME types: image/jpeg, image/png, image/webp

-- Storage policies (run these in Supabase SQL Editor after creating the bucket)
-- CREATE POLICY "Avatar images are publicly accessible"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'avatars');
--
-- CREATE POLICY "Users can upload their own avatar"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Users can update their own avatar"
--   ON storage.objects FOR UPDATE
--   USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- CREATE POLICY "Users can delete their own avatar"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Phase 2: User Preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  favorite_genres INTEGER[], -- TMDB genre IDs
  included_providers INTEGER[], -- TMDB provider IDs (if empty, all providers are included)
  region TEXT, -- ISO 3166-1 alpha-2 country code (e.g., 'ES', 'US', 'MX')
  exploration_mode TEXT CHECK (exploration_mode IN ('similar', 'balanced', 'surprise')) DEFAULT 'balanced',
  prioritize_content TEXT CHECK (prioritize_content IN ('new', 'classics', 'top_rated')) DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Indexes for user_preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- RLS Policies for user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at on user_preferences
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Phase 5: User Activity Tracking
CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL, -- 'login', 'logout', 'title_action', etc.
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON public.user_activity(created_at DESC);

-- RLS Policies for user_activity
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity"
  ON public.user_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity"
  ON public.user_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Phase 6: Discover Editorial Lists (SEO)
-- Discover lists table (public, SEO-oriented, manually curated)
CREATE TABLE IF NOT EXISTS public.discover_lists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL, -- Always in English, stable, never changes
  title JSONB NOT NULL, -- Multi-language in ISO format: {"es-ES": "...", "ca-ES": "...", "eu-ES": "...", "gl-ES": "...", "en-US": "..."}
  description JSONB, -- Multi-language in ISO format: {"es-ES": "...", "ca-ES": "...", "eu-ES": "...", "gl-ES": "...", "en-US": "..."}
  type TEXT NOT NULL CHECK (type IN ('movie', 'tv', 'mixed')), -- Hint editorial/UI only, NOT used for logic. Source of truth is discover_list_items.type
  is_public BOOLEAN DEFAULT true NOT NULL,
  is_indexable BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Discover list items table
CREATE TABLE IF NOT EXISTS public.discover_list_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  discover_list_id UUID NOT NULL REFERENCES public.discover_lists(id) ON DELETE CASCADE,
  tmdb_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('movie', 'tv')), -- Source of truth for content type
  position INTEGER NOT NULL, -- Editorial order, stable (changing order does NOT change URLs, does NOT affect SEO, does NOT invalidate list)
  UNIQUE(discover_list_id, tmdb_id)
);

-- Indexes for discover_lists
CREATE INDEX IF NOT EXISTS idx_discover_lists_slug ON public.discover_lists(slug);
CREATE INDEX IF NOT EXISTS idx_discover_lists_is_public ON public.discover_lists(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_discover_lists_is_indexable ON public.discover_lists(is_indexable) WHERE is_indexable = true;

-- Indexes for discover_list_items
CREATE INDEX IF NOT EXISTS idx_discover_list_items_list_id ON public.discover_list_items(discover_list_id);
CREATE INDEX IF NOT EXISTS idx_discover_list_items_tmdb_id ON public.discover_list_items(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_discover_list_items_list_position ON public.discover_list_items(discover_list_id, position); -- Optimizes editorial ordering

-- RLS Policies for discover_lists
ALTER TABLE public.discover_lists ENABLE ROW LEVEL SECURITY;

-- Everyone can read public discover lists
CREATE POLICY "Discover lists are viewable by everyone if public"
  ON public.discover_lists FOR SELECT
  USING (is_public = true);

-- RLS Policies for discover_list_items
ALTER TABLE public.discover_list_items ENABLE ROW LEVEL SECURITY;

-- Everyone can read discover list items for public lists
CREATE POLICY "Discover list items are viewable by everyone for public lists"
  ON public.discover_list_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.discover_lists
      WHERE discover_lists.id = discover_list_items.discover_list_id
      AND discover_lists.is_public = true
    )
  );

-- Trigger for updated_at on discover_lists
CREATE TRIGGER update_discover_lists_updated_at
  BEFORE UPDATE ON public.discover_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();