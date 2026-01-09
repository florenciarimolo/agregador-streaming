import { createClient } from '@supabase/supabase-js';
import { getProfile } from '@/services/profiles';
import {
  getUserLikedTitles,
  getUserSeenTitles,
  getUserNotInterestedTitles,
  getUserWatchlistTitles,
} from '@/services/userTitleStatus';
import { getUserActivity } from '@/services/activity';
import {
  getTitlesByTmdbIds,
  getTitleInLanguage,
  type MultiLanguageText,
} from '@/services/titles';
import { getUserTMDBParams } from '@/server/utils/user-tmdb';
import { getUserIdFromEvent } from '@/server/utils/user-auth';
import { TABLES } from '@/constants/db/tables';
import { USER_PREFERENCES_COLUMNS } from '@/constants/db/columns';

export default defineEventHandler(async (event) => {
  try {
    const userId = await getUserIdFromEvent(event);

    if (!userId) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
      });
    }

    const config = useRuntimeConfig();
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || config.public.supabaseAnonKey;

    const supabase = createClient(config.public.supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    // Fetch all user data
    const [
      profile,
      likedStatuses,
      seenStatuses,
      notInterestedStatuses,
      watchlistStatuses,
      activity,
      preferencesResult,
    ] = await Promise.all([
      getProfile(userId),
      getUserLikedTitles(userId),
      getUserSeenTitles(userId),
      getUserNotInterestedTitles(userId),
      getUserWatchlistTitles(userId),
      getUserActivity(userId, 1000, 0), // Get up to 1000 activities
      supabase
        .from(TABLES.USER_PREFERENCES)
        .select('*')
        .eq(USER_PREFERENCES_COLUMNS.USER_ID, userId)
        .maybeSingle(),
    ]);

    // Get title data for all lists
    const allTmdbIds = new Set<number>();
    [
      likedStatuses.data,
      seenStatuses.data,
      notInterestedStatuses.data,
      watchlistStatuses.data,
    ].forEach((statuses: Array<{ tmdb_id: number }> | null | undefined) => {
      statuses?.forEach((s: { tmdb_id: number }) => allTmdbIds.add(s.tmdb_id));
    });

    const { data: titlesData } = await getTitlesByTmdbIds(
      Array.from(allTmdbIds)
    );

    // Get user's language from app settings
    const { language } = await getUserTMDBParams(event);
    const userLanguage = language;

    // Extract language-specific text from JSONB and create map
    const titleMap = new Map(
      titlesData?.map((t: { tmdb_id: number; title: unknown; overview: unknown }) => {
        const titleWithLanguage = {
          ...t,
          title: getTitleInLanguage(t.title as MultiLanguageText, userLanguage),
          overview: getTitleInLanguage(
            t.overview as MultiLanguageText,
            userLanguage
          ),
        };
        return [t.tmdb_id, titleWithLanguage];
      }) || []
    );

    // Format export data
    const exportData = {
      profile: profile.data,
      preferences: preferencesResult.data,
      lists: {
        liked: (likedStatuses.data || []).map((s: { tmdb_id: number }) => ({
          ...s,
          title: titleMap.get(s.tmdb_id),
        })),
        seen: (seenStatuses.data || []).map((s: { tmdb_id: number }) => ({
          ...s,
          title: titleMap.get(s.tmdb_id),
        })),
        notInterested: (notInterestedStatuses.data || []).map((s: { tmdb_id: number }) => ({
          ...s,
          title: titleMap.get(s.tmdb_id),
        })),
        watchlist: (watchlistStatuses.data || []).map((s: { tmdb_id: number }) => ({
          ...s,
          title: titleMap.get(s.tmdb_id),
        })),
      },
      activity: activity.data || [],
      exportedAt: new Date().toISOString(),
    };

    // Set headers for download
    setHeader(event, 'Content-Type', 'application/json');
    setHeader(
      event,
      'Content-Disposition',
      `attachment; filename="upnext-export-${userId}-${Date.now()}.json"`
    );

    return exportData;
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
