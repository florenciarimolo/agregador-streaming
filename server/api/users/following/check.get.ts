/**
 * Check if user is following a title
 */

import { getUserIdFromEvent } from '@/server/utils/user-auth';
import { createServerSupabaseClient } from '@/server/utils/supabase';
import { isFollowing } from '@/services/userFollowing';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const userId = await getUserIdFromEvent(event);

  if (!userId) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  const query = getQuery(event);
  const tmdb_id = query.tmdb_id;

  if (!tmdb_id || typeof tmdb_id !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'tmdb_id is required',
    });
  }

  const tmdbId = parseInt(tmdb_id, 10);
  if (isNaN(tmdbId)) {
    throw createError({
      statusCode: 400,
      message: 'tmdb_id must be a valid number',
    });
  }

  const supabase = createServerSupabaseClient(config);
  const { isFollowing: following, error } = await isFollowing(
    userId,
    tmdbId,
    supabase
  );

  if (error) {
    throw createError({
      statusCode: 500,
      message: 'Error al verificar el seguimiento',
    });
  }

  return { isFollowing: following };
});
