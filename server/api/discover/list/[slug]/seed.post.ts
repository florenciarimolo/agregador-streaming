/**
 * POST /api/discover/list/[slug]/seed
 * Authenticated endpoint to insert discover list items into user's recommendation pool
 * CRITICAL: Never modifies Discover lists or their content, only affects recommendation_pool
 */

import { getRouterParams } from 'h3';
import { serverSupabaseClient } from '#supabase/server';
import { getUserIdFromEvent } from '@/server/utils/user-auth';
import {
  getDiscoverListBySlug,
  insertDiscoverListIntoPool,
} from '@/composables/database/discoverLists';

export default defineEventHandler(async (event) => {
  try {
    // Use centralized function to get userId
    const userId = await getUserIdFromEvent(event);

    if (!userId) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
      });
    }

    const { slug } = getRouterParams(event) as { slug: string };

    if (!slug) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Slug is required',
      });
    }

    // Create Supabase client that respects user authentication from cookies
    // This works in local development without service role key
    // In production, service role key can still be used via env var
    const supabase = await serverSupabaseClient(event);

    // Validate that list exists and is public
    const { data: list, error: listError } = await getDiscoverListBySlug(
      slug,
      'es-ES', // Language doesn't matter for validation
      supabase // Pass supabase client for server-side use
    );

    if (listError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Error validating discover list',
        data: listError,
      });
    }

    if (!list) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Discover list not found',
      });
    }

    if (!list.is_public) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Discover list is not public',
      });
    }

    // Insert list items into recommendation pool
    // source = 'discover', explanation_code = 'DISCOVER_LIST'
    // Idempotent: ON CONFLICT DO NOTHING
    // Respects exclusions (seen, not_interested)
    const { inserted, error: insertError } = await insertDiscoverListIntoPool(
      userId,
      list.id,
      supabase
    );

    if (insertError) {
      console.error(
        '[Discover List Seed] Error inserting into pool:',
        insertError
      );
      // Include error details in the response for debugging
      const errorMessage =
        insertError instanceof Error
          ? insertError.message
          : String(insertError);
      const errorCode =
        insertError && typeof insertError === 'object' && 'code' in insertError
          ? (insertError as { code?: string }).code
          : undefined;

      throw createError({
        statusCode: 500,
        statusMessage: 'Error inserting list into recommendation pool',
        message: errorMessage,
        data: {
          error: insertError,
          code: errorCode,
        },
      });
    }

    return {
      success: true,
      inserted,
      message: `Successfully inserted ${inserted} titles into your recommendation pool`,
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    console.error('[Discover List Seed] Unexpected error:', error);
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    throw createError({
      statusCode: 500,
      statusMessage: 'Error seeding discover list',
      message: errorMessage,
      data: {
        error,
        stack: errorStack,
      },
    });
  }
});
