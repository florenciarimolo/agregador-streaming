import { getProfile } from '@/composables/database/profiles';
import {
  getUserSeenTitles,
  getUserLikedTitles,
} from '@/composables/database/userTitleStatus';
import { getTitlesByTmdbIds, getTitleInLanguage, type MultiLanguageText } from '@/composables/database/titles';
import { getSession } from '@/composables/database/auth';
import { getUserPreferences } from '@/composables/database/preferences';
import { DEFAULT_LANGUAGE } from '@/constants/languages';

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

    // Fetch seen titles
    const { data: seenStatuses } = await getUserSeenTitles(userId);
    const { data: likedStatuses } = await getUserLikedTitles(userId);

    if (!seenStatuses || seenStatuses.length === 0) {
      return {
        success: true,
        insights: {
          totalWatchTime: 0,
          topGenres: [],
          moviesVsSeries: { movies: 0, series: 0 },
          averageRating: null,
          totalTitles: 0,
        },
      };
    }

    // Get user preferences for language
    const { data: userPreferences } = await getUserPreferences(userId);
    const userLanguage = userPreferences?.preferred_language || DEFAULT_LANGUAGE;

    // Get title data
    const tmdbIds = seenStatuses.map((s) => s.tmdb_id);
    const { data: titlesData } = await getTitlesByTmdbIds(tmdbIds);

    // Extract language-specific text from JSONB
    const titlesWithLanguage = titlesData?.map((title) => ({
      ...title,
      title: getTitleInLanguage(title.title as MultiLanguageText, userLanguage),
      overview: getTitleInLanguage(title.overview as MultiLanguageText, userLanguage),
    })) || [];

    if (!titlesWithLanguage || titlesWithLanguage.length === 0) {
      return {
        success: true,
        insights: {
          totalWatchTime: 0,
          topGenres: [],
          moviesVsSeries: { movies: 0, series: 0 },
          averageRating: null,
          totalTitles: 0,
        },
      };
    }

    // Calculate statistics
    const genreFrequency = new Map<number, number>();
    let totalWatchTime = 0; // In minutes (estimate)
    let moviesCount = 0;
    let seriesCount = 0;
    let totalRating = 0;
    let ratedCount = 0;

    titlesWithLanguage.forEach((title) => {
      // Count genres
      if (title.genres && Array.isArray(title.genres)) {
        title.genres.forEach((genre: { id: number }) => {
          genreFrequency.set(
            genre.id,
            (genreFrequency.get(genre.id) || 0) + 1
          );
        });
      }

      // Count movies vs series
      if (title.type === 'movie') {
        moviesCount++;
        // Estimate 2 hours per movie
        totalWatchTime += 120;
      } else {
        seriesCount++;
        // Estimate 10 episodes × 45 minutes per series (rough estimate)
        totalWatchTime += 450;
      }

      // Calculate average rating
      if (title.vote_average) {
        totalRating += Number(title.vote_average);
        ratedCount++;
      }
    });

    // Get top genres
    const topGenres = Array.from(genreFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ id, count }));

    const averageRating = ratedCount > 0 ? totalRating / ratedCount : null;

    return {
      success: true,
      insights: {
        totalWatchTime, // In minutes
        topGenres,
        moviesVsSeries: {
          movies: moviesCount,
          series: seriesCount,
        },
        averageRating,
        totalTitles: titlesWithLanguage.length,
        likedCount: likedStatuses?.data?.length || 0,
      },
    };
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

