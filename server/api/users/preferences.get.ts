import { TABLES } from '@/constants/db/tables';
import { USER_PREFERENCES_COLUMNS } from '@/constants/db/columns';
import { getUserIdFromEvent } from '@/server/utils/user-auth';
import { createServerSupabaseClient } from '@/server/utils/supabase';
import { devLog, logError } from '@/server/utils/logger';

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();

    // Use the SAME function as getUserTMDBParams to get userId (ensures consistency)
    const userId = await getUserIdFromEvent(event);

    if (!userId) {
      logError(
        '[Preferences] No userId found - missing or invalid Bearer token',
        new Error('Unauthorized'),
        {
          hasAuthorization: !!event.node.req.headers.authorization,
        }
      );
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
      });
    }

    devLog('[preferences.get] User ID:', userId);

    // Create Supabase client for server-side operations
    // Use service role key to bypass RLS (we've already validated userId)
    const supabase = createServerSupabaseClient(config);

    const { data, error } = await supabase
      .from(TABLES.USER_PREFERENCES)
      .select('*')
      .eq(USER_PREFERENCES_COLUMNS.USER_ID, userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" - return empty preferences
      logError('[Preferences] Error fetching preferences', error, { userId });
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch preferences',
      });
    }

    // Log raw database response before any processing (development only)
    devLog('[preferences.get] Raw database query result:', {
      hasData: !!data,
      dataType: typeof data,
      dataIsNull: data === null,
      dataIsUndefined: data === undefined,
      regionRaw: data?.region,
      regionType: typeof data?.region,
      allKeys: data ? Object.keys(data) : [],
    });

    devLog('[preferences.get] Database response:', {
      hasData: !!data,
      userId,
      region: data?.region,
      regionType: typeof data?.region,
    });

    // Log the exact value being returned (development only)
    devLog('[preferences.get] Returning response:', {
      success: true,
      preferencesRegion: data?.region,
      preferencesRegionType: typeof data?.region,
    });

    return {
      success: true,
      preferences: data || null,
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
