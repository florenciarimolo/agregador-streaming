import { serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/services/auth';
import { TABLES } from '@/services/constants';

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    let userId: string | null = null;

    // Try to get user from cookies first
    const userFromCookies = await serverSupabaseUser(event);

    if (userFromCookies) {
      userId =
        userFromCookies.id || (userFromCookies as { sub?: string }).sub || null;
    } else {
      // Try Authorization header
      const {
        data: { session },
      } = await getSession();

      if (session?.access_token) {
        userId =
          session.user.id || (session.user as { sub?: string }).sub || null;
      }
    }

    if (!userId) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
      });
    }

    // Create Supabase client with service role key for admin operations
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || config.public.supabaseAnonKey;

    const supabase = createClient(config.public.supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    // Delete user from auth.users
    // This will cascade delete all related data due to ON DELETE CASCADE constraints
    // - profiles (ON DELETE CASCADE from auth.users)
    // - user_title_status (ON DELETE CASCADE from profiles)
    // - recommendation_pool (ON DELETE CASCADE from profiles)
    // - user_preferences (ON DELETE CASCADE from profiles)
    // - user_activity (ON DELETE CASCADE from profiles)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[DeleteAccount] Error deleting user:', deleteError);
      }
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to delete account',
      });
    }

    return {
      success: true,
      message: 'Account deleted successfully',
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('[DeleteAccount] Error:', error);
    }
    throw createError({
      statusCode: 500,
      statusMessage:
        error instanceof Error ? error.message : 'Unknown error occurred',
    });
  }
});

