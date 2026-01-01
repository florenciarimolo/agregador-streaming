import { getUserPreferences } from '@/composables/database/preferences';
import { getSession } from '@/composables/database/auth';

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

    const { data, error } = await getUserPreferences(userId);

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" - return empty preferences
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch preferences',
      });
    }

    return {
      success: true,
      preferences: data || null,
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

