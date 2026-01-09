-- Add tag column to discover_list_items table
-- Tag is a JSONB field for multi-language support
-- Keys use URL language code format: es, ca, eu, gl, en, en-gb

ALTER TABLE public.discover_list_items
ADD COLUMN IF NOT EXISTS tag JSONB;
