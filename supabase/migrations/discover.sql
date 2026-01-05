-- Discover Feature Migration
-- Phase: Discover Editorial Lists (SEO)

-- Discover lists table
CREATE TABLE IF NOT EXISTS public.discover_lists (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL, -- Always in English, stable, never changes
  title JSONB NOT NULL, -- Multi-language in ISO format: {"es-ES": "...", "ca-ES": "...", "eu-ES": "...", "gl-ES": "...", "en-US": "..."}
  description JSONB, -- Multi-language in ISO format: {"es-ES": "...", "ca-ES": "...", "eu-ES": "...", "gl-ES": "...", "en-US": "..."}
  type TEXT NOT NULL CHECK (type IN ('movie', 'tv', 'mixed')), -- Hint editorial/UI only, NOT used for logic
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

-- Add viewing_effort column to titles table (for TV shows only)
ALTER TABLE public.titles ADD COLUMN IF NOT EXISTS viewing_effort TEXT CHECK (viewing_effort IN ('short', 'medium', 'long'));

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

-- Ensure RLS Policies for recommendation_pool are correctly defined
-- This is important for the discover list seed functionality
ALTER TABLE public.recommendation_pool ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own recommendation pool" ON public.recommendation_pool;
DROP POLICY IF EXISTS "Users can insert own recommendation pool" ON public.recommendation_pool;
DROP POLICY IF EXISTS "Users can update own recommendation pool" ON public.recommendation_pool;
DROP POLICY IF EXISTS "Users can delete own recommendation pool" ON public.recommendation_pool;

-- Create RLS Policies for recommendation_pool
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

