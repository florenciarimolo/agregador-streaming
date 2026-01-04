import { getProfile } from '@/services/profiles';
import {
  getUserLikedTitles,
  getUserSeenTitles,
  getUserNotInterestedTitles,
  getUserWatchlistTitles,
} from '@/services/userTitleStatus';
import { getUserActivity } from '@/services/activity';
import { getSession } from '@/services/auth';
import { getTitlesByTmdbIds, getTitleInLanguage, type MultiLanguageText } from '@/services/titles';
import { getUserTMDBParams } from '@/server/utils/user-preferences';

export default defineEventHandler(async (event) => {
  try {
    const {
      data: { session },
    } = await getSession();

    if (!session?.access_token) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
      });
    }

    const userId =
      session.user.id || (session.user as { sub?: string }).sub;

    if (!userId) {
      throw createError({
        statusCode: 401,
        statusMessage: 'User ID not found',
      });
    }

    // Fetch all user data
    const [profile, likedStatuses, seenStatuses, notInterestedStatuses, watchlistStatuses, activity] = await Promise.all([
      getProfile(userId),
      getUserLikedTitles(userId),
      getUserSeenTitles(userId),
      getUserNotInterestedTitles(userId),
      getUserWatchlistTitles(userId),
      getUserActivity(userId, 1000, 0), // Get up to 1000 activities
    ]);

    // Get title data for all lists
    const allTmdbIds = new Set<number>();
    [likedStatuses.data, seenStatuses.data, notInterestedStatuses.data, watchlistStatuses.data].forEach((statuses) => {
      statuses?.forEach((s) => allTmdbIds.add(s.tmdb_id));
    });

    const { data: titlesData } = await getTitlesByTmdbIds(Array.from(allTmdbIds));
    
    // Get user's language from app settings
    const { language } = await getUserTMDBParams(event);
    const userLanguage = language;
    
    // Extract language-specific text from JSONB and create map
    const titleMap = new Map(
      titlesData?.map((t) => {
        const titleWithLanguage = {
          ...t,
          title: getTitleInLanguage(t.title as MultiLanguageText, userLanguage),
          overview: getTitleInLanguage(t.overview as MultiLanguageText, userLanguage),
        };
        return [t.tmdb_id, titleWithLanguage];
      }) || []
    );

    // Format export data
    const exportData = {
      profile: profile.data,
      preferences: preferences.data,
      lists: {
        liked: (likedStatuses.data || []).map((s) => ({
          ...s,
          title: titleMap.get(s.tmdb_id),
        })),
        seen: (seenStatuses.data || []).map((s) => ({
          ...s,
          title: titleMap.get(s.tmdb_id),
        })),
        notInterested: (notInterestedStatuses.data || []).map((s) => ({
          ...s,
          title: titleMap.get(s.tmdb_id),
        })),
        watchlist: (watchlistStatuses.data || []).map((s) => ({
          ...s,
          title: titleMap.get(s.tmdb_id),
        })),
      },
      activity: activity.data || [],
      exportedAt: new Date().toISOString(),
    };

    // Set headers for download
    setHeader(event, 'Content-Type', 'application/json');
    setHeader(event, 'Content-Disposition', `attachment; filename="upnext-export-${userId}-${Date.now()}.json"`);

    return exportData;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

