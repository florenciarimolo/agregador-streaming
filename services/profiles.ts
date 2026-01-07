// useSupabaseClient is auto-imported by Nuxt
import { TABLES } from '@/constants/db/tables';
import { PROFILES_COLUMNS } from '@/constants/db/columns';

/**
 * Service: User profile operations
 * Infrastructure layer - pure CRUD operations, no UI state
 */

export interface InsertProfileData {
  id: string;
  email: string | null;
  onboarding_completed?: boolean;
}

export interface UpdateProfileData {
  display_name?: string;
  avatar_url?: string;
}

/**
 * Get profile by user ID
 */
export async function getProfile(userId: string) {
  const supabase = useSupabaseClient();
  return await supabase
    .from(TABLES.PROFILES)
    .select('*')
    .eq(PROFILES_COLUMNS.ID, userId)
    .single();
}

/**
 * Insert a new profile
 */
export async function insertProfile(data: InsertProfileData) {
  const supabase = useSupabaseClient();
  return await supabase
    .from(TABLES.PROFILES)
    .insert({
      [PROFILES_COLUMNS.ID]: data.id,
      [PROFILES_COLUMNS.EMAIL]: data.email,
      [PROFILES_COLUMNS.ONBOARDING_COMPLETED]:
        data.onboarding_completed ?? false,
    })
    .select()
    .single();
}

/**
 * Update profile
 */
export async function updateProfile(userId: string, data: UpdateProfileData) {
  const supabase = useSupabaseClient();
  const updateData: Record<string, unknown> = {};

  if (data.display_name !== undefined) {
    updateData[PROFILES_COLUMNS.DISPLAY_NAME] = data.display_name;
  }
  if (data.avatar_url !== undefined) {
    updateData[PROFILES_COLUMNS.AVATAR_URL] = data.avatar_url;
  }

  return await supabase
    .from(TABLES.PROFILES)
    .update(updateData)
    .eq(PROFILES_COLUMNS.ID, userId)
    .select()
    .single();
}

/**
 * Upload avatar to Supabase Storage
 */
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<{
  data: { path: string; url: string } | null;
  error: Error | null;
}> {
  const supabase = useSupabaseClient();

  // Validate file type
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return {
      data: null,
      error: new Error(
        'Invalid file type. Only JPEG, PNG, and WebP are allowed.'
      ),
    };
  }

  // Validate file size (5MB max)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      data: null,
      error: new Error('File size exceeds 5MB limit.'),
    };
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  // Upload file
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    return { data: null, error: uploadError };
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from('avatars').getPublicUrl(filePath);

  return {
    data: {
      path: filePath,
      url: publicUrl,
    },
    error: null,
  };
}

/**
 * Delete avatar from Supabase Storage
 */
export async function deleteAvatar(avatarPath: string) {
  const supabase = useSupabaseClient();

  // Extract path from full URL or use as-is
  const path = avatarPath.includes('/storage/v1/object/public/avatars/')
    ? avatarPath.split('/storage/v1/object/public/avatars/')[1]
    : avatarPath.replace('avatars/', '');

  return await supabase.storage.from('avatars').remove([path]);
}


