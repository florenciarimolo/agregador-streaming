import { devLog } from '@/server/utils/logger';
import { getUserIdFromEvent } from '@/server/utils/user-preferences';

/**
 * @deprecated This endpoint is no longer needed as title_data has been removed from recommendation_pool.
 * Title data is now fetched from the titles table when recommendations are requested.
 * This endpoint remains for backward compatibility but does nothing.
 */
export default defineEventHandler(async (event) => {
  // Verify user is authenticated
  const userId = await getUserIdFromEvent(event);
  if (!userId) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  // No-op: title_data has been removed from recommendation_pool
  // Title data is now fetched from titles table when recommendations are requested
  devLog(
    '[UpdatePoolLanguage] Endpoint called but title_data no longer exists in pool. Data is fetched from titles table automatically.'
  );

  return {
    success: true,
    updated: 0,
    total: 0,
    errors: 0,
    message:
      'Title data is now fetched from titles table automatically when recommendations are requested.',
  };
});
