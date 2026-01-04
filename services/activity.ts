// useSupabaseClient is auto-imported by Nuxt

/**
 * Service: User activity logging operations
 * Infrastructure layer - pure CRUD operations, no UI state
 */

export interface ActivityMetadata {
  [key: string]: unknown;
}

/**
 * Log user activity
 */
export async function logActivity(
  userId: string,
  action: string,
  metadata?: ActivityMetadata,
  ipAddress?: string,
  userAgent?: string
) {
  const supabase = useSupabaseClient();
  return await supabase.from('user_activity').insert({
    user_id: userId,
    action,
    metadata: metadata || {},
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
  });
}

/**
 * Get user activity
 */
export async function getUserActivity(
  userId: string,
  limit: number = 50,
  offset: number = 0
) {
  const supabase = useSupabaseClient();
  return await supabase
    .from('user_activity')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
}

