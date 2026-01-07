import { createClient } from '@supabase/supabase-js';
import {
  updateLastShownAt,
} from '@/services/recommendationPool';
import { getUserIdFromEvent } from '@/server/utils/user-preferences';

/**
 * Track when recommendations are shown to a user
 * Updates last_shown_at timestamp for recency_weight calculation in runtime
 * Body: { tmdb_ids: number[] }
 * 
 * IMPORTANT: Does NOT modify score directly.
 * Penalization by exposure is calculated via recency_weight in runtime.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  // Use centralized function to get userId
  const userId = await getUserIdFromEvent(event);

  if (!userId) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    });
  }

  // Get request body
  const body = await readBody(event);
  const { tmdb_ids } = body;

  if (!Array.isArray(tmdb_ids) || tmdb_ids.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'tmdb_ids must be a non-empty array',
    });
  }

  // Create Supabase client
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || config.public.supabaseAnonKey;

  const supabase = createClient(config.public.supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  try {
    // Update last_shown_at timestamp
    // This is used for recency_weight calculation in runtime
    await updateLastShownAt(userId, tmdb_ids, supabase);

    return { success: true };
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Error al registrar visualización';
    throw createError({
      statusCode: 500,
      message: errorMessage,
    });
  }
});
