-- Migration: Convert poster_path from TEXT to JSONB (Simple Version)
-- This migration converts existing TEXT poster_path values to JSONB format
-- Assumes all existing poster_path values are in Spanish, so converts to {"es": "original_value"}
-- 
-- Execute this in Supabase SQL Editor
-- This is a safer approach that converts in-place

ALTER TABLE public.titles 
ALTER COLUMN poster_path TYPE JSONB 
USING CASE 
  WHEN poster_path IS NULL THEN NULL::JSONB
  WHEN poster_path = '' THEN NULL::JSONB
  ELSE jsonb_build_object('es', poster_path)
END;

-- Add a comment to document the change
COMMENT ON COLUMN public.titles.poster_path IS 'Multi-language JSONB: {"es": "...", "ca": "...", "eu": "...", "gl": "...", "en": "..."}';

