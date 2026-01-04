import { createClient } from '@supabase/supabase-js';
import { PROFILES_COLUMNS, USER_PREFERENCES_COLUMNS, TITLES_COLUMNS } from '@/constants/db/columns';
import { TABLES } from '@/constants/db/tables';
import { SCORE_WEIGHTS } from '@/constants/domain/scoring';
import { getTitleInLanguage } from '@/services/titles';
import type { MultiLanguageText } from '@/services/titles';
import { LanguageCode } from '@/constants/languages';

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
      .eq(TITLES_COLUMNS.TMDB_ID, tmdbId)
      .eq(TITLES_COLUMNS.TYPE, type)
      .maybeSingle();

    if (dbError || !titleFromDb) {
      // If not in database, return null (caller should use original title)
      return { title: null };
    }

    // Extract Spanish title from JSONB
    const titleJsonb = titleFromDb.title as MultiLanguageText;
    const spanishTitle = getTitleInLanguage(titleJsonb, LanguageCode.SPANISH);

    return { title: spanishTitle || null };
  } catch (error) {
    console.error('Error fetching Spanish title:', error);
    return { title: null };
  }
});

