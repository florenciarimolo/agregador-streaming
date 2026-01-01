import { serverSupabaseUser } from '#supabase/server';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/composables/database/auth';
import { TABLES, PROFILES_FIELDS } from '@/composables/database/constants';

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

    // Get multipart form data
    const formData = await readMultipartFormData(event);

    if (!formData || formData.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No file provided',
      });
    }

    const file = formData[0];

    if (!file.data || !file.filename) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid file',
      });
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type || '')) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid file type. Only JPEG, PNG, and WebP are allowed.',
      });
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.data.length > maxSize) {
      throw createError({
        statusCode: 400,
        statusMessage: 'File size exceeds 5MB limit.',
      });
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

    // Generate unique filename
    const fileExt = file.filename.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Convert Buffer to File-like object for Supabase Storage
    const buffer = Buffer.from(file.data);
    const uint8Array = new Uint8Array(buffer);
    const fileBlob = new Blob([uint8Array], {
      type: file.type || 'image/jpeg',
    });
    const fileObj = new File([fileBlob], file.filename, {
      type: file.type || 'image/jpeg',
    });

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, fileObj, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw createError({
        statusCode: 500,
        statusMessage: uploadError.message || 'Failed to upload avatar',
      });
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(filePath);

    // Update profile with avatar URL
    const { data: profileData, error: profileError } = await supabase
      .from(TABLES.PROFILES)
      .update({
        [PROFILES_FIELDS.AVATAR_URL]: publicUrl,
      })
      .eq(PROFILES_FIELDS.ID, userId)
      .select()
      .single();

    if (profileError) {
      // Try to clean up uploaded file
      await supabase.storage.from('avatars').remove([filePath]);
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update profile',
      });
    }

    return {
      success: true,
      avatar_url: publicUrl,
      profile: profileData,
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
