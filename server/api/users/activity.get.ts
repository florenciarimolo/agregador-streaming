import { getUserActivity } from '@/services/activity';
import { getUserIdFromEvent } from '@/server/utils/user-auth';

export default defineEventHandler(async (event) => {
  try {
    const userId = await getUserIdFromEvent(event);

    if (!userId) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
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

