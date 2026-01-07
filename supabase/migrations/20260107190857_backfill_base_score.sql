-- Backfill base_score for historical entries in recommendation_pool
-- Updates all entries where base_score = 0 by calculating from titles.vote_average
-- Recalculates score = base_score + preference_score

UPDATE public.recommendation_pool rp
SET 
  base_score = CASE 
    WHEN t.vote_average IS NOT NULL THEN (t.vote_average::numeric / 10) * 50
    ELSE 25
  END,
  score = CASE 
    WHEN t.vote_average IS NOT NULL THEN (t.vote_average::numeric / 10) * 50 + COALESCE(rp.preference_score, 0)
    ELSE 25 + COALESCE(rp.preference_score, 0)
  END
FROM public.titles t
WHERE rp.base_score = 0
  AND rp.tmdb_id = t.tmdb_id
  AND rp.type = t.type;

