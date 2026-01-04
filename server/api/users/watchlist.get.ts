import { serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js';
import { getUserTMDBParams } from '../../utils/user-preferences';
import { devLog, devError, devWarn, safeError } from '../../utils/logger';
import { TitleStatus } from '@/types/TitleStatus';
import {
  TABLES,
  USER_TITLE_STATUS_FIELDS,
  TITLES_FIELDS,
} from '@/services/constants';
import {
  getTitleInLanguage,
  type MultiLanguageText,
} from '@/services/titles';
import { getTMDBConfig } from '../../utils/config';
import { MediaTypeEnum } from '@/types/enums/MediaTypeEnum';

/**
 * Get user watchlist (watchlist status)
 * Returns titles with full TMDB details
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  let user = null;
  let userId: string | null = null;

  // Try to get user from cookies first
  const userFromCookies = await serverSupabaseUser(event);

  if (userFromCookies) {
    userId =
      userFromCookies.id || (userFromCookies as { sub?: string }).sub || null;

    if (userId) {
      user = { id: userId, sub: userId };
      devLog('[User Watchlist] User from cookies');
    }
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

          if (userId) {
            user = { id: userId, sub: userId };
            devLog('[User Watchlist] User from Authorization header');
          }
        }
      } catch (err) {
        safeError('[User Watchlist] Error decoding token', err);
      }
    } else {
      devWarn(
        '[User Watchlist] No user from cookies and no Authorization header'
      );
    }
  }

  if (!user || !userId) {
    devError('[User Watchlist] Unauthorized - no user found');
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  // Create Supabase client - Use SERVICE_ROLE_KEY in production to bypass RLS
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || config.public.supabaseAnonKey;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    devWarn(
      '[User Watchlist] WARNING: Using anon key instead of service role key. RLS policies may block queries.'
    );
  }

  const supabase = createClient(config.public.supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  try {
    // Fetch user title statuses with watchlist status (include type)
    const { data: statuses, error: statusError } = await supabase
      .from(TABLES.USER_TITLE_STATUS)
      .select(
        `${USER_TITLE_STATUS_FIELDS.TMDB_ID}, ${USER_TITLE_STATUS_FIELDS.TYPE}, ${USER_TITLE_STATUS_FIELDS.CREATED_AT}`
      )
      .eq(USER_TITLE_STATUS_FIELDS.USER_ID, userId)
      .eq(USER_TITLE_STATUS_FIELDS.STATUS, TitleStatus.WATCHLIST)
      .order(USER_TITLE_STATUS_FIELDS.CREATED_AT, { ascending: false });

    if (statusError) {
      safeError(
        '[User Watchlist] Error fetching user title statuses',
        statusError,
        {
          userId,
          supabaseUrl: config.public.supabaseUrl,
        }
      );
      throw createError({
        statusCode: 500,
        message: 'Error al obtener la lista para ver',
      });
    }

    devLog('[User Watchlist] Statuses count:', statuses?.length || 0);

    if (!statuses || statuses.length === 0) {
      devLog('[User Watchlist] No watchlist statuses found for user');
      return {
        watchlist: [],
      };
    }

    // Get user preferences for language and region
    const { language, region } = await getUserTMDBParams(event);

    // Extract tmdb_ids and create a map of tmdb_id to type and created_at
    const tmdbIds: number[] = statuses.map((s) => s.tmdb_id);
    const titleTypesMap = new Map<number, 'movie' | 'tv'>(
      statuses.map((s) => [s.tmdb_id, s.type as 'movie' | 'tv'])
    );
    const createdAtMap = new Map<number, string>(
      statuses.map((s) => [s.tmdb_id, s.created_at])
    );

    // Fetch titles from database
    const { data: titlesData, error: titlesError } = await supabase
      .from(TABLES.TITLES)
      .select(
        `${TITLES_FIELDS.ID}, ${TITLES_FIELDS.TITLE}, ${TITLES_FIELDS.TYPE}, ${TITLES_FIELDS.POSTER_PATH}, ${TITLES_FIELDS.TMDB_ID}, ${TITLES_FIELDS.OVERVIEW}, ${TITLES_FIELDS.GENRES}`
      )
      .in(TITLES_FIELDS.TMDB_ID, tmdbIds);

    if (titlesError) {
      safeError(
        '[User Watchlist] Error fetching titles from database',
        titlesError,
        {
          userId,
          tmdbIds,
        }
      );
      throw createError({
        statusCode: 500,
        message: 'Error al obtener los títulos',
      });
    }

    if (!titlesData || titlesData.length === 0) {
      devLog('[User Watchlist] No titles found in database');
      return {
        watchlist: [],
      };
    }

    // Fetch missing titles from TMDB if needed
    const foundTmdbIds = new Set<number>(titlesData.map((t) => t.tmdb_id));
    const missingTmdbIds: number[] = tmdbIds.filter(
      (id: number) => !foundTmdbIds.has(id)
    );

    if (missingTmdbIds.length > 0) {
      devLog(
        '[User Watchlist] Missing titles, fetching from TMDB:',
        missingTmdbIds
      );

      const tmdbConfig = getTMDBConfig(language, region);
      const fetchPromises = missingTmdbIds.map(async (tmdbId: number) => {
        const type = titleTypesMap.get(tmdbId);
        if (!type) return null;

        try {
          const endpoint =
            type === 'movie' ? MediaTypeEnum.movie : MediaTypeEnum.tv;
          await $fetch(`${tmdbConfig.baseUrl}/${endpoint}/${tmdbId}`, {
            query: {
              api_key: tmdbConfig.apiKey,
              language: tmdbConfig.language,
              region: tmdbConfig.region,
            },
          });
          // The TMDB endpoint will insert into database
          return tmdbId;
        } catch (err) {
          safeError(
            `[User Watchlist] Error fetching title ${tmdbId} from TMDB`,
            err
          );
          return null;
        }
      });

      await Promise.all(fetchPromises);

      // Reload titles from database
      const { data: reloadedData } = await supabase
        .from(TABLES.TITLES)
        .select(
          `${TITLES_FIELDS.ID}, ${TITLES_FIELDS.TITLE}, ${TITLES_FIELDS.TYPE}, ${TITLES_FIELDS.POSTER_PATH}, ${TITLES_FIELDS.TMDB_ID}, ${TITLES_FIELDS.OVERVIEW}, ${TITLES_FIELDS.GENRES}`
        )
        .in(TITLES_FIELDS.TMDB_ID, tmdbIds);

      if (reloadedData) {
        titlesData.length = 0;
        titlesData.push(...reloadedData);
      }
    }

    // Extract titles with alphabet detection
    const watchlist = titlesData.map(
      (title: {
        tmdb_id: number;
        title: unknown;
        type: string;
        poster_path: unknown;
      }) => {
        const titleJsonb = title.title as MultiLanguageText;
        const posterPathJsonb = title.poster_path as MultiLanguageText | null;

        // Use getTitleInLanguage which includes alphabet detection
        const extractedTitle = getTitleInLanguage(
          titleJsonb,
          language,
          region,
          false
        );
        const extractedPosterPath = getTitleInLanguage(
          posterPathJsonb,
          language,
          region,
          true // isImagePath = true
        );

        return {
          tmdb_id: title.tmdb_id,
          title: extractedTitle || '',
          type: title.type,
          poster_path: extractedPosterPath || null,
          created_at:
            createdAtMap.get(title.tmdb_id) || new Date().toISOString(),
        };
      }
    );

    return {
      watchlist,
    };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Error al obtener la lista para ver';
    throw createError({
      statusCode: 500,
      message: errorMessage,
    });
  }
});
