// useSupabaseClient is auto-imported by Nuxt

export interface UserPreferences {
  favorite_genres?: number[];
  included_providers?: number[];
  region?: string; // ISO 3166-1 alpha-2 country code
  exploration_mode?: 'similar' | 'balanced' | 'surprise';
  prioritize_content?: 'new' | 'classics' | 'top_rated';
}

/**
 * Get user preferences
 */
export async function getUserPreferences(userId: string) {
  const supabase = useSupabaseClient();
  return await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
}

/**
 * Upsert user preferences
 */
export async function upsertUserPreferences(
  userId: string,
  preferences: UserPreferences
) {
  const supabase = useSupabaseClient();
  return await supabase
    .from('user_preferences')
    .upsert(
      {
        user_id: userId,
        ...preferences,
      },
      {
        onConflict: 'user_id',
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();
}

/**
 * Update user preferences (partial update)
 */
export async function updateUserPreferences(
  userId: string,
  preferences: Partial<UserPreferences>
) {
  const supabase = useSupabaseClient();

  // Get current preferences
  const { data: current, error: fetchError } = await getUserPreferences(userId);

  if (fetchError && fetchError.code !== 'PGRST116') {
    // PGRST116 is "not found" - we'll create it
    return { data: null, error: fetchError };
  }

  // Merge with existing or create new
  const mergedPreferences = current
    ? { ...current, ...preferences }
    : { user_id: userId, ...preferences };

  return await supabase
    .from('user_preferences')
    .upsert(mergedPreferences, {
      onConflict: 'user_id',
      ignoreDuplicates: false,
    })
    .select()
    .single();
}
