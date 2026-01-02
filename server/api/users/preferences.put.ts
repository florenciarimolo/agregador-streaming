import { serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js';
import type { UserPreferences } from '@/composables/database/preferences';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';
import {
  ExplorationModeEnum,
} from '@/types/enums/ExplorationModeEnum';
import {
  PrioritizeContentEnum,
} from '@/types/enums/PrioritizeContentEnum';
import {
  ExcludedTypesEnum,
} from '@/types/enums/ExcludedTypesEnum';
import {
  TABLES,
  USER_PREFERENCES_FIELDS,
} from '@/composables/database/constants';

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    let userId: string | null = null;

    // Try to get user from cookies first
    const userFromCookies = await serverSupabaseUser(event);

    if (userFromCookies) {
      userId =
        userFromCookies.id || (userFromCookies as { sub?: string }).sub || null;
    } else {
      // Try Authorization header
      const authHeader = event.node.req.headers.authorization;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);

        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(
              Buffer.from(
                parts[1].replace(/-/g, '+').replace(/_/g, '/'),
                'base64'
              ).toString()
            );

            userId = payload.sub;
          }
        } catch (err) {
          // Error decoding token
          if (import.meta.dev) {
            console.error('Error decoding token:', err);
          }
        }
      }
    }

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

    // Handle preferred_language (single string value in TMDB format)
    if (typeof body.preferred_language === 'string') {
      // Import language constants
      const { LanguageCode, toTMDBLanguageCode } = await import('@/constants/languages');
      
      // Convert to TMDB format (handles both legacy and TMDB codes)
      preferences.preferred_language = toTMDBLanguageCode(body.preferred_language);
    } else if (body.preferred_language === null || body.preferred_language === undefined) {
      // Default to Spanish if not provided
      const { LanguageCode } = await import('@/constants/languages');
      preferences.preferred_language = LanguageCode.SPANISH;
    }

    if (Array.isArray(body.content_types)) {
      const validTypes = [MediaTypeEnum.movie, MediaTypeEnum.tv];
      preferences.content_types = body.content_types.filter((t: unknown) =>
        validTypes.includes(t as string)
      ) as (typeof MediaTypeEnum.movie | typeof MediaTypeEnum.tv)[];
    }

    if (Array.isArray(body.included_providers)) {
      preferences.included_providers = body.included_providers.filter(
        (p: unknown) => Number.isInteger(p)
      );
    }

    if (body.region === null || body.region === undefined) {
      preferences.region = null;
    } else if (typeof body.region === 'string' && body.region.length === 2) {
      preferences.region = body.region.toUpperCase();
    }

    if (
      [
        ExplorationModeEnum.similar,
        ExplorationModeEnum.balanced,
        ExplorationModeEnum.surprise,
      ].includes(body.exploration_mode)
    ) {
      preferences.exploration_mode = body.exploration_mode;
    }

    if (
      [
        PrioritizeContentEnum.new,
        PrioritizeContentEnum.classics,
        PrioritizeContentEnum.topRated,
      ].includes(body.prioritize_content)
    ) {
      preferences.prioritize_content = body.prioritize_content;
    }

    if (Array.isArray(body.excluded_types)) {
      const validTypes = [
        ExcludedTypesEnum.reality,
        ExcludedTypesEnum.anime,
        ExcludedTypesEnum.documentary,
      ];
      preferences.excluded_types = body.excluded_types.filter((t: unknown) =>
        validTypes.includes(t as string)
      ) as (
        | typeof ExcludedTypesEnum.reality
        | typeof ExcludedTypesEnum.anime
        | typeof ExcludedTypesEnum.documentary
      )[];
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
      .eq(USER_PREFERENCES_FIELDS.USER_ID, userId)
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
    // If preferred_language is explicitly provided, use it; otherwise keep current or default to 'es'
    const mergedPreferences = current
      ? {
          ...current,
          ...preferences,
          // Explicitly set preferred_language if provided in body, otherwise keep current or default
          preferred_language:
            body.preferred_language !== undefined
              ? preferences.preferred_language
              : current.preferred_language || 'es',
        }
      : { user_id: userId, preferred_language: 'es', ...preferences };

    // Log for debugging
    if (import.meta.dev) {
      console.log('[Preferences PUT] Saving preferences:', {
        userId,
        preferred_language: mergedPreferences.preferred_language,
        allPreferences: mergedPreferences,
      });
    }

    const { data, error } = await supabase
      .from(TABLES.USER_PREFERENCES)
      .upsert(mergedPreferences, {
        onConflict: USER_PREFERENCES_FIELDS.USER_ID,
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
        preferred_language: data?.preferred_language,
      });
    }

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
