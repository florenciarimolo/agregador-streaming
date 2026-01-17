import { TABLES } from '@/constants/db/tables';
import { PROFILES_COLUMNS } from '@/constants/db/columns';
import { getUserIdFromEvent } from '@/server/utils/user-auth';
import { createServerSupabaseClient } from '@/server/utils/supabase';

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();

    // Use centralized function to get userId
    const userId = await getUserIdFromEvent(event);

    if (!userId) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
      });
    }

    const body = await readBody(event);

    if (!body || (typeof body.display_name !== 'string' && typeof body.avatar_url !== 'string')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request body',
      });
    }

    const updateData: Record<string, unknown> = {};

    if (typeof body.display_name === 'string') {
      updateData[PROFILES_COLUMNS.DISPLAY_NAME] = body.display_name.trim() || null;
    }

    if (typeof body.avatar_url === 'string') {
      updateData[PROFILES_COLUMNS.AVATAR_URL] = body.avatar_url || null;
    }

    // Create Supabase client for server-side operations
    const supabase = createServerSupabaseClient(config);

    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .update(updateData)
      .eq(PROFILES_COLUMNS.ID, userId)
      .select()
      .single();

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update profile',
      });
    }

    return {
      success: true,
      profile: data,
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

