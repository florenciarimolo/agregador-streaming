-- Add status column to titles table
-- Status represents the production/release status from TMDB for both movies and TV shows

-- Add status column to titles table if it doesn't exist
ALTER TABLE public.titles
ADD COLUMN IF NOT EXISTS status TEXT;

-- Update titles.status CHECK constraint to include all possible status values
-- Drop the existing constraint if it exists (we need to find it first)
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

