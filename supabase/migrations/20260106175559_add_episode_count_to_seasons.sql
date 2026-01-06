-- Add episode_count column to seasons table
-- This field is calculated from the size of the episodes array from TMDB
-- It's nullable because we may not have this data initially

ALTER TABLE public.seasons
ADD COLUMN IF NOT EXISTS episode_count INTEGER;

