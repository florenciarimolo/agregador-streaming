import { getUserActivity } from '@/composables/database/activity';
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

    const query = getQuery(event);
    const limit = query.limit ? parseInt(query.limit as string) : 50;
    const offset = query.offset ? parseInt(query.offset as string) : 0;

    const { data, error } = await getUserActivity(userId, limit, offset);

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch activity',
      });
    }

    return {
      success: true,
      activity: data || [],
      limit,
      offset,
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

