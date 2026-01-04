// useSupabaseClient is auto-imported by Nuxt
/**
 * Log user activity
 */
export async function logActivity(userId, action, metadata, ipAddress, userAgent) {
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
export async function getUserActivity(userId, limit = 50, offset = 0) {
    const supabase = useSupabaseClient();
    return await supabase
        .from('user_activity')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
}
