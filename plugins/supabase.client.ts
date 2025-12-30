/**
 * Supabase client plugin
 * Initializes user store on app load
 * Must run early to ensure auth state is ready before components mount
 */
// Nuxt auto-imports: defineNuxtPlugin, useSupabaseClient, useUserStore
// Types are generated in .nuxt/types/imports.d.ts
import type { Session } from '@supabase/supabase-js';

export default defineNuxtPlugin(async () => {
  const supabase = useSupabaseClient();
  const userStore = useUserStore();
  let authInitialized = false;

  // Listen to auth state changes
  supabase.auth.onAuthStateChange(
    async (_event: string, session: Session | null) => {
      if (session?.user) {
        userStore.setUser(session.user);
        // Mark auth as initialized when we get a session
        if (!authInitialized) {
          userStore.setAuthInitialized(true);
          authInitialized = true;
        }
        // Fetch profile in background (don't block)
        userStore.fetchProfile().catch((error) => {
          console.error('[supabase.client.ts] Error fetching profile:', error);
        });
      } else {
        userStore.reset();
      }
    }
  );

  // Initialize user on app load
  try {
    const result = await supabase.auth.getSession();
    const session = result.data?.session || null;

    if (session?.user) {
      userStore.setUser(session.user);
    }

    // Mark auth as initialized after session check (even if no session)
    if (!authInitialized) {
      userStore.setAuthInitialized(true);
      authInitialized = true;
    }

    // Fetch profile in background if we have a user
    if (session?.user) {
      userStore.fetchProfile().catch((error) => {
        console.error('[supabase.client.ts] Error fetching profile:', error);
      });
    }
  } catch (error) {
    console.error('[supabase.client.ts] Error getting session:', error);
    // Mark as initialized even if there's an error, so components can proceed
    if (!authInitialized) {
      userStore.setAuthInitialized(true);
      authInitialized = true;
    }
  }
});
