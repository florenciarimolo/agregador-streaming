/**
 * Supabase client plugin
 * Initializes user store on app load
 */
// Nuxt auto-imports: defineNuxtPlugin, useSupabaseClient, useUserStore
// Types are generated in .nuxt/types/imports.d.ts
import type { Session } from '@supabase/supabase-js';

export default defineNuxtPlugin(async () => {
  const supabase = useSupabaseClient();
  const userStore = useUserStore();

  // Listen to auth state changes
  supabase.auth.onAuthStateChange(
    async (_event: string, session: Session | null) => {
      if (session?.user) {
        userStore.setUser(session.user);
        await userStore.fetchProfile();
      } else {
        userStore.reset();
      }
    }
  );

  // Initialize user on app load
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user) {
    userStore.setUser(session.user);
    await userStore.fetchProfile();
  }

  // Mark auth as initialized AFTER session check completes
  // This ensures components know when auth state is ready
  userStore.setAuthInitialized(true);
});
