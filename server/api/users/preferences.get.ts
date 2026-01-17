import { TABLES } from '@/constants/db/tables';
import { USER_PREFERENCES_COLUMNS } from '@/constants/db/columns';
import { getUserIdFromEvent } from '@/server/utils/user-auth';
import { createServerSupabaseClient } from '@/server/utils/supabase';

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();

    // Use the SAME function as getUserTMDBParams to get userId (ensures consistency)
    const userId = await getUserIdFromEvent(event);

    if (!userId) {
      if (import.meta.dev) {
        console.error(
          '[preferences.get] No userId found - missing or invalid Bearer token'
        );
        console.error('[preferences.get] Request headers:', {
          authorization: event.node.req.headers.authorization
            ? 'present'
            : 'missing',
        });
      }
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
      });
    }

    if (import.meta.dev) {
      console.log('[preferences.get] User ID:', userId);
    }

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
      if (import.meta.dev) {
        console.error('[preferences.get] Error fetching preferences:', error);
      }
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to fetch preferences',
      });
    }

    // Log raw database response before any processing
    if (import.meta.dev) {
      console.warn('[preferences.get] Raw database query result:', {
        hasData: !!data,
        dataType: typeof data,
        dataIsNull: data === null,
        dataIsUndefined: data === undefined,
        rawData: data,
        regionRaw: data?.region,
        regionType: typeof data?.region,
        regionValue: data?.region,
        regionIsNull: data?.region === null,
        regionIsUndefined: data?.region === undefined,
        regionIsEmptyString: data?.region === '',
        allKeys: data ? Object.keys(data) : [],
      });
    }

    if (import.meta.dev) {
      const dataStr = data ? JSON.stringify(data, null, 2) : 'null';
      console.warn('[preferences.get] Database response:', {
        hasData: !!data,
        userId,
        region: data?.region,
        regionType: typeof data?.region,
        regionLength: data?.region?.length,
        regionIsNull: data?.region === null,
        regionIsUndefined: data?.region === undefined,
        regionIsEmptyString: data?.region === '',
        fullData: dataStr,
      });
    }

    // Log the exact value being returned
    if (import.meta.dev) {
      console.warn('[preferences.get] Returning response:', {
        success: true,
        preferences: data || null,
        preferencesRegion: data?.region,
        preferencesRegionType: typeof data?.region,
      });
    }

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
