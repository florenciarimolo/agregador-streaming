// useSupabaseClient is auto-imported by Nuxt

/**
 * Get the current session
 */
export async function getSession() {
  const supabase = useSupabaseClient();
  return await supabase.auth.getSession();
}

/**
 * Set the session with access and refresh tokens
 */
export async function setSession(accessToken: string, refreshToken: string) {
  const supabase = useSupabaseClient();
  return await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
}

/**
 * Exchange code for session
 */
export async function exchangeCodeForSession(code: string) {
  const supabase = useSupabaseClient();
  return await supabase.auth.exchangeCodeForSession(code);
}

/**
 * Update user password
 */
export async function updateUserPassword(password: string) {
  const supabase = useSupabaseClient();
  return await supabase.auth.updateUser({
    password,
  });
}
