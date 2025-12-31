// useSupabaseClient is auto-imported by Nuxt
import { TABLES, PROFILES_FIELDS } from './constants';

export interface InsertProfileData {
  id: string;
  email: string | null;
  onboarding_completed?: boolean;
}

/**
 * Get profile by user ID
 */
export async function getProfile(userId: string) {
  const supabase = useSupabaseClient();
  return await supabase
    .from(TABLES.PROFILES)
    .select('*')
    .eq(PROFILES_FIELDS.ID, userId)
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
      [PROFILES_FIELDS.ID]: data.id,
      [PROFILES_FIELDS.EMAIL]: data.email,
      [PROFILES_FIELDS.ONBOARDING_COMPLETED]:
        data.onboarding_completed ?? false,
    })
    .select()
    .single();
}
