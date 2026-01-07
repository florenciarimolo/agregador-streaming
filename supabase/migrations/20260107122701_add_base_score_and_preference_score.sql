-- Add base_score and preference_score columns to recommendation_pool
-- These columns separate the scoring components for incremental updates

ALTER TABLE public.recommendation_pool
ADD COLUMN IF NOT EXISTS base_score DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS preference_score DOUBLE PRECISION DEFAULT 0;

-- Add comment explaining the scoring model
COMMENT ON COLUMN public.recommendation_pool.base_score IS 'Base score based on popularity/quality/source. Set during populate/refresh. Never changes after initial population.';
COMMENT ON COLUMN public.recommendation_pool.preference_score IS 'Preference score based on user likes/dislikes and similarity propagation. Updated incrementally via title-status endpoint.';
COMMENT ON COLUMN public.recommendation_pool.score IS 'Persisted score = base_score + preference_score. Used as base for runtime final_score calculation, NOT for direct ordering.';

