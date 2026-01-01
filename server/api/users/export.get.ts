import { getProfile } from '@/composables/database/profiles';
import { getUserPreferences } from '@/composables/database/preferences';
import {
  getUserLikedTitles,
  getUserSeenTitles,
  getUserNotInterestedTitles,
  getUserWatchlistTitles,
} from '@/composables/database/userTitleStatus';
import { getUserActivity } from '@/composables/database/activity';
import { getSession } from '@/composables/database/auth';
import { getTitlesByTmdbIds } from '@/composables/database/titles';

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
    const [profile, preferences, likedStatuses, seenStatuses, notInterestedStatuses, watchlistStatuses, activity] = await Promise.all([
      getProfile(userId),
      getUserPreferences(userId),
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
    const titleMap = new Map(titlesData?.map((t) => [t.tmdb_id, t]) || []);

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

