/**
 * Supabase client plugin
 * Initializes user store on app load
 */
export default defineNuxtPlugin(async () => {
  const supabase = useSupabaseClient();
  const userStore = useUserStore();

  // Listen to auth state changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      userStore.setUser(session.user);
      await userStore.fetchProfile();
    } else {
      userStore.reset();
    }
  });

  // Initialize user on app load
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    userStore.setUser(session.user);
    await userStore.fetchProfile();
  }
});
