/**
 * POST /api/discover/list/[slug]/seed
 * Authenticated endpoint to insert discover list items into user's recommendation pool
 * CRITICAL: Never modifies Discover lists or their content, only affects recommendation_pool
 */

import { getRouterParams } from 'h3';
import { serverSupabaseUser } from '#supabase/server';
import {
  getDiscoverListBySlug,
  insertDiscoverListIntoPool,
} from '@/composables/database/discoverLists';
import { createServerSupabaseClient } from '@/server/utils/supabase';

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const user = await serverSupabaseUser(event);

    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized',
      });
    }

    const userId = user.id || (user as { sub?: string }).sub;
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

    // Create Supabase client for server-side operations
    const supabase = createServerSupabaseClient(config);

    // Validate that list exists and is public
    const { data: list, error: listError } = await getDiscoverListBySlug(
      slug,
      'es-ES' // Language doesn't matter for validation
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
      throw createError({
        statusCode: 500,
        statusMessage: 'Error inserting list into recommendation pool',
        data: insertError,
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
    throw createError({
      statusCode: 500,
      statusMessage: 'Error seeding discover list',
      data: error,
    });
  }
});
