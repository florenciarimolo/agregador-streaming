import { uploadAvatar, updateProfile } from '@/composables/database/profiles';
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

    const userId = session.user.id || (session.user as { sub?: string }).sub;

    if (!userId) {
      throw createError({
        statusCode: 401,
        statusMessage: 'User ID not found',
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

    // Convert to File object
    // Convert Buffer to Uint8Array for Blob compatibility
    const buffer = Buffer.from(file.data);
    const uint8Array = new Uint8Array(buffer);
    const fileBlob = new Blob([uint8Array], {
      type: file.type || 'image/jpeg',
    });
    const fileObj = new File([fileBlob], file.filename, {
      type: file.type || 'image/jpeg',
    });

    // Upload avatar
    const { data: uploadResult, error: uploadError } = await uploadAvatar(
      userId,
      fileObj
    );

    if (uploadError || !uploadResult) {
      throw createError({
        statusCode: 500,
        statusMessage: uploadError?.message || 'Failed to upload avatar',
      });
    }

    // Update profile with avatar URL
    const { data: profileData, error: profileError } = await updateProfile(
      userId,
      {
        avatar_url: uploadResult.url,
      }
    );

    if (profileError) {
      // Try to clean up uploaded file
      // Note: In production, you might want to implement cleanup logic
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to update profile',
      });
    }

    return {
      success: true,
      avatar_url: uploadResult.url,
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
