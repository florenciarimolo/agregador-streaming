import { serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js';
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

    const { data, error } = await supabase
      .from(TABLES.USER_PREFERENCES)
      .select('*')
      .eq(USER_PREFERENCES_FIELDS.USER_ID, userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" - return empty preferences
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch preferences',
      });
    }

    // Handle migration from preferred_languages (array) to preferred_language (string in TMDB format)
    if (data) {
      // Import language constants
      const { LanguageCode, toTMDBLanguageCode } = await import('@/constants/languages');
      
      // If preferred_language doesn't exist but preferred_languages (old field) does, migrate it
      if (!data.preferred_language && (data as any).preferred_languages) {
        const oldLanguages = (data as any).preferred_languages as string[];
        // Take the first language from the array, convert to TMDB format
        const firstLang = oldLanguages && oldLanguages.length > 0 ? oldLanguages[0] : null;
        data.preferred_language = toTMDBLanguageCode(firstLang);
        
        // Update the database to migrate the field
        await supabase
          .from(TABLES.USER_PREFERENCES)
          .update({ preferred_language: data.preferred_language })
          .eq(USER_PREFERENCES_FIELDS.USER_ID, userId);
      } else if (data.preferred_language) {
        // Convert legacy simple codes to TMDB format if needed
        const tmdbCode = toTMDBLanguageCode(data.preferred_language);
        if (tmdbCode !== data.preferred_language) {
          // Update the database if conversion was needed
          data.preferred_language = tmdbCode;
          await supabase
            .from(TABLES.USER_PREFERENCES)
            .update({ preferred_language: data.preferred_language })
            .eq(USER_PREFERENCES_FIELDS.USER_ID, userId);
        }
      } else if (!data.preferred_language) {
        // If neither exists, set default
        data.preferred_language = LanguageCode.SPANISH;
      }
    }

    return {
      success: true,
      preferences: data || null,
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

