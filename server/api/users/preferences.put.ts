import { updateUserPreferences } from '@/composables/database/preferences';
import { getSession } from '@/composables/database/auth';
import type { UserPreferences } from '@/composables/database/preferences';

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

    if (Array.isArray(body.preferred_languages)) {
      preferences.preferred_languages = body.preferred_languages.filter(
        (l: unknown) => typeof l === 'string'
      );
    }

    if (Array.isArray(body.content_types)) {
      const validTypes = ['movie', 'tv'];
      preferences.content_types = body.content_types.filter((t: unknown) =>
        validTypes.includes(t as string)
      ) as ('movie' | 'tv')[];
    }

    if (Array.isArray(body.included_providers)) {
      preferences.included_providers = body.included_providers.filter((p: unknown) =>
        Number.isInteger(p)
      );
    }

    if (Array.isArray(body.excluded_providers)) {
      preferences.excluded_providers = body.excluded_providers.filter((p: unknown) =>
        Number.isInteger(p)
      );
    }

    if (['similar', 'balanced', 'surprise'].includes(body.exploration_mode)) {
      preferences.exploration_mode = body.exploration_mode;
    }

    if (['new', 'classics', 'top_rated'].includes(body.prioritize_content)) {
      preferences.prioritize_content = body.prioritize_content;
    }

    if (Array.isArray(body.excluded_types)) {
      const validTypes = ['reality', 'anime', 'documentary'];
      preferences.excluded_types = body.excluded_types.filter((t: unknown) =>
        validTypes.includes(t as string)
      ) as ('reality' | 'anime' | 'documentary')[];
    }

    const { data, error } = await updateUserPreferences(userId, preferences);

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update preferences',
      });
    }

    return {
      success: true,
      preferences: data,
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

