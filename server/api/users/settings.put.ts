import { updateSettings } from '@/composables/database/profiles';
import { getSession } from '@/composables/database/auth';
import type { UserSettings } from '@/composables/database/profiles';

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

    if (!body || typeof body !== 'object') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request body',
      });
    }

    // Validate settings structure
    const settings: Partial<UserSettings> = {};

    if (['light', 'dark', 'system'].includes(body.theme)) {
      settings.theme = body.theme;
    }

    // Note: language is NOT stored in database, only in cookies
    // Do not accept or save language in settings

    if (typeof body.region === 'string') {
      settings.region = body.region;
    }

    if (typeof body.autoplayTrailers === 'boolean') {
      settings.autoplayTrailers = body.autoplayTrailers;
    }

    if (typeof body.hideSpoilers === 'boolean') {
      settings.hideSpoilers = body.hideSpoilers;
    }

    const { data, error } = await updateSettings(userId, settings);

    if (error) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update settings',
      });
    }

    return {
      success: true,
      settings: data,
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

