import { createClient } from '@supabase/supabase-js';
import type { UserPreferences } from '@/services/preferences';
import { EXPLORATION_MODE } from '@/constants/domain/explorationMode';
import { PRIORITIZE_CONTENT } from '@/constants/domain/prioritizeContent';
import { TABLES } from '@/constants/db/tables';
import { USER_PREFERENCES_COLUMNS } from '@/constants/db/columns';
import { getUserIdFromEvent } from '@/server/utils/user-auth';

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();

    // Use centralized function to get userId
    const userId = await getUserIdFromEvent(event);

    if (!userId) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
      });
    }

    const body = await readBody(event);

    if (!body || typeof body !== 'object') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request body',
      });
    }

    // Validate preferences structure
    const preferences: Partial<UserPreferences> = {};

    if (Array.isArray(body.favorite_genres)) {
      preferences.favorite_genres = body.favorite_genres.filter((g: unknown) =>
        Number.isInteger(g)
      );
    }

    if (Array.isArray(body.included_providers)) {
      preferences.included_providers = body.included_providers.filter(
        (p: unknown) => Number.isInteger(p)
      );
    }

    // Only update region if it's explicitly provided in the body with a valid value
    // NEVER save null - region is mandatory and can only be changed, not cleared
    if ('region' in body) {
      if (
        body.region === null ||
        body.region === undefined ||
        body.region === ''
      ) {
        // Ignore null/undefined/empty - don't update region field
        // This preserves existing region value
      } else if (typeof body.region === 'string' && body.region.length === 2) {
        // Only update if it's a valid 2-character region code
        preferences.region = body.region.toUpperCase();
      }
    }

    if (
      [
        EXPLORATION_MODE.SIMILAR,
        EXPLORATION_MODE.BALANCED,
        EXPLORATION_MODE.SURPRISE,
      ].includes(body.exploration_mode)
    ) {
      preferences.exploration_mode = body.exploration_mode;
    }

    if (
      [
        PRIORITIZE_CONTENT.NEW,
        PRIORITIZE_CONTENT.CLASSICS,
        PRIORITIZE_CONTENT.TOP_RATED,
      ].includes(body.prioritize_content)
    ) {
      preferences.prioritize_content = body.prioritize_content;
    }

    // Create Supabase client for server-side operations
    // Use service role key to bypass RLS (we've already validated userId)
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || config.public.supabaseAnonKey;

    const supabase = createClient(config.public.supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    // Get current preferences
    const { data: current, error: fetchError } = await supabase
      .from(TABLES.USER_PREFERENCES)
      .select('*')
      .eq(USER_PREFERENCES_COLUMNS.USER_ID, userId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 is "not found" - we'll create it
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch preferences',
      });
    }

    // Merge with existing or create new
    // Important: Explicitly set all fields to ensure they're updated
    const mergedPreferences = current
      ? {
          ...current,
          ...preferences,
        }
      : { user_id: userId, ...preferences };

    // Log for debugging
    if (import.meta.dev) {
      console.log('[Preferences PUT] Saving preferences:', {
        userId,
        allPreferences: mergedPreferences,
      });
    }

    const { data, error } = await supabase
      .from(TABLES.USER_PREFERENCES)
      .upsert(mergedPreferences, {
        onConflict: USER_PREFERENCES_COLUMNS.USER_ID,
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('[Preferences PUT] Error updating preferences:', error);
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update preferences',
      });
    }

    // Log for debugging
    if (import.meta.dev) {
      console.log('[Preferences PUT] Successfully saved:', {
        preferences: data,
      });
    }

    // Note: Cache invalidation is not needed when language changes because:
    // 1. The titles table stores multi-language JSONB (covers all languages)
    // 2. The recommendation pool is regenerated when language changes (handled in frontend)
    // 3. The extractTitleDataWithFallback function automatically fetches from TMDB if missing
    // The cache in titles table is language-agnostic and accumulates all languages over time

    return {
      success: true,
      preferences: data,
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
