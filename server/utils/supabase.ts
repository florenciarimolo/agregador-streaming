/**
 * Supabase client utilities for server-side operations
 * Centralized to avoid code duplication across API endpoints
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client for server-side operations
 * Uses service role key if available, otherwise falls back to anon key
 * @param config Runtime config (from useRuntimeConfig())
 * @returns Supabase client configured for server-side use
 */
export function createServerSupabaseClient(
  config: ReturnType<typeof useRuntimeConfig>
): SupabaseClient {
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || config.public.supabaseAnonKey;

  return createClient(config.public.supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

