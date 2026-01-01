import { createClient } from '@supabase/supabase-js';
import { TABLES, TITLES_FIELDS } from '@/composables/database/constants';
import { getTitleInLanguage } from '@/composables/database/titles';
import type { MultiLanguageText } from '@/composables/database/titles';

/**
 * Get Spanish title for a given tmdb_id and type
 */
export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const query = getQuery(event);
    const { tmdb_id, type } = query;

    if (!tmdb_id || !type) {
      throw createError({
        statusCode: 400,
        statusMessage: 'tmdb_id and type are required',
      });
    }

    const tmdbId = parseInt(String(tmdb_id), 10);
    if (isNaN(tmdbId)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid tmdb_id',
      });
    }

    // Create Supabase client
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || config.public.supabaseAnonKey;
    const supabase = createClient(config.public.supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    // Get title from database
    const { data: titleFromDb, error: dbError } = await supabase
      .from(TABLES.TITLES)
      .select('title')
      .eq(TITLES_FIELDS.TMDB_ID, tmdbId)
      .eq(TITLES_FIELDS.TYPE, type)
      .maybeSingle();

    if (dbError || !titleFromDb) {
      // If not in database, return null (caller should use original title)
      return { title: null };
    }

    // Extract Spanish title from JSONB
    const titleJsonb = titleFromDb.title as MultiLanguageText;
    const spanishTitle = getTitleInLanguage(titleJsonb, 'es');

    return { title: spanishTitle || null };
  } catch (error) {
    console.error('Error fetching Spanish title:', error);
    return { title: null };
  }
});

