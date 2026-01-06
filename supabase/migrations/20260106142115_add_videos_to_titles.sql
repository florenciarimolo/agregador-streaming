-- Add videos columns to titles table
-- Videos are stored as multi-language JSONB: {[lang: string]: Array<{key, site, type, published_at, official}>}

-- Add videos column
ALTER TABLE public.titles
ADD COLUMN IF NOT EXISTS videos JSONB;

-- Add videos_updated_at column
ALTER TABLE public.titles
ADD COLUMN IF NOT EXISTS videos_updated_at TIMESTAMP WITH TIME ZONE;

