import { createClient } from '@supabase/supabase-js';
import { TABLES } from '@/constants/db/tables';
import { getUserIdFromEvent } from '@/server/utils/user-auth';

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
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || config.public.supabaseAnonKey;

    const supabase = createClient(config.public.supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

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

