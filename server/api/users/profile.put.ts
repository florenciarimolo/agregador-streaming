import { updateProfile } from '@/composables/database/profiles';
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

    const body = await readBody(event);

    if (!body || (typeof body.display_name !== 'string' && typeof body.avatar_url !== 'string')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request body',
      });
    }

    const updateData: { display_name?: string; avatar_url?: string } = {};

    if (typeof body.display_name === 'string') {
      updateData.display_name = body.display_name.trim() || null;
    }

    if (typeof body.avatar_url === 'string') {
      updateData.avatar_url = body.avatar_url || null;
    }

    const { data, error } = await updateProfile(userId, updateData);

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
    if (error.statusCode) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

